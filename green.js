// Usage: powers the separate green Pomodoro timer UI in green.html; no build step or dependencies are required.
const modes = {
  focus: { label: "專注", minutesKey: "focusMinutes", defaultMinutes: 25 },
  short: { label: "短休息", minutesKey: "shortMinutes", defaultMinutes: 5 },
  long: { label: "長休息", minutesKey: "longMinutes", defaultMinutes: 15 },
};

const storageKey = "sean-green-pomodoro-state-v1";

const elements = {
  modeTabs: document.querySelectorAll(".mode-tab"),
  modeLabel: document.querySelector("#modeLabel"),
  timeDisplay: document.querySelector("#timeDisplay"),
  topbarMode: document.querySelector("#topbarMode"),
  topbarTime: document.querySelector("#topbarTime"),
  progressRing: document.querySelector("#progressRing"),
  toggleButton: document.querySelector("#toggleButton"),
  resetButton: document.querySelector("#resetButton"),
  sessionCount: document.querySelector("#sessionCount"),
  goalDots: document.querySelectorAll(".goal-dot"),
  focusMinutes: document.querySelector("#focusMinutes"),
  shortMinutes: document.querySelector("#shortMinutes"),
  longMinutes: document.querySelector("#longMinutes"),
  taskForm: document.querySelector("#taskForm"),
  taskInput: document.querySelector("#taskInput"),
  taskList: document.querySelector("#taskList"),
  currentTask: document.querySelector("#currentTask"),
};

const state = loadState();
let ticker = null;
let lastTick = null;

function loadState() {
  const fallback = {
    mode: "focus",
    isRunning: false,
    remainingSeconds: modes.focus.defaultMinutes * 60,
    totalSeconds: modes.focus.defaultMinutes * 60,
    completedSessions: 0,
    durations: {
      focus: modes.focus.defaultMinutes,
      short: modes.short.defaultMinutes,
      long: modes.long.defaultMinutes,
    },
    tasks: [
      { id: createId(), title: "整理今天最重要的一件事", done: false },
      { id: createId(), title: "完成後補水休息", done: false },
    ],
  };

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (!saved) return fallback;
    return {
      ...fallback,
      ...saved,
      durations: { ...fallback.durations, ...saved.durations },
      tasks: Array.isArray(saved.tasks) ? saved.tasks : fallback.tasks,
      isRunning: false,
    };
  } catch {
    return fallback;
  }
}

