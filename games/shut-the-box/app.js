(function () {
  "use strict";
  try {
    localStorage.setItem("leave-me-alone-games-last-game", JSON.stringify({ id: "shut-the-box", href: "games/shut-the-box/index.html", title: document.querySelector("h1")?.textContent?.trim() || "shut-the-box", playedAt: Date.now() }));
  } catch {}

  const STORAGE_KEY = "leave-me-alone-shut-the-box-current-game";
  const MODE_KEY = "leave-me-alone-shut-the-box-mode";
  const DIFFICULTY_KEY = "leave-me-alone-shut-the-box-difficulty";
  const THEME_KEY = "leave-me-alone-games-theme";
  const SAVE_VERSION = 2;
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const MODES = new Set(["computer", "two-player"]);
  const DIFFICULTIES = new Set(["easy", "medium", "hard"]);

  const els = {
    tiles: document.getElementById("tiles"),
    status: document.getElementById("status"),
    score: document.getElementById("score"),
    dice: document.getElementById("dice"),
    log: document.getElementById("turn-log"),
    roll: document.getElementById("roll"),
    shut: document.getElementById("shut"),
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

  function freshBoard(turn = "p1", roundScores = { p1: null, p2: null }, log = []) {
    return {
      version: SAVE_VERSION,
      turn,
      roundScores,
      open: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      selected: [],
      dice: [],
      rolled: false,
      winner: null,
      message: "",
      log
    };
  }

  function addLog(message) {
    if (!message) return;
    state.log = [message, ...(state.log || [])].slice(0, 5);
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || saved.version !== SAVE_VERSION || !Array.isArray(saved.open)) return null;
      return saved;
    } catch {
      return null;
    }
  }

  function rememberUndo() {
    undoSnapshot = clone(state);
    els.undo.disabled = false;
  }

  function diceTotal() {
    return state.dice.reduce((sum, value) => sum + value, 0);
  }

  function selectedTotal() {
    return state.selected.reduce((sum, value) => sum + value, 0);
  }

  function openTotal() {
    return state.open.reduce((sum, value) => sum + value, 0);
  }

  function combinations(values, target) {
    const results = [];
    const walk = (index, current, sum) => {
      if (sum === target) {
        results.push(current.slice());
        return;
      }
      if (sum > target || index >= values.length) return;
      for (let i = index; i < values.length; i += 1) {
        current.push(values[i]);
        walk(i + 1, current, sum + values[i]);
        current.pop();
      }
    };
    walk(0, [], 0);
    return results;
  }

  function availableMoves() {
    return state.rolled ? combinations(state.open, diceTotal()) : [];
  }

  function chooseComputerMove(moves) {
    const difficulty = storedDifficulty();
    if (difficulty === "easy") return moves[Math.floor(Math.random() * moves.length)];
    const scored = moves.map((move) => {
      const remaining = state.open.filter((tile) => !move.includes(tile));
      let future = 0;
      for (let a = 1; a <= 6; a += 1) {
        for (let b = 1; b <= 6; b += 1) {
          if (combinations(remaining, a + b).length) future += 1;
        }
      }
      return {
        move,
        score: (difficulty === "hard" ? future * 3 : future) - remaining.reduce((sum, value) => sum + value, 0)
      };
    }).sort((a, b) => b.score - a.score);
    return scored[0].move;
  }

  function finishRound() {
    const score = openTotal();
    addLog(t("shutTheBoxRoundEnded", { player: currentName(), score }));
    state.roundScores[state.turn] = score;
    if (state.turn === "p1") {
      state = freshBoard("p2", state.roundScores, state.log || []);
    } else {
      if (state.roundScores.p1 < state.roundScores.p2) state.winner = "p1";
      else if (state.roundScores.p2 < state.roundScores.p1) state.winner = "p2";
      else state.winner = "draw";
      state.message = "";
    }
  }

  function rollDice() {
    if (state.winner || state.rolled) return;
    rememberUndo();
    state.dice = [rollDie(), rollDie()];
    state.rolled = true;
    state.selected = [];
    addLog(t("shutTheBoxRolled", { player: currentName(), dice: state.dice.join(" + ") }));
    const moves = availableMoves();
    if (!moves.length) {
      state.message = t("noMovesForRoll");
      addLog(t("shutTheBoxNoMove", { player: currentName(), dice: diceTotal() }));
      finishRound();
    } else {
      state.message = "";
    }
    render();
    maybeComputerTurn();
  }

  function shutSelected() {
    if (state.winner || !state.rolled || selectedTotal() !== diceTotal()) return;
    rememberUndo();
    addLog(t("shutTheBoxClosed", { player: currentName(), tiles: state.selected.join(" + ") }));
    state.open = state.open.filter((tile) => !state.selected.includes(tile));
    state.selected = [];
    state.dice = [];
    state.rolled = false;
    if (!state.open.length) finishRound();
    render();
    maybeComputerTurn();
  }

  function toggleTile(tile) {
    if (state.winner || !state.rolled || state.turn === "p2" && !isTwoPlayer() || !state.open.includes(tile)) return;
    const position = state.selected.indexOf(tile);
    if (position >= 0) state.selected.splice(position, 1);
    else state.selected.push(tile);
    render();
  }

  function computerStep() {
    if (isTwoPlayer() || state.winner || state.turn !== "p2") return;
    if (!state.rolled) {
      rollDice();
      return;
    }
    const moves = availableMoves();
    if (!moves.length) {
      finishRound();
      render();
      return;
    }
    state.selected = chooseComputerMove(moves);
    addLog(t("shutTheBoxComputerChose", { tiles: state.selected.join(" + ") }));
    render();
    window.setTimeout(() => {
      if (state.turn === "p2" && !state.winner) shutSelected();
    }, 750);
  }

  function maybeComputerTurn() {
    if (!isTwoPlayer() && state.turn === "p2" && !state.winner) {
      window.setTimeout(computerStep, 700);
    }
  }

  function currentName() {
    if (isTwoPlayer()) return t(state.turn === "p1" ? "player1" : "player2");
    return state.turn === "p1" ? t("player1") : t("computer");
  }

  function statusText() {
    if (state.winner === "draw") return t("tieGame");
    if (state.winner) {
      if (isTwoPlayer()) return t(state.winner === "p1" ? "player1Won" : "player2Won");
      return state.winner === "p1" ? t("youWon") : t("computerWon");
    }
    if (state.message) return state.message;
    return state.rolled ? t("shutTiles") : t("diceTurn", { player: currentName() });
  }

  function render() {
    els.tiles.innerHTML = "";
    for (let tile = 1; tile <= 9; tile += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tile";
      if (!state.open.includes(tile)) button.classList.add("closed");
      if (state.selected.includes(tile)) button.classList.add("selected");
      button.textContent = String(tile);
      button.disabled = !state.open.includes(tile) || Boolean(state.winner);
      button.addEventListener("click", () => toggleTile(tile));
      els.tiles.appendChild(button);
    }
    els.status.textContent = statusText();
    els.score.textContent = `${t("player1")}: ${state.roundScores.p1 ?? "—"} · ${isTwoPlayer() ? t("player2") : t("computer")}: ${state.roundScores.p2 ?? "—"} · ${t("openTotal")}: ${openTotal()}`;
    els.dice.textContent = state.dice.length ? t("diceShowing", { dice: state.dice.join(" + ") }) : t("rollDicePrompt");
    if (els.log) {
      els.log.innerHTML = "";
      (state.log?.length ? state.log : [t("shutTheBoxLogHint")]).forEach((message) => {
        const row = document.createElement("div");
        row.textContent = message;
        els.log.appendChild(row);
      });
    }
    els.roll.disabled = Boolean(state.winner) || state.rolled || (!isTwoPlayer() && state.turn === "p2");
    els.shut.disabled = Boolean(state.winner) || !state.rolled || selectedTotal() !== diceTotal() || (!isTwoPlayer() && state.turn === "p2");
    if (els.difficulty) els.difficulty.disabled = isTwoPlayer();
    saveState();
  }

  function startNewGame() {
    state = freshBoard();
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
  els.shut.addEventListener("click", shutSelected);
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
  state = loadState() || freshBoard();
  render();
  maybeComputerTurn();
})();
