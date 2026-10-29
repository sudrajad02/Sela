import "./styles.css";
import { invoke } from "@tauri-apps/api/core";
const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Elemen #app tidak ditemukan");
}

app.innerHTML = `<main class="island">
    <button
      class="island-toggle"
      aria-expanded="false"
      aria-controls="panel"
    >
      <span class="notch-icon" aria-hidden="true">
        <svg class="ring-svg" viewBox="0 0 24 24">
          <circle class="ring-track" cx="12" cy="12" r="9" />
          <circle class="ring-progress" id="ring-progress" cx="12" cy="12" r="9" />
        </svg>
        <svg class="droplet-svg" viewBox="0 0 24 24">
          <path d="M12 4.5C12 4.5 7.2 10.1 7.2 13.8C7.2 16.45 9.35 18.6 12 18.6C14.65 18.6 16.8 16.45 16.8 13.8C16.8 10.1 12 4.5 12 4.5Z" />
        </svg>
      </span>
      <span id="island-label" class="sr-only">Sela</span>
      <time id="clock"></time>
    </button>

    <section id="panel" aria-hidden="true">
      <div class="panel-inner">
        <p class="label">RUANG FOKUSMU</p>
      </div>
    </section>
  </main>
  `;

const island = document.querySelector<HTMLElement>(".island");
const toggle = document.querySelector<HTMLButtonElement>(".island-toggle");
const panel = document.querySelector<HTMLElement>(".panel-inner");
const clock = document.querySelector<HTMLTimeElement>("#clock");
const islandLabel = document.querySelector<HTMLElement>("#island-label");
const ringProgress = document.querySelector<SVGCircleElement>("#ring-progress");

if (!island || !toggle || !panel || !clock || !islandLabel) {
  throw new Error("Elemen widget belum lengkap");
}

// Simpan referensi setelah pemeriksaan agar aman dipakai di callback.
const islandElement = island;
const toggleElement = toggle;
const panelElement = panel;
const clockElement = clock;

panelElement.insertAdjacentHTML(
  "beforeend",
  `
    <section class="quick-note">
      <label class="label" for="note-input">CATATAN KECIL</label>

      <textarea
        id="note-input"
        rows="3"
        maxlength="500"
        placeholder="Apa yang ingin kamu kerjakan?"
        spellcheck="false"
      ></textarea>

      <small id="note-status" role="status">Disimpan di perangkat ini</small>
    </section>
  `,
);

const noteInput = document.querySelector<HTMLTextAreaElement>("#note-input");

const noteStatus = document.querySelector<HTMLElement>("#note-status");

if (noteInput && noteStatus) {
  noteInput.value = localStorage.getItem("sela-note") ?? "";

  noteInput.addEventListener("input", () => {
    try {
      localStorage.setItem("sela-note", noteInput.value);
      noteStatus.textContent = "Tersimpan";
    } catch {
      noteStatus.textContent = "Gagal menyimpan catatan";
    }
  });
}

let isResizing = false;
let pendingSize: { width: number; height: number } | null = null;

async function flushResize(): Promise<void> {
  if (isResizing || !pendingSize) {
    return;
  }
  isResizing = true;
  while (pendingSize) {
    const { width, height } = pendingSize;
    pendingSize = null;
    try {
      await invoke<void>("resize_widget", { width, height });
    } catch (error: unknown) {
      console.error("Gagal menyesuaikan jendela:", error);
    }
  }
  isResizing = false;
}

const CLOSED_WIDTH = 176;
const OPEN_WIDTH = 360;
const RING_CIRCUMFERENCE = 2 * Math.PI * 9;

function requestWindowResize(width: number, height: number): void {
  pendingSize = { width, height };
  void flushResize();
}

function formatClockNow(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

const panelWrapper = document.querySelector<HTMLElement>("#panel");

function setPanelOpen(isOpen: boolean): void {
  toggleElement.setAttribute("aria-expanded", String(isOpen));
  panelWrapper?.setAttribute("aria-hidden", String(!isOpen));

  if (isOpen) {
    const openHeight =
      toggleElement.offsetHeight + panelElement.scrollHeight + 34;
    requestWindowResize(OPEN_WIDTH, openHeight);
    islandElement.classList.add("is-open");
  } else {
    islandElement.classList.remove("is-open");
    requestWindowResize(CLOSED_WIDTH, toggleElement.offsetHeight + 2);
  }
}

requestWindowResize(CLOSED_WIDTH, toggleElement.offsetHeight + 2);

toggleElement.addEventListener("click", () => {
  const isOpen = toggleElement.getAttribute("aria-expanded") === "true";

  setPanelOpen(!isOpen);
});

document.addEventListener("keydown", (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    setPanelOpen(false);
    toggleElement.focus();
  }
});

window.addEventListener("blur", () => {
  setPanelOpen(false);
});
document.addEventListener("pointerdown", (event: PointerEvent) => {
  if (event.target instanceof Node && !islandElement.contains(event.target)) {
    setPanelOpen(false);
  }
});

