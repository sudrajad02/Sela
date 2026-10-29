use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use tauri::Manager;

struct HitBox {
    /// Dikodekan sebagai: (width_bits << 32) | height_bits
    packed_size: AtomicU64,
}

impl HitBox {
    fn new(width: u32, height: u32) -> Self {
        Self {
            packed_size: AtomicU64::new(((width as u64) << 32) | (height as u64)),
        }
    }

    fn set(&self, width: u32, height: u32) {
        self.packed_size
            .store(((width as u64) << 32) | (height as u64), Ordering::Relaxed);
    }

    fn get(&self) -> (u32, u32) {
        let val = self.packed_size.load(Ordering::Relaxed);
        ((val >> 32) as u32, (val & 0xFFFF_FFFF) as u32)
    }
}

#[tauri::command]
async fn resize_widget(
    window: tauri::WebviewWindow,
    hitbox: tauri::State<'_, Arc<HitBox>>,
    width: f64,
    height: f64,
) -> Result<(), String> {
    let active_width = width.clamp(140.0, 640.0);
    let active_height = height.clamp(32.0, 640.0);

    // Simpan ukuran area kapsul aktif (dalam logical pixel) untuk pengecekan click-through
    hitbox.set(active_width.round() as u32, active_height.round() as u32);

    // Kanvas jendela native dijaga tetap 412x580 di tengah-atas layar agar WebView2 tidak pernah flicker saat animasi!
    const CANVAS_WIDTH: f64 = 412.0;
    const CANVAS_HEIGHT: f64 = 580.0;

    if !window.is_visible().unwrap_or(true) {
        let monitor = window
            .current_monitor()
            .map_err(|error| error.to_string())?
            .ok_or("Monitor tidak ditemukan")?;

        let screen_position = monitor.position();
        let screen_size = monitor.size();
        let scale = monitor.scale_factor();

        let physical_width = (CANVAS_WIDTH * scale).round() as i32;
        let x = screen_position.x + (screen_size.width as i32 - physical_width) / 2;
        let y = screen_position.y;

        window
            .set_size(tauri::LogicalSize::new(CANVAS_WIDTH, CANVAS_HEIGHT))
            .map_err(|error| error.to_string())?;

        window
            .set_position(tauri::PhysicalPosition::new(x, y))
            .map_err(|error| error.to_string())?;

        window.show().map_err(|error| error.to_string())?;
    }

    Ok(())
}

#[cfg(target_os = "windows")]
fn start_cursor_passthrough_loop(window: tauri::WebviewWindow, hitbox: Arc<HitBox>) {
    std::thread::spawn(move || {
        #[repr(C)]
        struct Point {
            x: i32,
            y: i32,
        }
        unsafe extern "system" {
            fn GetCursorPos(lpPoint: *mut Point) -> i32;
        }

        let mut is_ignoring = false;

        loop {
            std::thread::sleep(std::time::Duration::from_millis(16));

            let mut pt = Point { x: 0, y: 0 };
            if unsafe { GetCursorPos(&mut pt) } == 0 {
                continue;
            }

            let Ok(win_pos) = window.outer_position() else {
                continue;
            };
            let Ok(win_size) = window.outer_size() else {
                continue;
            };
            let scale = window.scale_factor().unwrap_or(1.0);

            let (logical_w, logical_h) = hitbox.get();
            let active_w = (logical_w as f64 * scale).round() as i32;
            let active_h = (logical_h as f64 * scale).round() as i32;

            // Kapsul berada tepat di tengah-atas kanvas jendela
            let island_left = win_pos.x + (win_size.width as i32 - active_w) / 2;
            let island_right = island_left + active_w;
            let island_top = win_pos.y;
            let island_bottom = island_top + active_h;

            let inside_island = pt.x >= island_left
                && pt.x <= island_right
                && pt.y >= island_top
                && pt.y <= island_bottom;

            let should_ignore = !inside_island;

            if should_ignore != is_ignoring {
                if window.set_ignore_cursor_events(should_ignore).is_ok() {
                    is_ignoring = should_ignore;
                }
            }
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let hitbox = Arc::new(HitBox::new(176, 42));
    let hitbox_for_setup = Arc::clone(&hitbox);

    tauri::Builder::default()
        .manage(hitbox)
        .setup(move |app| {
            #[cfg(target_os = "windows")]
            if let Some(window) = app.get_webview_window("main") {
                start_cursor_passthrough_loop(window, Arc::clone(&hitbox_for_setup));
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![resize_widget])
        .run(tauri::generate_context!())
        .expect("Gagal menjalankan aplikasi Sela");
}
