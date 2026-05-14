const KEYS = [
  { p: 1.0, top: "#0d3b66", mid: "#3e7cb1", bot: "#f4d35e" },
  { p: 0.6, top: "#1a1d4a", mid: "#c44536", bot: "#ee964b" },
  { p: 0.3, top: "#0b0e2b", mid: "#5e1839", bot: "#b8331f" },
  { p: 0.1, top: "#06061a", mid: "#1c0a2c", bot: "#3e0f33" },
  { p: 0.0, top: "#02030c", mid: "#070818", bot: "#0e0c22" },
];

const SUN = "#ffe9b0";
const SUN_GLOW = "#ff5a2c";

const scene = document.querySelector("#scene");
const svg = document.querySelector("#sky-svg");
const arcBg = document.querySelector("#arc-bg");
const arcFg = document.querySelector("#arc-fg");
const dotStart = document.querySelector("#dot-start");
const dotEnd = document.querySelector("#dot-end");
const water = document.querySelector("#water");
const horizon = document.querySelector("#horizon");
const waterTopStop = document.querySelector("#water-top");
const waterBotStop = document.querySelector("#water-bot");
const sunHalo = document.querySelector("#sun-halo");
const sunGlow = document.querySelector("#sun-glow");
const sunCore = document.querySelector("#sun-core");
const display = document.querySelector("#display");
const minutesInput = document.querySelector("#minutes-input");
const stepUpButton = document.querySelector("#step-up");
const stepDownButton = document.querySelector("#step-down");
const startButton = document.querySelector("#start-button");
const resetButton = document.querySelector("#reset-button");

let dimensions = { width: 0, height: 0 };
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

function paletteAt(progress) {
  for (let index = 0; index < KEYS.length - 1; index += 1) {
    const start = KEYS[index];
    const end = KEYS[index + 1];

    if (progress <= start.p && progress >= end.p) {
      const span = start.p - end.p;
      const amount = span > 0 ? (start.p - progress) / span : 0;

      return {
        top: rgbString(lerpRgb(start.top, end.top, amount)),
        mid: rgbString(lerpRgb(start.mid, end.mid, amount)),
        bot: rgbString(lerpRgb(start.bot, end.bot, amount)),
      };
    }
  }

  return KEYS.at(-1);
}

function parseRgb(value) {
  const matches = String(value).match(/\d+/g);
  return matches ? matches.map(Number) : [0, 0, 0];
}

function darken(rgb, factor = 0.35) {
  const [red, green, blue] = parseRgb(rgb);
  return `rgb(${(red * factor) | 0},${(green * factor) | 0},${(blue * factor) | 0})`;
}

function brightness(rgb) {
  const [red, green, blue] = parseRgb(rgb);
  return 0.299 * red + 0.587 * green + 0.114 * blue;
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

function updateDimensions() {
  dimensions = {
    width: scene.clientWidth,
    height: scene.clientHeight,
  };

  svg.setAttribute("viewBox", `0 0 ${dimensions.width} ${dimensions.height}`);
}

function render() {
  const { width, height } = dimensions;

  if (width === 0 || height === 0) {
    return;
  }

  const progress = duration > 0 ? remaining / duration : 0;
  const sky = paletteAt(progress);
  const horizonY = height * 0.72;
  const start = { x: width * 0.1, y: horizonY };
  const control = { x: width * 0.5, y: height * 0.08 };
  const end = { x: width * 0.9, y: horizonY };
  const path = `M ${start.x},${start.y} Q ${control.x},${control.y} ${end.x},${end.y}`;
  const traveled = 1 - progress;
  const untraveled = 1 - traveled;
  const sunX = untraveled * untraveled * start.x + 2 * untraveled * traveled * control.x + traveled * traveled * end.x;
  const sunY = untraveled * untraveled * start.y + 2 * untraveled * traveled * control.y + traveled * traveled * end.y;
  const isDarkBackground = brightness(sky.bot) < 130;

  scene.style.background = `linear-gradient(180deg, ${sky.top} 0%, ${sky.mid} 55%, ${sky.bot} 100%)`;
  scene.classList.toggle("dark", isDarkBackground);
  scene.classList.toggle("light", !isDarkBackground);

  arcBg.setAttribute("d", path);
  arcFg.setAttribute("d", path);
  arcFg.style.stroke = SUN;
  arcFg.setAttribute("stroke-dashoffset", String(progress));

  dotStart.setAttribute("cx", start.x);
  dotStart.setAttribute("cy", start.y);
  dotEnd.setAttribute("cx", end.x);
  dotEnd.setAttribute("cy", end.y);
  dotEnd.setAttribute("fill", progress <= 0 ? SUN : "rgba(255,255,255,0.25)");

  [sunHalo, sunGlow, sunCore].forEach((sunPart) => {
    sunPart.setAttribute("cx", sunX);
    sunPart.setAttribute("cy", sunY);
  });
  sunHalo.setAttribute("fill", SUN_GLOW);
  sunGlow.setAttribute("fill", SUN_GLOW);
  sunCore.setAttribute("fill", SUN);

  water.setAttribute("x", 0);
  water.setAttribute("y", horizonY);
  water.setAttribute("width", width);
  water.setAttribute("height", height - horizonY);
  waterTopStop.setAttribute("stop-color", darken(sky.bot, 0.55));
  waterBotStop.setAttribute("stop-color", darken(sky.bot, 0.18));
  horizon.setAttribute("x1", 0);
  horizon.setAttribute("y1", horizonY);
  horizon.setAttribute("x2", width);
  horizon.setAttribute("y2", horizonY);
  horizon.setAttribute("stroke", darken(sky.bot, 0.8));

  display.textContent = formatTime(remaining);
  minutesInput.disabled = isRunning;
  stepUpButton.disabled = isRunning;
  stepDownButton.disabled = isRunning;
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

function adjustMinutes(delta) {
  const minutes = normalizeMinutes(minutesInput.value) + delta;
  const nextMinutes = Math.min(999, Math.max(1, minutes));
  minutesInput.value = String(nextMinutes);
  setMinutes(nextMinutes);
}

minutesInput.addEventListener("input", () => {
  const minutes = normalizeMinutes(minutesInput.value);
  minutesInput.value = String(minutes);
  setMinutes(minutes);
});

stepUpButton.addEventListener("click", () => {
  adjustMinutes(1);
});

stepDownButton.addEventListener("click", () => {
  adjustMinutes(-1);
});

startButton.addEventListener("click", () => {
  if (isRunning) {
    pauseTimer();
    return;
  }

  startTimer();
});

resetButton.addEventListener("click", resetTimer);

window.addEventListener("resize", () => {
  updateDimensions();
  render();
});

updateDimensions();
setMinutes(readMinutesFromQuery());
minutesInput.value = String(duration / 60);
