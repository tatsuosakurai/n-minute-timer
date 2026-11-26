const BAR_COLORS = [
  { remainingRatio: 1.0, color: "#2c7da0" },
  { remainingRatio: 0.4, color: "#7446a8" },
  { remainingRatio: 0.0, color: "#c0301f" },
];

const scene = document.querySelector("#scene");
const display = document.querySelector("#display");
const minutesInput = document.querySelector("#minutes-input");
const startButton = document.querySelector("#start-button");
const resetButton = document.querySelector("#reset-button");

let duration = 0;
let remaining = 0;
let isRunning = false;
let endTime = null;
let animationId = null;
let hasNotifiedDone = false;

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

function rgbString([red, green, blue]) {
  return `rgb(${red | 0},${green | 0},${blue | 0})`;
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function lerpRgb(start, end, amount) {
  const startRgb = hexToRgb(start);
  const endRgb = hexToRgb(end);

  return [
    lerp(startRgb[0], endRgb[0], amount),
    lerp(startRgb[1], endRgb[1], amount),
    lerp(startRgb[2], endRgb[2], amount),
  ];
}

function barColorAt(remainingRatio) {
  const endIndex = Math.max(1, BAR_COLORS.findIndex((key) => remainingRatio >= key.remainingRatio));
  const start = BAR_COLORS[endIndex - 1];
  const end = BAR_COLORS[endIndex];
  const amount = (start.remainingRatio - remainingRatio) / (start.remainingRatio - end.remainingRatio);

  return rgbString(lerpRgb(start.color, end.color, amount));
}

function normalizeMinutes(value, fallback = 5) {
  return Math.min(999, Math.max(1, Number.parseInt(value, 10) || fallback));
}

function readMinutesFromPath() {
  const segments = window.location.pathname.split("/").filter(Boolean);
  const lastSegment = segments.at(-1);

  if (!/^\d+$/.test(lastSegment || "")) {
    return null;
  }

  return normalizeMinutes(lastSegment);
}

function readMinutesFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const pathMinutes = readMinutesFromPath();

  if (pathMinutes !== null) {
    return pathMinutes;
  }

  return normalizeMinutes(params.get("m") || params.get("minutes"), 5);
}

function formatTime(seconds) {
  const roundedSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(roundedSeconds / 60);
  const secs = roundedSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function syncDocumentTitle() {
  document.title = `${formatTime(remaining)} | N Minute Timer`;
}

function render() {
  const remainingRatio = duration > 0 ? remaining / duration : 0;

  scene.style.setProperty("--bar-color", barColorAt(remainingRatio));
  scene.style.setProperty("--elapsed-ratio", String(1 - remainingRatio));

  display.textContent = formatTime(remaining);
  minutesInput.disabled = isRunning;
  startButton.disabled = remaining <= 0;
  startButton.textContent = isRunning ? "❚❚" : "▶";
  startButton.setAttribute("aria-label", isRunning ? "一時停止" : "スタート");
  syncDocumentTitle();
}

function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}

function notifyDone() {
  if (hasNotifiedDone) {
    return;
  }

  hasNotifiedDone = true;

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Timer finished", {
      body: "Time is up.",
    });
  }

  window.alert("Time is up.");
}

function stopAnimation() {
  if (animationId !== null) {
    window.cancelAnimationFrame(animationId);
    animationId = null;
  }
}

function tick() {
  if (!isRunning || endTime === null) {
    return;
  }

  remaining = Math.max(0, (endTime - performance.now()) / 1000);

  if (remaining <= 0) {
    isRunning = false;
    endTime = null;
    remaining = 0;
    stopAnimation();
    render();
    notifyDone();
    return;
  }

  render();
  animationId = window.requestAnimationFrame(tick);
}

function setMinutes(value) {
  stopAnimation();
  isRunning = false;
  endTime = null;
  duration = normalizeMinutes(value) * 60;
  remaining = duration;
  hasNotifiedDone = false;
  display.style.setProperty("--char-count", String(formatTime(duration).length));
  render();
}

function startTimer() {
  if (remaining <= 0) {
    return;
  }

  requestNotificationPermission();
  isRunning = true;
  hasNotifiedDone = false;
  endTime = performance.now() + remaining * 1000;
  render();
  stopAnimation();
  animationId = window.requestAnimationFrame(tick);
}

function pauseTimer() {
  if (!isRunning) {
    return;
  }

  remaining = Math.max(0, (endTime - performance.now()) / 1000);
  isRunning = false;
  endTime = null;
  stopAnimation();
  render();
}

function resetTimer() {
  stopAnimation();
  isRunning = false;
  endTime = null;
  remaining = duration;
  hasNotifiedDone = false;
  minutesInput.value = String(duration / 60);
  render();
}

minutesInput.addEventListener("input", () => {
  const minutes = normalizeMinutes(minutesInput.value);
  minutesInput.value = String(minutes);
  setMinutes(minutes);
});

startButton.addEventListener("click", () => {
  if (isRunning) {
    pauseTimer();
    return;
  }

  startTimer();
});

resetButton.addEventListener("click", resetTimer);

setMinutes(readMinutesFromQuery());
minutesInput.value = String(duration / 60);
