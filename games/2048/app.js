(function () {
  "use strict";
  const STORAGE_KEY = "leave-me-alone-2048-current-game";
  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const SIZE = 4;
  const els = { board: document.getElementById("board"), status: document.getElementById("status"), undo: document.getElementById("undo"), newGame: document.getElementById("new-game") };
  let state = null, undoSnapshot = null, touchStart = null, lastTapAt = 0;
  function t(key, values) { return window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key; }
  function applyTheme() { try { const theme = localStorage.getItem(THEME_KEY); document.body.dataset.theme = THEMES.has(theme) ? theme : "colorblind"; } catch { document.body.dataset.theme = "colorblind"; } }
  function emptyBoard() { return Array.from({ length: SIZE }, () => Array(SIZE).fill(0)); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function saveState() { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function loadState() { try { const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY)); return saved?.board?.length === SIZE ? saved : null; } catch { return null; } }
  function emptyCells(board) { const cells = []; board.forEach((row, r) => row.forEach((value, c) => { if (!value) cells.push([r, c]); })); return cells; }
  function addTile(board) { const cells = emptyCells(board); if (!cells.length) return; const [r, c] = cells[Math.floor(Math.random() * cells.length)]; board[r][c] = Math.random() < .9 ? 2 : 4; }
  function freshState() { const board = emptyBoard(); addTile(board); addTile(board); return { board, score: 0, won: false, over: false }; }
  function compress(line) {
    const values = line.filter(Boolean), result = [];
    let gained = 0;
    for (let index = 0; index < values.length; index += 1) {
      if (values[index] === values[index + 1]) { const merged = values[index] * 2; result.push(merged); gained += merged; index += 1; }
      else result.push(values[index]);
    }
    while (result.length < SIZE) result.push(0);
    return { line: result, gained };
  }
  function sameBoard(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function movedBoard(board, dir) {
    const next = emptyBoard();
    let gained = 0;
    for (let i = 0; i < SIZE; i += 1) {
      let line = dir === "left" || dir === "right" ? board[i].slice() : board.map((row) => row[i]);
      if (dir === "right" || dir === "down") line.reverse();
      const compressed = compress(line);
      let out = compressed.line;
      if (dir === "right" || dir === "down") out = out.reverse();
      gained += compressed.gained;
      for (let j = 0; j < SIZE; j += 1) {
        if (dir === "left" || dir === "right") next[i][j] = out[j];
        else next[j][i] = out[j];
      }
    }
    return { board: next, gained };
  }
  function hasMoves(board) {
    if (emptyCells(board).length) return true;
    return ["left", "right", "up", "down"].some((dir) => !sameBoard(board, movedBoard(board, dir).board));
  }
  function move(dir) {
    if (state.over) return;
    const next = movedBoard(state.board, dir);
    if (sameBoard(state.board, next.board)) return;
    undoSnapshot = clone(state); els.undo.disabled = false;
    state.board = next.board; state.score += next.gained; addTile(state.board);
    state.won = state.won || state.board.flat().includes(2048);
    state.over = !hasMoves(state.board);
    render();
  }
  function render() {
    els.board.innerHTML = "";
    state.board.flat().forEach((value, index) => {
      const cell = document.createElement("div");
      cell.className = "tile"; cell.dataset.value = value ? String(value) : ""; cell.textContent = value || "";
      cell.setAttribute("aria-label", t("puzzleCell", { row: Math.floor(index / SIZE) + 1, col: index % SIZE + 1 }));
      els.board.appendChild(cell);
    });
    els.status.textContent = state.over ? t("game2048Over") : state.won ? t("game2048Won") : t("game2048Score", { score: state.score });
    saveState();
  }
  function startNewGame() { state = freshState(); undoSnapshot = null; els.undo.disabled = true; render(); }
  function undo() { if (!undoSnapshot) return; state = clone(undoSnapshot); undoSnapshot = null; els.undo.disabled = true; render(); }
  function keyMove(event) { const map = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", a: "left", d: "right", w: "up", s: "down" }; if (!map[event.key]) return; event.preventDefault(); move(map[event.key]); }
  function touchBegin(event) { const touch = event.changedTouches[0]; touchStart = { x: touch.clientX, y: touch.clientY }; }
  function touchEnd(event) { if (!touchStart) return; const touch = event.changedTouches[0], dx = touch.clientX - touchStart.x, dy = touch.clientY - touchStart.y; touchStart = null; if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return; move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up")); }
  function preventBrowserDoubleClick(event) { const now = Date.now(); if (now - lastTapAt < 420) event.preventDefault(); lastTapAt = now; }
  function applyLanguage() { if (window.LMAG_I18N) window.LMAG_I18N.apply(document); render(); }
  function registerServiceWorker() { if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("../../sw.js").catch(() => {})); }
  els.newGame.addEventListener("click", startNewGame); els.undo.addEventListener("click", undo);
  document.querySelectorAll("[data-move]").forEach((button) => button.addEventListener("click", () => move(button.dataset.move)));
  document.addEventListener("keydown", keyMove); document.addEventListener("touchstart", touchBegin, { passive: true }); document.addEventListener("touchend", touchEnd); document.addEventListener("contextmenu", (event) => event.preventDefault()); document.addEventListener("dblclick", preventBrowserDoubleClick, { capture: true }); document.addEventListener("dragstart", (event) => event.preventDefault()); document.addEventListener("touchmove", (event) => event.preventDefault(), { passive: false }); document.addEventListener("gesturestart", (event) => event.preventDefault()); document.addEventListener("gesturechange", (event) => event.preventDefault()); document.addEventListener("gestureend", (event) => event.preventDefault()); document.addEventListener("lmag:languagechange", applyLanguage);
  applyTheme(); state = loadState() || freshState(); render(); registerServiceWorker();
})();