panelElement.insertAdjacentHTML(
  "beforeend",
  `
    <section class="focus-widget">
      <p class="label">WAKTU FOKUS</p>
      <div class="focus-presets" role="group" aria-label="Durasi fokus">
        <button type="button" class="duration-option"
          data-minutes="15" aria-pressed="false">15 menit</button>

        <button type="button" class="duration-option"
          data-minutes="25" aria-pressed="true">25 menit</button>

        <button type="button" class="duration-option"
          data-minutes="50" aria-pressed="false">50 menit</button>
      </div>
      <output id="focus-time">25:00</output>

      <div class="focus-actions">
        <button id="focus-toggle">Mulai</button>
        <button id="focus-reset">Reset</button>
      </div>
    </section>
  `,
);

const timerDisplay = document.querySelector<HTMLOutputElement>("#focus-time");

const timerToggle = document.querySelector<HTMLButtonElement>("#focus-toggle");

const timerReset = document.querySelector<HTMLButtonElement>("#focus-reset");

if (!timerDisplay || !timerToggle || !timerReset) {
  throw new Error("Elemen timer tidak ditemukan");
}

const savedMinutes = Number(localStorage.getItem("sela-focus-minutes"));

let duration = [15, 25, 50].includes(savedMinutes)
  ? savedMinutes * 60
  : 25 * 60;

const savedEndsAt = Number(localStorage.getItem("sela-focus-ends-at"));
const savedRemaining = Number(localStorage.getItem("sela-focus-remaining"));

let endsAt: number | null =
  Number.isFinite(savedEndsAt) && savedEndsAt > 0 ? savedEndsAt : null;

let remaining =
  endsAt !== null
    ? Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
    : Number.isFinite(savedRemaining) &&
        savedRemaining > 0 &&
        savedRemaining <= duration
      ? savedRemaining
      : duration;

function updateClock(): void {
  if (endsAt === null && remaining === duration) {
    clockElement.textContent = formatClockNow();
  }
}

updateClock();
setInterval(updateClock, 1000);

function saveTimerState(): void {
  if (endsAt !== null) {
    localStorage.setItem("sela-focus-ends-at", String(endsAt));
  } else {
    localStorage.removeItem("sela-focus-ends-at");
  }
  localStorage.setItem("sela-focus-remaining", String(remaining));
}

function playFinishSound(): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // Nada D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // Nada A5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // Abaikan jika audio diblokir sistem
  }
}

function renderTimer(): void {
  if (endsAt !== null) {
    remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));

    if (remaining === 0) {
      endsAt = null;
      saveTimerState();
      playFinishSound();
    }
  }

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  const timeText =
    `${String(minutes).padStart(2, "0")}:` + String(seconds).padStart(2, "0");

  timerDisplay!.textContent = timeText;

  timerToggle!.textContent =
    endsAt !== null ? "Jeda" : remaining === 0 ? "Ulangi" : "Mulai";

  const progressRatio = duration > 0 ? remaining / duration : 1;
  if (ringProgress) {
    const offset =
      endsAt !== null || remaining < duration
        ? RING_CIRCUMFERENCE * (1 - progressRatio)
        : 0;
    ringProgress.style.strokeDasharray = `${RING_CIRCUMFERENCE}`;
    ringProgress.style.strokeDashoffset = `${offset}`;
  }

  if (remaining === 0) {
    islandLabel!.textContent = "Fokus selesai ✓";
    clockElement.textContent = "00:00";
  } else if (endsAt !== null) {
    islandLabel!.textContent = `Fokus ${timeText}`;
    clockElement.textContent = timeText;
  } else if (remaining < duration) {
    islandLabel!.textContent = `Jeda ${timeText}`;
    clockElement.textContent = timeText;
  } else {
    islandLabel!.textContent = "Sela";
    clockElement.textContent = formatClockNow();
  }
}

timerToggle.addEventListener("click", () => {
  renderTimer();

  if (endsAt !== null) {
    endsAt = null;
  } else {
    if (remaining === 0) {
      remaining = duration;
    }

    endsAt = Date.now() + remaining * 1000;
  }

  saveTimerState();
  renderTimer();
});

timerReset.addEventListener("click", () => {
  endsAt = null;
  remaining = duration;
  saveTimerState();
  renderTimer();
});

const durationButtons =
  document.querySelectorAll<HTMLButtonElement>(".duration-option");

durationButtons.forEach((button) => {
  button.setAttribute(
    "aria-pressed",
    String(Number(button.dataset.minutes) * 60 === duration),
  );

  button.addEventListener("click", () => {
    const minutes = Number(button.dataset.minutes);

    if (!Number.isFinite(minutes) || minutes <= 0) {
      return;
    }

    duration = minutes * 60;
    remaining = duration;
    endsAt = null;

    localStorage.setItem("sela-focus-minutes", String(minutes));

    durationButtons.forEach((option) => {
      option.setAttribute("aria-pressed", String(option === button));
    });

    saveTimerState();
    renderTimer();
  });
});

setInterval(renderTimer, 250);
renderTimer();
