const display = document.querySelector("#display");
const statusText = document.querySelector("#status");
const minutesInput = document.querySelector("#minutes-input");
const startButton = document.querySelector("#start-button");
const pauseButton = document.querySelector("#pause-button");
const resetButton = document.querySelector("#reset-button");

let totalSeconds = Number(minutesInput.value) * 60;
let remainingSeconds = totalSeconds;
let intervalId = null;
let isPaused = false;
let endTime = null;

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function syncDisplay() {
  display.textContent = formatTime(remainingSeconds);
  document.title = `${formatTime(remainingSeconds)} | N Minute Timer`;
}

function syncButtons() {
  const isRunning = intervalId !== null;
  startButton.textContent = isPaused ? "Resume" : "Start";
  pauseButton.disabled = !isRunning;
  startButton.disabled = isRunning;
  minutesInput.disabled = isRunning;
}

function setStatus(message, isDone = false) {
  statusText.textContent = message;
  statusText.classList.toggle("done", isDone);
}

function stopTimer() {
  if (intervalId !== null) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
}

function notifyDone() {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Timer finished", {
      body: "Time is up."
    });
  }

  window.alert("Time is up.");
}

function tick() {
  if (endTime === null) {
    return;
  }

  remainingSeconds = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
  syncDisplay();

  if (remainingSeconds <= 0) {
    stopTimer();
    isPaused = false;
    endTime = null;
    remainingSeconds = 0;
    syncDisplay();
    syncButtons();
    setStatus("Finished.", true);
    notifyDone();
  }
}

function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {
      setStatus("Browser notification permission was not granted.");
    });
  }
}

function resetTimer() {
  stopTimer();
  totalSeconds = Math.max(1, Number(minutesInput.value) || 5) * 60;
  remainingSeconds = totalSeconds;
  isPaused = false;
  endTime = null;
  syncDisplay();
  syncButtons();
  setStatus("Set minutes and press start.");
}

function startTimer() {
  if (!isPaused) {
    totalSeconds = Math.max(1, Number(minutesInput.value) || 5) * 60;
    remainingSeconds = totalSeconds;
  }

  requestNotificationPermission();
  isPaused = false;
  endTime = Date.now() + remainingSeconds * 1000;
  syncButtons();
  setStatus("Timer is running.");
  syncDisplay();

  intervalId = window.setInterval(tick, 250);
}

function pauseTimer() {
  stopTimer();
  isPaused = true;
  endTime = null;
  syncButtons();
  setStatus("Timer paused.");
}

minutesInput.addEventListener("input", () => {
  totalSeconds = Math.max(1, Number(minutesInput.value) || 5) * 60;
  remainingSeconds = totalSeconds;
  syncDisplay();
  setStatus("Set minutes and press start.");
});

startButton.addEventListener("click", startTimer);
pauseButton.addEventListener("click", pauseTimer);
resetButton.addEventListener("click", resetTimer);

syncDisplay();
syncButtons();