function createId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `green-task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify({ ...state, isRunning: false }));
}

function getDurationSeconds(mode) {
  const minutes = Number(state.durations[mode]) || modes[mode].defaultMinutes;
  return Math.max(1, minutes) * 60;
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function setMode(nextMode, preserveRemaining = false) {
  stopTimer();
  state.mode = nextMode;
  state.totalSeconds = getDurationSeconds(nextMode);
  state.remainingSeconds = preserveRemaining ? Math.min(state.remainingSeconds, state.totalSeconds) : state.totalSeconds;
  saveState();
  render();
}

function startTimer() {
  if (state.isRunning) return;
  state.isRunning = true;
  lastTick = performance.now();
  ticker = window.setInterval(tick, 250);
  render();
}

function stopTimer() {
  state.isRunning = false;
  lastTick = null;
  if (ticker) {
    window.clearInterval(ticker);
    ticker = null;
  }
  render();
}

function tick() {
  const now = performance.now();
  const elapsed = (now - lastTick) / 1000;
  lastTick = now;
  state.remainingSeconds = Math.max(0, state.remainingSeconds - elapsed);

  if (state.remainingSeconds <= 0) {
    completeMode();
    return;
  }

  render();
}

function completeMode() {
  const finishedMode = state.mode;
  stopTimer();
  chime();

  if (finishedMode === "focus") {
    state.completedSessions += 1;
    const nextMode = state.completedSessions % 4 === 0 ? "long" : "short";
    state.mode = nextMode;
    state.totalSeconds = getDurationSeconds(nextMode);
    state.remainingSeconds = state.totalSeconds;
  } else {
    state.mode = "focus";
    state.totalSeconds = getDurationSeconds("focus");
    state.remainingSeconds = state.totalSeconds;
  }

  saveState();
  render();
}

function chime() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(520, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(780, context.currentTime + 0.18);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.14, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.46);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.48);
}

function updateDurations() {
  for (const mode of Object.keys(modes)) {
    const input = elements[modes[mode].minutesKey];
    const nextValue = Math.max(1, Math.min(120, Number(input.value) || modes[mode].defaultMinutes));
    state.durations[mode] = nextValue;
    input.value = nextValue;
  }

  if (!state.isRunning) {
    state.totalSeconds = getDurationSeconds(state.mode);
    state.remainingSeconds = state.totalSeconds;
  }

  saveState();
  render();
}

function addTask(title) {
  const cleanTitle = title.trim();
  if (!cleanTitle) return;

  state.tasks.unshift({
    id: createId(),
    title: cleanTitle,
    done: false,
  });
  elements.taskInput.value = "";
  saveState();
  renderTasks();
}

function toggleTask(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;

  task.done = !task.done;
  saveState();
  renderTasks();
}

function removeTask(taskId) {
  state.tasks = state.tasks.filter((task) => task.id !== taskId);
  saveState();
  renderTasks();
}

function render() {
  const mode = modes[state.mode];
  const displayTime = formatTime(state.remainingSeconds);
  const progress = state.totalSeconds > 0 ? 1 - state.remainingSeconds / state.totalSeconds : 0;
  const progressDegrees = Math.max(0, Math.min(360, progress * 360));

  elements.modeLabel.textContent = mode.label;
  elements.topbarMode.textContent = mode.label;
  elements.timeDisplay.textContent = displayTime;
  elements.timeDisplay.setAttribute("datetime", `PT${Math.ceil(state.remainingSeconds)}S`);
  elements.topbarTime.textContent = displayTime;
  elements.progressRing.style.setProperty("--ring-progress", `${progressDegrees}deg`);
  elements.toggleButton.textContent = state.isRunning ? "暫停" : "開始";
  elements.sessionCount.textContent = state.completedSessions;

  elements.modeTabs.forEach((tab) => {
    const isActive = tab.dataset.mode === state.mode;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  elements.goalDots.forEach((dot, index) => {
    dot.classList.toggle("is-filled", index < state.completedSessions % 4);
  });

  renderTasks();
}

function renderTasks() {
  const activeTask = state.tasks.find((task) => !task.done);
  elements.currentTask.textContent = activeTask ? activeTask.title : "任務清空了";
  elements.taskList.innerHTML = "";

  state.tasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = `task-item${task.done ? " is-done" : ""}`;

    const check = document.createElement("button");
    check.className = "task-check";
    check.type = "button";
    check.setAttribute("aria-label", task.done ? "標記為未完成" : "標記為完成");
    check.addEventListener("click", () => toggleTask(task.id));

    const title = document.createElement("span");
    title.className = "task-title";
    title.textContent = task.title;

    const remove = document.createElement("button");
    remove.className = "task-button";
    remove.type = "button";
    remove.textContent = "移除";
    remove.addEventListener("click", () => removeTask(task.id));

    item.append(check, title, remove);
    elements.taskList.append(item);
  });
}

elements.modeTabs.forEach((tab) => {
  tab.addEventListener("click", () => setMode(tab.dataset.mode));
});

elements.toggleButton.addEventListener("click", () => {
  if (state.isRunning) {
    stopTimer();
    saveState();
  } else {
    startTimer();
  }
});

elements.resetButton.addEventListener("click", () => {
  state.totalSeconds = getDurationSeconds(state.mode);
  state.remainingSeconds = state.totalSeconds;
  stopTimer();
  saveState();
  render();
});

elements.taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addTask(elements.taskInput.value);
});

[elements.focusMinutes, elements.shortMinutes, elements.longMinutes].forEach((input) => {
  input.addEventListener("change", updateDurations);
});

for (const mode of Object.keys(modes)) {
  elements[modes[mode].minutesKey].value = state.durations[mode];
}

state.totalSeconds = state.totalSeconds || getDurationSeconds(state.mode);
state.remainingSeconds = Math.min(state.remainingSeconds || state.totalSeconds, state.totalSeconds);
render();
