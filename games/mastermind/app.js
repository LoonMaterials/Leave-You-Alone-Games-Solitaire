(function () {
  "use strict";
  try {
    localStorage.setItem("leave-me-alone-games-last-game", JSON.stringify({ id: "mastermind", href: "games/mastermind/index.html", title: document.querySelector("h1")?.textContent?.trim() || "mastermind", playedAt: Date.now() }));
  } catch {}

  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const KEY = "leave-me-alone-mastermind-current-game";
  const MODE_KEY = "leave-me-alone-mastermind-mode";
  const SAVE_VERSION = 2;
  const MODES = {
    classic: { slots: 4, colors: ["red", "blue", "green", "yellow", "purple"], label: "mastermindModeClassic" },
    advanced: { slots: 5, colors: ["red", "blue", "green", "yellow", "purple", "orange"], label: "mastermindModeAdvanced" },
    expert: { slots: 6, colors: ["red", "blue", "green", "yellow", "purple", "orange"], label: "mastermindModeExpert" }
  };

  const board = document.getElementById("game-board");
  const status = document.getElementById("status");
  const undoButton = document.getElementById("undo-button");
  const modeSelect = document.getElementById("mode-select");
  const t = (key, values) => window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key;
  let state;
  let undoStack = [];

  function applyTheme() {
    try {
      const theme = localStorage.getItem(THEME_KEY);
      const selectedTheme = THEMES.has(theme) ? theme : "colorblind";
      document.body.classList.remove("theme-colorblind", "theme-blue", "theme-grey", "theme-orange");
      if (selectedTheme !== "green") document.body.classList.add(`theme-${selectedTheme}`);
    } catch {}
  }

  function storedMode() {
    try {
      const mode = localStorage.getItem(MODE_KEY);
      return MODES[mode] ? mode : "classic";
    } catch {
      return "classic";
    }
  }

  function saveMode(mode) {
    try {
      localStorage.setItem(MODE_KEY, MODES[mode] ? mode : "classic");
    } catch {}
  }

  function configFor(mode) {
    return MODES[mode] || MODES.classic;
  }

  function modeConfig() {
    return configFor(state?.mode);
  }

  function randomCode(mode) {
    const config = configFor(mode);
    return Array.from({ length: config.slots }, () => config.colors[Math.floor(Math.random() * config.colors.length)]);
  }

  function emptyGuess(mode) {
    return Array(configFor(mode).slots).fill("");
  }

  function fresh(mode = storedMode()) {
    const selectedMode = MODES[mode] ? mode : "classic";
    return {
      version: SAVE_VERSION,
      mode: selectedMode,
      code: randomCode(selectedMode),
      guess: emptyGuess(selectedMode),
      history: [],
      solved: false
    };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }

  function isValidSave(saved) {
    const config = configFor(saved?.mode);
    return saved?.version === SAVE_VERSION &&
      MODES[saved?.mode] &&
      saved?.code?.length === config.slots &&
      saved?.guess?.length === config.slots &&
      Array.isArray(saved?.history);
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      return isValidSave(saved) ? saved : fresh();
    } catch {
      return fresh();
    }
  }

  function remember() {
    undoStack.push(clone(state));
    if (undoStack.length > 50) undoStack.shift();
  }

  function dot(className, label, action) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.setAttribute("aria-label", label);
    button.addEventListener("click", action);
    return button;
  }

  function updateModeLabel() {
    if (!modeSelect) return;
    [...modeSelect.options].forEach((option) => {
      const key = MODES[option.value]?.label;
      if (key) option.textContent = t(key);
    });
    modeSelect.value = state?.mode || storedMode();
  }

  function render() {
    const config = modeConfig();
    board.textContent = "";
    board.className = "board mastermind";
    board.style.setProperty("--mm-slots", String(config.slots));

    state.history.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "mm-row";
      entry.guess.forEach((color) => row.appendChild(dot(`mm-slot ${color || "blank"}`, color || "blank", () => {})));
      const feedback = document.createElement("span");
      feedback.className = "mm-feedback";
      feedback.textContent = t("mastermindFeedback", entry);
      row.appendChild(feedback);
      board.appendChild(row);
    });

    if (!state.solved) {
      const guessRow = document.createElement("div");
      guessRow.className = "mm-row mm-current";
      state.guess.forEach((color, index) => {
        guessRow.appendChild(dot(`mm-slot ${color || "blank"}`, t("mastermindSlot", { number: index + 1 }), () => {
          remember();
          state.guess[index] = "";
          save();
          render();
        }));
      });
      board.appendChild(guessRow);
    }

    const choices = document.createElement("div");
    choices.className = "mm-choices";
    config.colors.forEach((color) => choices.appendChild(dot(`mm-choice ${color}`, color, () => {
      if (state.solved) return;
      const open = state.guess.findIndex((item) => !item);
      if (open === -1) return;
      remember();
      state.guess[open] = color;
      save();
      render();
    })));
    board.appendChild(choices);

    status.textContent = state.solved ? t("puzzleSolved") : t("mastermindPrompt", { slots: config.slots });
    undoButton.disabled = undoStack.length === 0;
    updateModeLabel();
  }

  function check() {
    const config = modeConfig();
    if (state.solved) return;
    if (state.guess.some((color) => !color)) {
      status.textContent = t("puzzleTryAgain");
      return;
    }
    const exact = state.guess.filter((color, i) => color === state.code[i]).length;
    const pool = state.code.slice();
    let near = 0;
    state.guess.forEach((color, i) => {
      if (color === state.code[i]) pool[i] = null;
    });
    state.guess.forEach((color, i) => {
      if (color === state.code[i]) return;
      const found = pool.indexOf(color);
      if (found >= 0) {
        near += 1;
        pool[found] = null;
      }
    });
    remember();
    state.history.push({ guess: state.guess.slice(), exact, near });
    state.solved = exact === config.slots;
    state.guess = emptyGuess(state.mode);
    save();
    render();
    status.textContent = t(state.solved ? "puzzleSolved" : "puzzleTryAgain");
  }

  function newGame(mode = state?.mode || storedMode()) {
    state = fresh(mode);
    undoStack = [];
    saveMode(state.mode);
    save();
    render();
  }

  function undo() {
    if (!undoStack.length) return;
    state = undoStack.pop();
    saveMode(state.mode);
    save();
    render();
  }

  function changeMode() {
    newGame(modeSelect?.value || "classic");
  }

  applyTheme();
  state = load();
  saveMode(state.mode);
  save();
  document.getElementById("check-button").addEventListener("click", check);
  document.getElementById("new-game-button").addEventListener("click", () => newGame());
  undoButton.addEventListener("click", undo);
  modeSelect?.addEventListener("change", changeMode);
  document.addEventListener("lmag:languagechange", render);
  render();
})();
