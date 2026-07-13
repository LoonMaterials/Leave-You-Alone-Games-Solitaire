(function () {
  "use strict";
  const STORAGE_KEY = "leave-me-alone-reversi-current-game";
  const DIFFICULTY_KEY = "leave-me-alone-reversi-difficulty";
  const MODE_KEY = "leave-me-alone-reversi-mode";
  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const DIFFICULTIES = new Set(["easy", "medium", "hard"]);
  const MODES = new Set(["computer", "two-player"]);
  const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
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
  function freshState() { const board = Array.from({ length: 8 }, () => Array(8).fill(null)); board[3][3] = "w"; board[3][4] = "b"; board[4][3] = "b"; board[4][4] = "w"; return { board, turn: "b", winner: null }; }
  function clone(source) { return JSON.parse(JSON.stringify(source)); }
  function saveState() { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function loadState() { try { const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY)); return saved?.board?.length === 8 ? saved : null; } catch { return null; } }
  function inBounds(row, col) { return row >= 0 && row < 8 && col >= 0 && col < 8; }
  function opponent(color) { return color === "b" ? "w" : "b"; }
  function flipsFor(row, col, color) {
    if (state.board[row][col]) return [];
    const flips = [];
    DIRS.forEach(([dr, dc]) => {
      const line = [];
      let r = row + dr, c = col + dc;
      while (inBounds(r, c) && state.board[r][c] === opponent(color)) { line.push([r, c]); r += dr; c += dc; }
      if (line.length && inBounds(r, c) && state.board[r][c] === color) flips.push(...line);
    });
    return flips;
  }
  function legalMoves(color) {
    const moves = [];
    for (let row = 0; row < 8; row += 1) for (let col = 0; col < 8; col += 1) {
      const flips = flipsFor(row, col, color);
      if (flips.length) moves.push({ row, col, flips });
    }
    return moves;
  }
  function score() { return state.board.flat().reduce((acc, cell) => { if (cell === "b") acc.black += 1; if (cell === "w") acc.white += 1; return acc; }, { black: 0, white: 0 }); }
  function updateWinner() {
    const blackMoves = legalMoves("b"), whiteMoves = legalMoves("w");
    if (blackMoves.length || whiteMoves.length) return;
    const s = score();
    state.winner = s.black === s.white ? "draw" : s.black > s.white ? "b" : "w";
  }
  function playMove(move, color) {
    state.board[move.row][move.col] = color;
    move.flips.forEach(([row, col]) => { state.board[row][col] = color; });
    state.turn = opponent(color);
    if (!legalMoves(state.turn).length) state.turn = color;
    updateWinner();
  }
  function computerMove() {
    if (isTwoPlayer() || state.winner || state.turn !== "w") return;
    const moves = legalMoves("w");
    if (!moves.length) { state.turn = "b"; render(); return; }
    const best = chooseComputerMove(moves);
    playMove(best, "w");
    render();
  }
  function chooseComputerMove(moves) {
    if (storedDifficulty() === "easy") return moves[Math.floor(Math.random() * moves.length)];
    const scorer = storedDifficulty() === "hard" ? hardReversiMoveScore : reversiMoveScore;
    return moves.slice().sort((a, b) => scorer(b) - scorer(a))[0];
  }
  function reversiMoveScore(move) {
    const corner = (move.row === 0 || move.row === 7) && (move.col === 0 || move.col === 7);
    const edge = move.row === 0 || move.row === 7 || move.col === 0 || move.col === 7;
    const nearCorner = (move.row <= 1 || move.row >= 6) && (move.col <= 1 || move.col >= 6) && !corner;
    return move.flips.length + (corner ? 40 : 0) + (edge ? 8 : 0) - (nearCorner ? 12 : 0);
  }
  function hardReversiMoveScore(move) {
    const saved = state;
    state = clone(saved);
    playMove(clone(move), "w");
    const replies = legalMoves("b");
    const replyScore = replies.length ? Math.max(...replies.map(reversiMoveScore)) : -10;
    const mobility = legalMoves("w").length - replies.length;
    state = saved;
    return reversiMoveScore(move) + mobility * 2 - replyScore * .8;
  }
  function rememberUndo() { undoSnapshot = clone(state); els.undo.disabled = false; }
  function render() {
    els.board.innerHTML = "";
    const moves = isTwoPlayer() ? legalMoves(state.turn) : state.turn === "b" ? legalMoves("b") : [];
    const legal = new Map(moves.map(move => [`${move.row},${move.col}`, move]));
    for (let row = 0; row < 8; row += 1) for (let col = 0; col < 8; col += 1) {
      const square = document.createElement("button");
      square.type = "button"; square.className = "square"; square.dataset.row = String(row); square.dataset.col = String(col);
      if (legal.has(`${row},${col}`)) square.classList.add("legal");
      square.setAttribute("aria-label", t("reversiSquare", { row: row + 1, col: col + 1 }));
      const cell = state.board[row][col];
      if (cell) { const disc = document.createElement("div"); disc.className = `disc ${cell === "b" ? "black" : "white"}`; square.appendChild(disc); }
      square.addEventListener("click", onSquareClick); els.board.appendChild(square);
    }
    const s = score();
    els.status.textContent = state.winner ? (state.winner === "draw" ? t("draw") : isTwoPlayer() ? t(state.winner === "b" ? "blackWon" : "whiteWon") : t(state.winner === "b" ? "youWon" : "computerWon")) : isTwoPlayer() ? `${t("reversiScoreLocal", { black: s.black, white: s.white })} · ${t(state.turn === "b" ? "blackTurn" : "whiteTurn")}` : t("reversiScore", { player: s.black, computer: s.white });
    saveState();
  }
  function onSquareClick(event) {
    if ((!isTwoPlayer() && state.turn !== "b") || state.winner) return;
    const row = Number(event.currentTarget.dataset.row), col = Number(event.currentTarget.dataset.col);
    const color = isTwoPlayer() ? state.turn : "b";
    const move = legalMoves(color).find(item => item.row === row && item.col === col);
    if (!move) return;
    rememberUndo(); playMove(move, color); render(); if (!isTwoPlayer()) window.setTimeout(computerMove, 300);
  }
  function startNewGame() { state = freshState(); undoSnapshot = null; els.undo.disabled = true; render(); }
  function undo() { if (!undoSnapshot) return; state = clone(undoSnapshot); undoSnapshot = null; els.undo.disabled = true; render(); }
  function preventBrowserDoubleClick(event) { const now = Date.now(); if (now - lastTapAt < 420) event.preventDefault(); lastTapAt = now; }
  function preventViewportMove(event) { event.preventDefault(); }
  function preventGestureZoom(event) { event.preventDefault(); }
  function applyLanguage() { if (window.LMAG_I18N) window.LMAG_I18N.apply(document); render(); }
  function registerServiceWorker() { if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("../../sw.js").catch(() => {})); }
  els.newGame.addEventListener("click", startNewGame); els.undo.addEventListener("click", undo); if (els.difficulty) els.difficulty.addEventListener("change", saveDifficulty); if (els.mode) els.mode.addEventListener("change", saveMode);
  document.addEventListener("contextmenu", e => e.preventDefault()); document.addEventListener("dblclick", preventBrowserDoubleClick, { capture: true }); document.addEventListener("dragstart", e => e.preventDefault()); document.addEventListener("touchmove", preventViewportMove, { passive: false }); document.addEventListener("gesturestart", preventGestureZoom); document.addEventListener("gesturechange", preventGestureZoom); document.addEventListener("gestureend", preventGestureZoom); document.addEventListener("lmag:languagechange", applyLanguage);
  applyTheme(); applyDifficulty(); applyMode(); state = loadState() || freshState(); updateWinner(); render(); registerServiceWorker();
})();
