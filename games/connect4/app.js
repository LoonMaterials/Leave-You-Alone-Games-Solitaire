(function () {
  "use strict";
  try {
    localStorage.setItem("leave-me-alone-games-last-game", JSON.stringify({ id: "connect4", href: "games/connect4/index.html", title: document.querySelector("h1")?.textContent?.trim() || "connect4", playedAt: Date.now() }));
  } catch {}
  const STORAGE_KEY = "leave-me-alone-connect4-current-game";
  const DIFFICULTY_KEY = "leave-me-alone-connect4-difficulty";
  const MODE_KEY = "leave-me-alone-connect4-mode";
  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const DIFFICULTIES = new Set(["easy", "medium", "hard"]);
  const MODES = new Set(["computer", "two-player"]);
  const ROWS = 6, COLS = 7;
  const els = { board: document.getElementById("board"), status: document.getElementById("status"), undo: document.getElementById("undo"), newGame: document.getElementById("new-game"), difficulty: document.getElementById("difficulty"), mode: document.getElementById("game-mode") };
  let state = null, undoSnapshot = null, lastTapAt = 0;
  function t(key, values) { return window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key; }
  function storedDifficulty() { try { const difficulty = localStorage.getItem(DIFFICULTY_KEY); return DIFFICULTIES.has(difficulty) ? difficulty : "easy"; } catch { return "easy"; } }
  function storedMode() { try { const mode = localStorage.getItem(MODE_KEY); return MODES.has(mode) ? mode : "computer"; } catch { return "computer"; } }
  function isTwoPlayer() { return storedMode() === "two-player"; }
  function applyDifficulty() { if (els.difficulty) els.difficulty.value = storedDifficulty(); }
  function saveDifficulty() { if (!els.difficulty) return; try { localStorage.setItem(DIFFICULTY_KEY, DIFFICULTIES.has(els.difficulty.value) ? els.difficulty.value : "easy"); } catch {} }
  function applyMode() { if (els.mode) els.mode.value = storedMode(); if (els.difficulty) els.difficulty.disabled = isTwoPlayer(); }
  function saveMode() { if (!els.mode) return; try { localStorage.setItem(MODE_KEY, MODES.has(els.mode.value) ? els.mode.value : "computer"); } catch {} applyMode(); startNewGame(); }
  function applyTheme() { try { const theme = localStorage.getItem(THEME_KEY); document.body.dataset.theme = THEMES.has(theme) ? theme : "colorblind"; } catch { document.body.dataset.theme = "colorblind"; } }
  function freshState() { return { board: Array.from({ length: ROWS }, () => Array(COLS).fill(null)), turn: "r", winner: null }; }
  function clone(source) { return JSON.parse(JSON.stringify(source)); }
  function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function loadState() { try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); return saved?.board?.length === ROWS ? saved : null; } catch { return null; } }
  function openRowFor(board, col) { for (let row = ROWS - 1; row >= 0; row -= 1) if (!board[row][col]) return row; return -1; }
  function openRow(col) { return openRowFor(state.board, col); }
  function legalColsFor(board) { return Array.from({ length: COLS }, (_, col) => col).filter(col => openRowFor(board, col) >= 0); }
  function legalCols() { return legalColsFor(state.board); }
  function winnerFor(board) {
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (let row = 0; row < ROWS; row += 1) for (let col = 0; col < COLS; col += 1) {
      const cell = board[row][col]; if (!cell) continue;
      for (const [dr, dc] of dirs) {
        let count = 1;
        for (let step = 1; step < 4; step += 1) if (board[row + dr * step]?.[col + dc * step] === cell) count += 1;
        if (count === 4) return cell;
      }
    }
    return board.flat().every(Boolean) ? "draw" : null;
  }
  function drop(col, color) {
    const row = openRow(col);
    if (row < 0) return false;
    state.board[row][col] = color;
    state.winner = winnerFor(state.board);
    state.turn = color === "r" ? "y" : "r";
    return true;
  }
  function simulateDrop(board, col, color) {
    const next = clone(board);
    const row = openRowFor(next, col);
    if (row >= 0) next[row][col] = color;
    return next;
  }
  function firstWinningCol(board, color) {
    return legalColsFor(board).find((col) => winnerFor(simulateDrop(board, col, color)) === color);
  }
  function scoreWindow(cells) {
    const yellow = cells.filter((cell) => cell === "y").length;
    const red = cells.filter((cell) => cell === "r").length;
    const empty = cells.filter((cell) => !cell).length;
    if (yellow && red) return 0;
    if (yellow === 4) return 100000;
    if (red === 4) return -100000;
    if (yellow === 3 && empty === 1) return 85;
    if (yellow === 2 && empty === 2) return 18;
    if (red === 3 && empty === 1) return -95;
    if (red === 2 && empty === 2) return -22;
    return 0;
  }
  function evaluateBoard(board) {
    let score = board.map((row) => row[3]).filter((cell) => cell === "y").length * 8;
    const dirs = [[0,1], [1,0], [1,1], [1,-1]];
    for (let row = 0; row < ROWS; row += 1) for (let col = 0; col < COLS; col += 1) for (const [dr, dc] of dirs) {
      const cells = [];
      for (let step = 0; step < 4; step += 1) cells.push(board[row + dr * step]?.[col + dc * step]);
      if (cells.every((cell) => cell !== undefined)) score += scoreWindow(cells);
    }
    return score;
  }
  function mediumCol(cols) {
    const scored = cols.map((col) => ({ col, score: evaluateBoard(simulateDrop(state.board, col, "y")) + (Math.random() * 4) }));
    scored.sort((a, b) => b.score - a.score);
    return scored[0].col;
  }
  function minimax(board, depth, maximizing, alpha, beta) {
    const winner = winnerFor(board);
    if (winner === "y") return 100000 + depth;
    if (winner === "r") return -100000 - depth;
    if (winner === "draw" || depth === 0) return evaluateBoard(board);
    const cols = legalColsFor(board);
    if (maximizing) {
      let value = -Infinity;
      for (const col of cols) {
        value = Math.max(value, minimax(simulateDrop(board, col, "y"), depth - 1, false, alpha, beta));
        alpha = Math.max(alpha, value);
        if (alpha >= beta) break;
      }
      return value;
    }
    let value = Infinity;
    for (const col of cols) {
      value = Math.min(value, minimax(simulateDrop(board, col, "r"), depth - 1, true, alpha, beta));
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return value;
  }
  function hardCol(cols) {
    const scored = cols.map((col) => ({ col, score: minimax(simulateDrop(state.board, col, "y"), 4, false, -Infinity, Infinity) + (Math.random() * 2) }));
    scored.sort((a, b) => b.score - a.score);
    return scored[0].col;
  }
  function bestComputerCol() {
    const cols = legalCols();
    if (!cols.length) return -1;
    const winning = firstWinningCol(state.board, "y");
    if (winning !== undefined) return winning;
    const blocking = firstWinningCol(state.board, "r");
    if (blocking !== undefined && storedDifficulty() !== "easy") return blocking;
    if (storedDifficulty() === "hard") return hardCol(cols);
    if (storedDifficulty() === "medium") return mediumCol(cols);
    return cols[Math.floor(Math.random() * cols.length)];
  }
  function computerMove() { if (isTwoPlayer() || state.winner || state.turn !== "y") return; drop(bestComputerCol(), "y"); render(); }
  function rememberUndo() { undoSnapshot = clone(state); els.undo.disabled = false; }
  function render() {
    els.board.innerHTML = "";
    for (let row = 0; row < ROWS; row += 1) for (let col = 0; col < COLS; col += 1) {
      const button = document.createElement("button");
      button.type = "button"; button.className = `cell ${state.board[row][col] === "r" ? "red" : state.board[row][col] === "y" ? "yellow" : ""}`;
      button.dataset.col = String(col); button.setAttribute("aria-label", t("connect4Column", { col: col + 1 }));
      button.disabled = (!isTwoPlayer() && state.turn !== "r") || state.winner || openRow(col) < 0;
      button.addEventListener("click", onColumnClick);
      els.board.appendChild(button);
    }
    els.status.textContent = state.winner ? (state.winner === "draw" ? t("draw") : isTwoPlayer() ? t(state.winner === "r" ? "redWon" : "yellowWon") : t(state.winner === "r" ? "youWon" : "computerWon")) : isTwoPlayer() ? t(state.turn === "r" ? "redTurn" : "yellowTurn") : t("yourTurn");
    saveState();
  }
  function onColumnClick(event) { if ((!isTwoPlayer() && state.turn !== "r") || state.winner) return; rememberUndo(); if (drop(Number(event.currentTarget.dataset.col), state.turn)) { render(); if (!isTwoPlayer()) window.setTimeout(computerMove, 300); } }
  function startNewGame() { state = freshState(); undoSnapshot = null; els.undo.disabled = true; render(); }
  function undo() { if (!undoSnapshot) return; state = clone(undoSnapshot); undoSnapshot = null; els.undo.disabled = true; render(); }
  function preventBrowserDoubleClick(event) { const now = Date.now(); if (now - lastTapAt < 420) event.preventDefault(); lastTapAt = now; }
  function preventViewportMove(event) { event.preventDefault(); }
  function preventGestureZoom(event) { event.preventDefault(); }
  function applyLanguage() { if (window.LMAG_I18N) window.LMAG_I18N.apply(document); render(); }
  function registerServiceWorker() { if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("../../sw.js").catch(() => {})); }
  els.newGame.addEventListener("click", startNewGame); els.undo.addEventListener("click", undo); if (els.difficulty) els.difficulty.addEventListener("change", saveDifficulty); if (els.mode) els.mode.addEventListener("change", saveMode);
  document.addEventListener("contextmenu", e => e.preventDefault()); document.addEventListener("dblclick", preventBrowserDoubleClick, { capture: true }); document.addEventListener("dragstart", e => e.preventDefault()); document.addEventListener("touchmove", preventViewportMove, { passive: false }); document.addEventListener("gesturestart", preventGestureZoom); document.addEventListener("gesturechange", preventGestureZoom); document.addEventListener("gestureend", preventGestureZoom); document.addEventListener("lmag:languagechange", applyLanguage);
  applyTheme(); applyDifficulty(); applyMode(); state = loadState() || freshState(); render(); registerServiceWorker();
})();
