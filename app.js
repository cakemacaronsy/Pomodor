// Usage: powers the red Pomodoro dashboard in index.html; no build step or dependencies are required.
const modes = {
  focus: { label: "專注時間", shortLabel: "專注", minutesKey: "focusMinutes", defaultMinutes: 25 },
  short: { label: "短休息時間", shortLabel: "短休息", minutesKey: "shortMinutes", defaultMinutes: 5 },
  long: { label: "長休息時間", shortLabel: "長休息", minutesKey: "longMinutes", defaultMinutes: 15 },
};

const storageKey = "sean-pomodoro-state-v1";

const elements = {
  modeTabs: document.querySelectorAll(".mode-tab"),
  modeLabel: document.querySelector("#modeLabel"),
  timeDisplay: document.querySelector("#timeDisplay"),
  progressRing: document.querySelector("#progressRing"),
  toggleButton: document.querySelector("#toggleButton"),
  toggleIcon: document.querySelector("#toggleIcon"),
  resetButton: document.querySelector("#resetButton"),
  pauseButton: document.querySelector("#pauseButton"),
  sessionCount: document.querySelector("#sessionCount"),
  focusTotal: document.querySelector("#focusTotal"),
  longBreakCount: document.querySelector("#longBreakCount"),
  cycleNumber: document.querySelector("#cycleNumber"),
  cycleDots: document.querySelectorAll(".cycle-dot"),
  focusMinutes: document.querySelector("#focusMinutes"),
  shortMinutes: document.querySelector("#shortMinutes"),
  longMinutes: document.querySelector("#longMinutes"),
  resetDefaults: document.querySelector("#resetDefaults"),
  themeButton: document.querySelector("#themeButton"),
  taskForm: document.querySelector("#taskForm"),
  taskInput: document.querySelector("#taskInput"),
  taskList: document.querySelector("#taskList"),
  taskFilters: document.querySelectorAll(".task-tabs button"),
  allCount: document.querySelector("#allCount"),
  activeCount: document.querySelector("#activeCount"),
};

const state = loadState();
let ticker = null;
let lastTick = null;
let taskFilter = "all";

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadState() {
  const fallback = {
    mode: "focus",
    isRunning: false,
    remainingSeconds: modes.focus.defaultMinutes * 60,
    totalSeconds: modes.focus.defaultMinutes * 60,
    completedSessions: 8,
    longBreaks: 1,
    durations: {
      focus: modes.focus.defaultMinutes,
      short: modes.short.defaultMinutes,
      long: modes.long.defaultMinutes,
    },
    tasks: [
      { id: createId(), title: "撰寫產品需求文件", done: false, status: "進行中" },
      { id: createId(), title: "回覆客戶信件", done: true },
      { id: createId(), title: "設計系統調整", done: false },
      { id: createId(), title: "閱讀技術文章", done: true },
      { id: createId(), title: "準備明日會議簡報", done: false },
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

function formatMinutes(minutes) {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours} 小時 ${rest} 分鐘` : `${hours} 小時`;
  }
  return `${minutes} 分鐘`;
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
    if (nextMode === "long") state.longBreaks += 1;
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
  oscillator.frequency.setValueAtTime(660, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.16);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.42);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.44);
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

function resetDefaults() {
  Object.keys(modes).forEach((mode) => {
    state.durations[mode] = modes[mode].defaultMinutes;
    elements[modes[mode].minutesKey].value = modes[mode].defaultMinutes;
  });
  state.totalSeconds = getDurationSeconds(state.mode);
  state.remainingSeconds = state.totalSeconds;
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
  task.status = task.done ? "" : task.status;
  saveState();
  renderTasks();
}

function removeTask(taskId) {
  state.tasks = state.tasks.filter((task) => task.id !== taskId);
  saveState();
  renderTasks();
}

function filteredTasks() {
  if (taskFilter === "active") return state.tasks.filter((task) => !task.done);
  if (taskFilter === "done") return state.tasks.filter((task) => task.done);
  return state.tasks;
}

function render() {
  const mode = modes[state.mode];
  const displayTime = formatTime(state.remainingSeconds);
  const progress = state.totalSeconds > 0 ? 1 - state.remainingSeconds / state.totalSeconds : 0;
  const progressDegrees = Math.max(0, Math.min(360, progress * 360));
  const cycleIndex = state.completedSessions % 4;

  elements.modeLabel.textContent = mode.label;
  elements.timeDisplay.textContent = displayTime;
  elements.timeDisplay.setAttribute("datetime", `PT${Math.ceil(state.remainingSeconds)}S`);
  elements.progressRing.style.setProperty("--ring-progress", `${progressDegrees}deg`);
  elements.toggleButton.querySelector("span").textContent = state.isRunning ? "暫停" : "開始";
  elements.toggleIcon.setAttribute("d", state.isRunning ? "M8 5h3v14H8zM15 5h3v14h-3z" : "M8 5v14l11-7Z");
  elements.sessionCount.textContent = state.completedSessions;
  elements.focusTotal.textContent = formatMinutes(state.completedSessions * state.durations.focus);
  elements.longBreakCount.textContent = `${state.longBreaks || Math.floor(state.completedSessions / 4)} 次`;
  elements.cycleNumber.textContent = cycleIndex + 1;

  elements.modeTabs.forEach((tab) => {
    const isActive = tab.dataset.mode === state.mode;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  elements.cycleDots.forEach((dot, index) => {
    dot.classList.toggle("is-filled", index <= cycleIndex);
  });

  renderTasks();
}

function renderTasks() {
  const activeCount = state.tasks.filter((task) => !task.done).length;
  elements.allCount.textContent = state.tasks.length;
  elements.activeCount.textContent = activeCount;
  elements.taskList.innerHTML = "";

  filteredTasks().forEach((task) => {
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

    const meta = document.createElement("span");
    meta.className = "task-meta";
    if (task.status && !task.done) {
      const badge = document.createElement("span");
      badge.className = "task-badge";
      badge.textContent = task.status;
      meta.append(badge);
    } else {
      meta.textContent = task.done ? "已完成" : `${state.durations.focus} 分鐘`;
    }

    const remove = document.createElement("button");
    remove.className = "task-remove";
    remove.type = "button";
    remove.textContent = "移除";
    remove.addEventListener("click", () => removeTask(task.id));

    item.append(check, title, meta, remove);
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

elements.pauseButton.addEventListener("click", () => {
  stopTimer();
  saveState();
});

elements.resetButton.addEventListener("click", () => {
  state.totalSeconds = getDurationSeconds(state.mode);
  state.remainingSeconds = state.totalSeconds;
  stopTimer();
  saveState();
  render();
});

elements.resetDefaults.addEventListener("click", resetDefaults);

elements.themeButton.addEventListener("click", () => {
  document.body.classList.toggle("is-dark");
});

elements.taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addTask(elements.taskInput.value);
});

elements.taskFilters.forEach((button) => {
  button.addEventListener("click", () => {
    taskFilter = button.dataset.filter;
    elements.taskFilters.forEach((candidate) => candidate.classList.toggle("is-active", candidate === button));
    renderTasks();
  });
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
