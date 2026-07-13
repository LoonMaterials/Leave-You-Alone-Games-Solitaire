(function () {
  "use strict";
  const STORAGE_KEY = "leave-me-alone-lights-out-current-game";
  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const SAVE_VERSION = 2;
  const SIZES = [4, 5, 6];
  const DEFAULT_SIZE = 5;
  const els = { board: document.getElementById("board"), status: document.getElementById("status"), undo: document.getElementById("undo"), newGame: document.getElementById("new-game") };
  let state = null, undoSnapshot = null, lastTapAt = 0;
  function t(key, values) { return window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key; }
  function applyTheme() { try { const theme = localStorage.getItem(THEME_KEY); document.body.dataset.theme = THEMES.has(theme) ? theme : "colorblind"; } catch { document.body.dataset.theme = "colorblind"; } }
  function emptyBoard(size = DEFAULT_SIZE) { return Array.from({ length: size }, () => Array(size).fill(false)); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function saveState() { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function isValidSave(saved) {
    const size = saved?.size;
    return saved?.version === SAVE_VERSION && SIZES.includes(size) && saved?.board?.length === size && saved.board.every((row) => Array.isArray(row) && row.length === size);
  }
  function loadState() { try { const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY)); return isValidSave(saved) ? saved : null; } catch { return null; } }
  function flipOn(board, row, col) { [[0,0], [1,0], [-1,0], [0,1], [0,-1]].forEach(([dr, dc]) => { const r = row + dr, c = col + dc; if (board[r]?.[c] !== undefined) board[r][c] = !board[r][c]; }); }
  function freshState() {
    const size = SIZES[Math.floor(Math.random() * SIZES.length)];
    const board = emptyBoard(size);
    const scrambleMoves = Math.max(8, Math.floor(size * size * 0.55)) + Math.floor(Math.random() * Math.max(4, size * size));
    for (let i = 0; i < scrambleMoves; i += 1) flipOn(board, Math.floor(Math.random() * size), Math.floor(Math.random() * size));
    if (!board.flat().some(Boolean)) flipOn(board, Math.floor(size / 2), Math.floor(size / 2));
    return { version: SAVE_VERSION, size, board, moves: 0, solved: false };
  }
  function isSolved(board) { return board.flat().every((light) => !light); }
  function press(row, col) {
    if (state.solved) return;
    undoSnapshot = clone(state); els.undo.disabled = false;
    flipOn(state.board, row, col);
    state.moves += 1;
    state.solved = isSolved(state.board);
    render();
  }
  function render() {
    els.board.innerHTML = "";
    els.board.style.setProperty("--lights-size", String(state.size || DEFAULT_SIZE));
    state.board.forEach((row, r) => row.forEach((on, c) => {
      const button = document.createElement("button");
      button.type = "button"; button.className = `light${on ? " on" : ""}`;
      button.setAttribute("aria-label", t("puzzleCell", { row: r + 1, col: c + 1 }));
      button.addEventListener("click", () => press(r, c));
      els.board.appendChild(button);
    }));
    els.status.textContent = state.solved ? t("lightsOutSolved") : `${t("lightsOutPrompt")} ${state.moves}`;
    saveState();
  }
  function startNewGame() { state = freshState(); undoSnapshot = null; els.undo.disabled = true; render(); }
  function undo() { if (!undoSnapshot) return; state = clone(undoSnapshot); undoSnapshot = null; els.undo.disabled = true; render(); }
  function preventBrowserDoubleClick(event) { const now = Date.now(); if (now - lastTapAt < 420) event.preventDefault(); lastTapAt = now; }
  function applyLanguage() { if (window.LMAG_I18N) window.LMAG_I18N.apply(document); render(); }
  function registerServiceWorker() { if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("../../sw.js").catch(() => {})); }
  els.newGame.addEventListener("click", startNewGame); els.undo.addEventListener("click", undo);
  document.addEventListener("contextmenu", (event) => event.preventDefault()); document.addEventListener("dblclick", preventBrowserDoubleClick, { capture: true }); document.addEventListener("dragstart", (event) => event.preventDefault()); document.addEventListener("touchmove", (event) => event.preventDefault(), { passive: false }); document.addEventListener("gesturestart", (event) => event.preventDefault()); document.addEventListener("gesturechange", (event) => event.preventDefault()); document.addEventListener("gestureend", (event) => event.preventDefault()); document.addEventListener("lmag:languagechange", applyLanguage);
  applyTheme(); state = loadState() || freshState(); render(); registerServiceWorker();
})();
