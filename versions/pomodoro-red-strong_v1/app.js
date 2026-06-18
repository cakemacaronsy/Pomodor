// Usage: powers the Red Strong Pomodoro version in index.html; no build step or dependencies are required.
const modes = {
  focus: { label: "專注", minutesKey: "focusMinutes", defaultMinutes: 25 },
  short: { label: "短休息", minutesKey: "shortMinutes", defaultMinutes: 10 },
  long: { label: "長休息", minutesKey: "longMinutes", defaultMinutes: 0 },
};

const storageKey = "sean-pomodoro-red-strong-v1";
const dailyGoal = 8;

const elements = {
  modeTabs: document.querySelectorAll(".mode-tab"),
  modeLabel: document.querySelector("#modeLabel"),
  timeDisplay: document.querySelector("#timeDisplay"),
  progressFill: document.querySelector("#progressFill"),
  progressKnob: document.querySelector("#progressKnob"),
  toggleButton: document.querySelector("#toggleButton"),
  sessionCount: document.querySelector("#sessionCount"),
  tomatoRow: document.querySelector("#tomatoRow"),
  dotRow: document.querySelector("#dotRow"),
  focusMinutes: document.querySelector("#focusMinutes"),
  shortMinutes: document.querySelector("#shortMinutes"),
  longMinutes: document.querySelector("#longMinutes"),
  taskForm: document.querySelector("#taskForm"),
  taskInput: document.querySelector("#taskInput"),
  taskList: document.querySelector("#taskList"),
};

const state = loadState();
let ticker = null;
let lastTick = null;

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `red-strong-task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadState() {
  const fallback = {
    mode: "focus",
    isRunning: false,
    remainingSeconds: modes.focus.defaultMinutes * 60,
    totalSeconds: modes.focus.defaultMinutes * 60,
    completedSessions: 2,
    durations: {
      focus: modes.focus.defaultMinutes,
      short: modes.short.defaultMinutes,
      long: modes.long.defaultMinutes,
    },
    tasks: [
      { id: createId(), title: "完成專案提案簡報", done: true },
      { id: createId(), title: "整理需求文件", done: true },
      { id: createId(), title: "回覆客戶信件", done: false },
      { id: createId(), title: "研究競品功能", done: false },
      { id: createId(), title: "準備明日會議", done: false },
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
  const minutes = Number(state.durations[mode]);
  return Math.max(0, Number.isFinite(minutes) ? minutes : modes[mode].defaultMinutes) * 60;
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function setMode(nextMode) {
  stopTimer();
  state.mode = nextMode;
  state.totalSeconds = getDurationSeconds(nextMode);
  state.remainingSeconds = state.totalSeconds;
  saveState();
  render();
}

function startTimer() {
  if (state.isRunning || state.totalSeconds <= 0) return;
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
    state.completedSessions = Math.min(dailyGoal, state.completedSessions + 1);
    state.mode = state.completedSessions % 4 === 0 ? "long" : "short";
  } else {
    state.mode = "focus";
  }

  state.totalSeconds = getDurationSeconds(state.mode);
  state.remainingSeconds = state.totalSeconds;
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
    const max = Number(input.max) || 120;
    const nextValue = Math.max(0, Math.min(max, Number(input.value) || 0));
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
  state.tasks.push({ id: createId(), title: cleanTitle, done: false });
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

function renderTomatoes() {
  elements.tomatoRow.innerHTML = "";
  elements.dotRow.innerHTML = "";

  for (let index = 0; index < dailyGoal; index += 1) {
    const tomato = document.createElement("span");
    tomato.className = "mini-tomato";
    if (index < state.completedSessions) tomato.classList.add("is-filled");
    if (index >= state.completedSessions && index < 4) tomato.classList.add("is-outline");

    const image = document.createElement("img");
    image.src = "assets/tomato.svg";
    image.alt = "";
    tomato.append(image);
    elements.tomatoRow.append(tomato);

    const dot = document.createElement("span");
    dot.className = "tiny-dot";
    elements.dotRow.append(dot);
  }
}

function renderTasks() {
  elements.taskList.innerHTML = "";
  state.tasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = `focus-item${task.done ? " is-done" : ""}`;

    const check = document.createElement("button");
    check.className = "focus-check";
    check.type = "button";
    check.setAttribute("aria-label", task.done ? "標記為未完成" : "標記為完成");
    check.addEventListener("click", () => toggleTask(task.id));

    const title = document.createElement("span");
    title.className = "focus-title";
    title.textContent = task.title;

    item.append(check, title);
    elements.taskList.append(item);
  });
}

function render() {
  const mode = modes[state.mode];
  const displayTime = formatTime(state.remainingSeconds);
  const progress = state.totalSeconds > 0 ? 1 - state.remainingSeconds / state.totalSeconds : 0;
  const progressDegrees = Math.max(4, Math.min(356, progress * 360 || 78));

  elements.modeLabel.textContent = mode.label;
  elements.timeDisplay.textContent = displayTime;
  elements.timeDisplay.setAttribute("datetime", `PT${Math.ceil(state.remainingSeconds)}S`);
  elements.progressFill.style.setProperty("--progress", `${progressDegrees}deg`);
  elements.progressKnob.style.setProperty("--progress", `${progressDegrees}deg`);
  elements.sessionCount.textContent = state.completedSessions;

  elements.modeTabs.forEach((tab) => {
    const isActive = tab.dataset.mode === state.mode;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  renderTomatoes();
  renderTasks();
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
