(function () {
  "use strict";
  try {
    localStorage.setItem("leave-me-alone-games-last-game", JSON.stringify({ id: "tic-tac-toe", href: "games/tic-tac-toe/index.html", title: document.querySelector("h1")?.textContent?.trim() || "tic-tac-toe", playedAt: Date.now() }));
  } catch {}
  const STORAGE_KEY = "leave-me-alone-tic-tac-toe-current-game";
  const MODE_KEY = "leave-me-alone-tic-tac-toe-mode";
  const DIFFICULTY_KEY = "leave-me-alone-tic-tac-toe-difficulty";
  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const WIN_LINES = [[0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6]];
  const MODES = new Set(["computer", "two-player"]);
  const DIFFICULTIES = new Set(["easy", "medium", "hard"]);
  const els = { board: document.getElementById("board"), status: document.getElementById("status"), undo: document.getElementById("undo"), newGame: document.getElementById("new-game"), mode: document.getElementById("game-mode"), difficulty: document.getElementById("difficulty") };
  let state = null, undoSnapshot = null, lastTapAt = 0;
  function t(key, values) { return window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key; }
  function storedMode() { try { const mode = localStorage.getItem(MODE_KEY); return MODES.has(mode) ? mode : "computer"; } catch { return "computer"; } }
  function storedDifficulty() { try { const difficulty = localStorage.getItem(DIFFICULTY_KEY); return DIFFICULTIES.has(difficulty) ? difficulty : "medium"; } catch { return "medium"; } }
  function isTwoPlayer() { return storedMode() === "two-player"; }
  function applyMode() { if (els.mode) els.mode.value = storedMode(); if (els.difficulty) els.difficulty.disabled = isTwoPlayer(); }
  function applyDifficulty() { if (els.difficulty) els.difficulty.value = storedDifficulty(); }
  function saveMode() { if (!els.mode) return; try { localStorage.setItem(MODE_KEY, MODES.has(els.mode.value) ? els.mode.value : "computer"); } catch {} applyMode(); startNewGame(); }
  function saveDifficulty() { if (!els.difficulty) return; try { localStorage.setItem(DIFFICULTY_KEY, DIFFICULTIES.has(els.difficulty.value) ? els.difficulty.value : "medium"); } catch {} startNewGame(); }
  function applyTheme() { try { const theme = localStorage.getItem(THEME_KEY); document.body.dataset.theme = THEMES.has(theme) ? theme : "colorblind"; } catch { document.body.dataset.theme = "colorblind"; } }
  function freshState() { return { board: Array(9).fill(""), turn: "x", winner: null, winningLine: [] }; }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function loadState() { try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); return Array.isArray(saved?.board) && saved.board.length === 9 ? saved : null; } catch { return null; } }
  function winnerFor(board) {
    for (const line of WIN_LINES) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) return { winner: board[a], line };
    }
    return board.every(Boolean) ? { winner: "draw", line: [] } : { winner: null, line: [] };
  }
  function emptyCells(board) { return board.map((cell, index) => cell ? -1 : index).filter((index) => index >= 0); }
  function moveWins(board, mark, index) { const test = board.slice(); test[index] = mark; return winnerFor(test).winner === mark; }
  function mediumComputerMove() {
    const cells = emptyCells(state.board);
    if (!cells.length) return -1;
    const win = cells.find((index) => moveWins(state.board, "o", index));
    if (win !== undefined) return win;
    const shouldBlock = Math.random() < 0.72;
    if (shouldBlock) {
      const block = cells.find((index) => moveWins(state.board, "x", index));
      if (block !== undefined) return block;
    }
    if (!state.board[4] && Math.random() < 0.7) return 4;
    const corners = [0, 2, 6, 8].filter((index) => !state.board[index]);
    if (corners.length && Math.random() < 0.65) return corners[Math.floor(Math.random() * corners.length)];
    return cells[Math.floor(Math.random() * cells.length)];
  }
  function minimax(board, turn, depth) {
    const result = winnerFor(board).winner;
    if (result === "o") return 10 - depth;
    if (result === "x") return depth - 10;
    if (result === "draw") return 0;
    const scores = emptyCells(board).map((index) => {
      const next = board.slice();
      next[index] = turn;
      return minimax(next, turn === "o" ? "x" : "o", depth + 1);
    });
    return turn === "o" ? Math.max(...scores) : Math.min(...scores);
  }
  function hardComputerMove() {
    const cells = emptyCells(state.board);
    if (!cells.length) return -1;
    const ranked = cells.map((index) => {
      const next = state.board.slice();
      next[index] = "o";
      return { index, score: minimax(next, "x", 0) };
    });
    const best = Math.max(...ranked.map((item) => item.score));
    const equallyBest = ranked.filter((item) => item.score === best);
    return equallyBest[Math.floor(Math.random() * equallyBest.length)].index;
  }
  function chooseComputerMove() {
    const cells = emptyCells(state.board);
    if (!cells.length) return -1;
    const difficulty = storedDifficulty();
    if (difficulty === "easy") return cells[Math.floor(Math.random() * cells.length)];
    if (difficulty === "hard") return hardComputerMove();
    return mediumComputerMove();
  }
  function updateWinner() {
    const result = winnerFor(state.board);
    state.winner = result.winner;
    state.winningLine = result.line;
  }
  function computerMove() {
    if (isTwoPlayer() || state.winner || state.turn !== "o") return;
    const index = chooseComputerMove();
    if (index >= 0) state.board[index] = "o";
    updateWinner();
    state.turn = "x";
    render();
  }
  function onCellClick(event) {
    const index = Number(event.currentTarget.dataset.index);
    if (state.winner || (!isTwoPlayer() && state.turn !== "x") || state.board[index]) return;
    undoSnapshot = clone(state);
    els.undo.disabled = false;
    state.board[index] = state.turn;
    updateWinner();
    if (!state.winner) { state.turn = state.turn === "x" ? "o" : "x"; render(); if (!isTwoPlayer()) window.setTimeout(computerMove, 240); return; }
    render();
  }
  function statusText() {
    if (state.winner === "x") return isTwoPlayer() ? t("xWon") : t("youWon");
    if (state.winner === "o") return isTwoPlayer() ? t("oWon") : t("computerWon");
    if (state.winner === "draw") return t("draw");
    return isTwoPlayer() ? t(state.turn === "x" ? "xTurn" : "oTurn") : t("ticTacToePrompt");
  }
  function render() {
    els.board.innerHTML = "";
    const winSet = new Set(state.winningLine || []);
    state.board.forEach((mark, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `cell ${mark}${winSet.has(index) ? " win" : ""}`;
      button.dataset.index = String(index);
      button.textContent = mark.toUpperCase();
      button.disabled = Boolean(mark) || (!isTwoPlayer() && state.turn !== "x") || Boolean(state.winner);
      button.setAttribute("aria-label", t("ticTacToeCell", { cell: index + 1 }));
      button.addEventListener("click", onCellClick);
      els.board.appendChild(button);
    });
    els.status.textContent = statusText();
    saveState();
  }
  function startNewGame() { state = freshState(); undoSnapshot = null; els.undo.disabled = true; render(); }
  function undo() { if (!undoSnapshot) return; state = clone(undoSnapshot); undoSnapshot = null; els.undo.disabled = true; render(); }
  function preventBrowserDoubleClick(event) { const now = Date.now(); if (now - lastTapAt < 420) event.preventDefault(); lastTapAt = now; }
  function preventViewportMove(event) { event.preventDefault(); }
  function preventGestureZoom(event) { event.preventDefault(); }
  function applyLanguage() { if (window.LMAG_I18N) window.LMAG_I18N.apply(document); render(); }
  function registerServiceWorker() { if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("../../sw.js").catch(() => {})); }
  els.newGame.addEventListener("click", startNewGame); els.undo.addEventListener("click", undo); if (els.mode) els.mode.addEventListener("change", saveMode); if (els.difficulty) els.difficulty.addEventListener("change", saveDifficulty);
  document.addEventListener("contextmenu", (event) => event.preventDefault()); document.addEventListener("dblclick", preventBrowserDoubleClick, { capture: true }); document.addEventListener("dragstart", (event) => event.preventDefault()); document.addEventListener("touchmove", preventViewportMove, { passive: false }); document.addEventListener("gesturestart", preventGestureZoom); document.addEventListener("gesturechange", preventGestureZoom); document.addEventListener("gestureend", preventGestureZoom); document.addEventListener("lmag:languagechange", applyLanguage);
  applyTheme(); applyDifficulty(); applyMode(); state = loadState() || freshState(); render(); registerServiceWorker();
})();
