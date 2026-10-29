# Sela Bar

**Sela Bar** adalah aplikasi widget desktop bergaya *Dynamic Island* untuk Windows yang dibangun menggunakan **Tauri v2**, **TypeScript**, dan **Vite**. Widget ini mengambang di bagian tengah-atas layar sebagai ruang fokus minimalis yang memuat jam *real-time*, catatan cepat, dan pengatur waktu fokus (Pomodoro).

---

## Fitur Utama

- **Dynamic Island UI**: Kapsul interaktif di tengah-atas layar dengan animasi buka/tutup yang halus (`cubic-bezier`) dan selalu tampil di atas aplikasi lain (*Always on Top*).
- **OS-Level Click-Through**: Area transparan di luar kapsul secara otomatis meneruskan klik mouse ke aplikasi di belakangnya menggunakan pelacakan kursor native (`HitBox` + Win32 `GetCursorPos`), sehingga bebas *flicker* dan tidak menghalangi aktivitas kerja.
- **Jam & Indikator Status**: Menampilkan waktu saat ini (format `id-ID`) dan status sesi fokus langsung pada bar utama (`Sela`, `Fokus MM:SS`, `Jeda MM:SS`, atau `Fokus selesai ✓`).
- **Waktu Fokus (Pomodoro Timer)**:
  - Pilihan durasi cepat: **15 menit**, **25 menit**, dan **50 menit**.
  - Progres waktu fokus otomatis tersimpan di `localStorage` (tetap berlanjut meskipun aplikasi dimuat ulang).
  - Notifikasi suara *chime* lembut menggunakan **Web Audio API** saat waktu fokus selesai.
- **Catatan Kecil (Quick Note)**: Area catatan instan (hingga 500 karakter) yang otomatis tersimpan secara lokal di perangkat.
- **Auto-Close Pintar**: Panel otomatis menutup saat pengguna menekan tombol `Escape` atau berpindah fokus ke jendela aplikasi lain (*window blur*).

---

## Teknologi yang Digunakan

- **Frontend**: Vanilla TypeScript, HTML5, CSS3 (Grid & Custom Transitions)
- **Bundler**: [Vite](https://vite.dev/)
- **Backend / Desktop Runtime**: [Tauri v2](https://v2.tauri.app/) (Rust)

---

## Struktur Proyek

```text
sela-bar/
├── index.html               # Titik masuk HTML utama
├── package.json             # Konfigurasi dependensi & skrip npm
├── tsconfig.json            # Konfigurasi TypeScript
├── vite.config.ts           # Konfigurasi dev server & bundler Vite
├── src/
│   ├── main.ts              # Logika UI, timer fokus, catatan, dan IPC Tauri
│   ├── styles.css           # Styling kapsul Dynamic Island & animasi transisi
│   └── vite-env.d.ts        # Deklarasi tipe Vite
└── src-tauri/
    ├── Cargo.toml           # Dependensi crate Rust
    ├── tauri.conf.json      # Konfigurasi jendela transparan & bundle aplikasi
    └── src/
        ├── main.rs          # Entry point binary Rust
        └── lib.rs           # Command resize_widget & pendeteksi click-through native
```

---

## Prasyarat Instalasi

Pastikan perangkat kamu sudah terpasang:
1. **[Node.js](https://nodejs.org/)** (disarankan versi LTS terbaru)
2. **[Rust & Cargo](https://rustup.rs/)** (pastikan `%USERPROFILE%\.cargo\bin` sudah terdaftar di `PATH` sistem)
3. **Microsoft Visual Studio C++ Build Tools** & **WebView2** (bawaan pada Windows 10/11)

---

## Cara Menjalankan Proyek

1. **Instal dependensi frontend:**
   ```bash
   npm install
   ```

2. **Jalankan dalam mode pengembangan (*Development*):**
   ```bash
   npm run tauri dev
   ```
   > **Catatan (Windows PowerShell):** Jika muncul pesan error `cargo: program not found`, pastikan `.cargo\bin` sudah masuk ke `PATH` terminal kamu:
   > ```powershell
   > $env:PATH += ";$env:USERPROFILE\.cargo\bin"
   > npm run tauri dev
   > ```

3. **Build aplikasi untuk produksi (*Installer / Executable*):**
   ```bash
   npm run tauri build
   ```
   Hasil build installer akan tersedia di dalam folder `src-tauri/target/release/bundle/`.

---

## Cara Penggunaan

1. **Membuka / Menutup Panel**: Klik pada kapsul **Sela** di bagian tengah-atas layar untuk membuka panel. Tekan `Escape` atau klik di luar aplikasi untuk menutupnya.
2. **Menulis Catatan**: Ketik rencana kerja atau catatan singkat pada kolom **Catatan Kecil**. Catatan langsung tersimpan otomatis.
3. **Memulai Waktu Fokus**:
   - Pilih durasi fokus (**15 menit**, **25 menit**, atau **50 menit**).
   - Klik **Mulai** untuk menjalankan hitung mundur.
   - Tutup panel jika ingin bekerja; sisa waktu akan tetap tampil secara *real-time* di kapsul atas.
   - Saat waktu habis, terdengar bunyi *chime* lembut dan status berubah menjadi `Fokus selesai ✓`.
