(function () {
  "use strict";

  const STORAGE_KEY = "leave-me-alone-farkle-current-game";
  const MODE_KEY = "leave-me-alone-farkle-mode";
  const DIFFICULTY_KEY = "leave-me-alone-farkle-difficulty";
  const THEME_KEY = "leave-me-alone-games-theme";
  const SAVE_VERSION = 1;
  const TARGET_SCORE = 5000;
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange"]);
  const MODES = new Set(["computer", "two-player"]);
  const DIFFICULTIES = new Set(["easy", "medium", "hard"]);

  const els = {
    dice: document.getElementById("dice"),
    status: document.getElementById("status"),
    score: document.getElementById("score"),
    turnPoints: document.getElementById("turn-points"),
    roll: document.getElementById("roll"),
    bank: document.getElementById("bank"),
    undo: document.getElementById("undo"),
    newGame: document.getElementById("new-game"),
    difficulty: document.getElementById("difficulty"),
    mode: document.getElementById("game-mode")
  };

  let state = null;
  let undoSnapshot = null;

  function t(key, values) {
    return window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key;
  }

  function clone(source) {
    return JSON.parse(JSON.stringify(source));
  }

  function storedMode() {
    try {
      const mode = localStorage.getItem(MODE_KEY);
      return MODES.has(mode) ? mode : "computer";
    } catch {
      return "computer";
    }
  }

  function storedDifficulty() {
    try {
      const difficulty = localStorage.getItem(DIFFICULTY_KEY);
      return DIFFICULTIES.has(difficulty) ? difficulty : "easy";
    } catch {
      return "easy";
    }
  }

  function isTwoPlayer() {
    return storedMode() === "two-player";
  }

  function applyTheme() {
    try {
      const theme = localStorage.getItem(THEME_KEY);
      document.body.dataset.theme = THEMES.has(theme) ? theme : "colorblind";
    } catch {
      document.body.dataset.theme = "colorblind";
    }
  }

  function rollDie() {
    return Math.floor(Math.random() * 6) + 1;
  }

  function freshState() {
    return {
      version: SAVE_VERSION,
      scores: { p1: 0, p2: 0 },
      turn: "p1",
      dice: [],
      selected: [],
      turnPoints: 0,
      rolled: false,
      winner: null,
      message: ""
    };
  }

  function saveState() {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadState() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
      if (!saved || saved.version !== SAVE_VERSION || !saved.scores) return null;
      return saved;
    } catch {
      return null;
    }
  }

  function rememberUndo() {
    undoSnapshot = clone(state);
    els.undo.disabled = false;
  }

  function countsFor(values) {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    values.forEach((value) => { counts[value] += 1; });
    return counts;
  }

  function isStraight(counts) {
    return counts.slice(1).every((count) => count === 1);
  }

  function isThreePairs(counts) {
    return counts.filter((count) => count === 2).length === 3;
  }

  function scoreDice(values) {
    if (!values.length) return { score: 0, valid: false };
    const counts = countsFor(values);
    if (values.length === 6 && (isStraight(counts) || isThreePairs(counts))) {
      return { score: 1500, valid: true };
    }
    let score = 0;
    for (let face = 1; face <= 6; face += 1) {
      if (counts[face] >= 3) {
        score += face === 1 ? 1000 : face * 100;
        counts[face] -= 3;
      }
    }
    score += counts[1] * 100;
    counts[1] = 0;
    score += counts[5] * 50;
    counts[5] = 0;
    const valid = score > 0 && counts.every((count) => count === 0);
    return { score, valid };
  }

  function hasScoringMove(values) {
    const counts = countsFor(values);
    if (values.length === 6 && (isStraight(counts) || isThreePairs(counts))) return true;
    return counts[1] > 0 || counts[5] > 0 || counts.some((count) => count >= 3);
  }

  function currentSelectedValues() {
    return state.selected.map((index) => state.dice[index]);
  }

  function selectedScore() {
    return scoreDice(currentSelectedValues());
  }

  function nextTurn() {
    state.turn = state.turn === "p1" ? "p2" : "p1";
    state.dice = [];
    state.selected = [];
    state.turnPoints = 0;
    state.rolled = false;
  }

  function currentName() {
    if (isTwoPlayer()) return t(state.turn === "p1" ? "player1" : "player2");
    return state.turn === "p1" ? t("player1") : t("computer");
  }

  function setWinnerIfNeeded() {
    if (state.scores.p1 >= TARGET_SCORE || state.scores.p2 >= TARGET_SCORE) {
      state.winner = state.scores.p1 >= state.scores.p2 ? "p1" : "p2";
    }
  }

  function rollDice() {
    if (state.winner) return;
    const selected = selectedScore();
    if (state.rolled && !selected.valid) return;
    rememberUndo();
    if (selected.valid) {
      state.turnPoints += selected.score;
      const remaining = state.dice.filter((_, index) => !state.selected.includes(index));
      state.dice = remaining.length ? remaining.map(() => rollDie()) : Array.from({ length: 6 }, rollDie);
    } else {
      state.dice = Array.from({ length: 6 }, rollDie);
    }
    state.selected = [];
    state.rolled = true;
    if (!hasScoringMove(state.dice)) {
      state.message = t("farkle");
      state.turnPoints = 0;
      nextTurn();
    } else {
      state.message = "";
    }
    render();
    maybeComputerTurn();
  }

  function bankPoints() {
    if (state.winner) return;
    const selected = selectedScore();
    const total = state.turnPoints + (selected.valid ? selected.score : 0);
    if (total <= 0) return;
    rememberUndo();
    state.scores[state.turn] += total;
    setWinnerIfNeeded();
    state.message = "";
    if (!state.winner) nextTurn();
    render();
    maybeComputerTurn();
  }

  function toggleDie(index) {
    if (state.winner || !state.rolled || state.turn === "p2" && !isTwoPlayer()) return;
    const position = state.selected.indexOf(index);
    if (position >= 0) state.selected.splice(position, 1);
    else state.selected.push(index);
    render();
  }

  function bestComputerSelection(values) {
    const all = [];
    const max = 1 << values.length;
    for (let mask = 1; mask < max; mask += 1) {
      const indexes = [];
      const picked = [];
      for (let i = 0; i < values.length; i += 1) {
        if (mask & (1 << i)) {
          indexes.push(i);
          picked.push(values[i]);
        }
      }
      const result = scoreDice(picked);
      if (result.valid) all.push({ indexes, score: result.score });
    }
    all.sort((a, b) => b.score - a.score || b.indexes.length - a.indexes.length);
    return all[0] || null;
  }

  function computerShouldBank() {
    const difficulty = storedDifficulty();
    const total = state.scores.p2 + state.turnPoints;
    if (total >= TARGET_SCORE) return true;
    if (difficulty === "easy") return state.turnPoints >= 350;
    if (difficulty === "medium") return state.turnPoints >= 650;
    return state.turnPoints >= 1000 || state.scores.p2 + state.turnPoints >= state.scores.p1 + 900;
  }

  function computerStep() {
    if (isTwoPlayer() || state.winner || state.turn !== "p2") return;
    if (!state.rolled) {
      rollDice();
      return;
    }
    const best = bestComputerSelection(state.dice);
    if (!best) {
      state.message = t("farkle");
      state.turnPoints = 0;
      nextTurn();
      render();
      return;
    }
    state.selected = best.indexes;
    state.turnPoints += best.score;
    const remaining = state.dice.filter((_, index) => !state.selected.includes(index));
    state.dice = remaining.length ? remaining : [];
    state.selected = [];
    if (computerShouldBank()) {
      state.scores.p2 += state.turnPoints;
      setWinnerIfNeeded();
      if (!state.winner) nextTurn();
      render();
      return;
    }
    state.dice = remaining.length ? remaining.map(() => rollDie()) : Array.from({ length: 6 }, rollDie);
    state.rolled = true;
    if (!hasScoringMove(state.dice)) {
      state.message = t("farkle");
      state.turnPoints = 0;
      nextTurn();
      render();
      return;
    }
    render();
    window.setTimeout(computerStep, 300);
  }

  function maybeComputerTurn() {
    if (!isTwoPlayer() && state.turn === "p2" && !state.winner) {
      window.setTimeout(computerStep, 350);
    }
  }

  function statusText() {
    if (state.winner) {
      if (isTwoPlayer()) return t(state.winner === "p1" ? "player1Won" : "player2Won");
      return state.winner === "p1" ? t("youWon") : t("computerWon");
    }
    if (state.message) return state.message;
    return t("diceTurn", { player: currentName() });
  }

  function render() {
    els.dice.innerHTML = "";
    state.dice.forEach((value, index) => {
      const die = document.createElement("button");
      die.type = "button";
      die.className = "die";
      if (state.selected.includes(index)) die.classList.add("selected");
      die.textContent = String(value);
      die.setAttribute("aria-label", t("dieValue", { value }));
      die.addEventListener("click", () => toggleDie(index));
      els.dice.appendChild(die);
    });
    const selected = selectedScore();
    els.status.textContent = statusText();
    els.score.textContent = `${t("player1")}: ${state.scores.p1} · ${isTwoPlayer() ? t("player2") : t("computer")}: ${state.scores.p2}`;
    els.turnPoints.textContent = `${t("turnPoints")}: ${state.turnPoints + (selected.valid ? selected.score : 0)} / ${TARGET_SCORE}`;
    els.roll.disabled = Boolean(state.winner) || (!isTwoPlayer() && state.turn === "p2") || (state.rolled && !selected.valid);
    els.bank.disabled = Boolean(state.winner) || (!isTwoPlayer() && state.turn === "p2") || state.turnPoints + (selected.valid ? selected.score : 0) <= 0;
    if (els.difficulty) els.difficulty.disabled = isTwoPlayer();
    saveState();
  }

  function startNewGame() {
    state = freshState();
    undoSnapshot = null;
    els.undo.disabled = true;
    render();
  }

  function saveMode() {
    try {
      localStorage.setItem(MODE_KEY, MODES.has(els.mode.value) ? els.mode.value : "computer");
    } catch {}
    startNewGame();
  }

  function saveDifficulty() {
    try {
      localStorage.setItem(DIFFICULTY_KEY, DIFFICULTIES.has(els.difficulty.value) ? els.difficulty.value : "easy");
    } catch {}
  }

  els.roll.addEventListener("click", rollDice);
  els.bank.addEventListener("click", bankPoints);
  els.newGame.addEventListener("click", startNewGame);
  els.undo.addEventListener("click", () => {
    if (!undoSnapshot) return;
    state = clone(undoSnapshot);
    undoSnapshot = null;
    els.undo.disabled = true;
    render();
  });
  els.mode.addEventListener("change", saveMode);
  els.difficulty.addEventListener("change", saveDifficulty);

  applyTheme();
  if (els.mode) els.mode.value = storedMode();
  if (els.difficulty) els.difficulty.value = storedDifficulty();
  state = loadState() || freshState();
  render();
  maybeComputerTurn();
})();
