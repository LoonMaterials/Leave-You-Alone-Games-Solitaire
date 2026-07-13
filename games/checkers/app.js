(function () {
  "use strict";
  const STORAGE_KEY = "leave-me-alone-checkers-current-game";
  const SAVE_VERSION = 2;
  const DIFFICULTY_KEY = "leave-me-alone-checkers-difficulty";
  const MODE_KEY = "leave-me-alone-checkers-mode";
  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const DIFFICULTIES = new Set(["easy", "medium", "hard"]);
  const MODES = new Set(["computer", "two-player"]);
  const BOARD_SIZE = 8;
  const RED = "r";
  const BLACK = "b";
  const els = { board: document.getElementById("board"), status: document.getElementById("status"), undo: document.getElementById("undo"), newGame: document.getElementById("new-game"), difficulty: document.getElementById("difficulty"), mode: document.getElementById("game-mode") };
  let state = null, selected = null, legalTargets = [], undoSnapshot = null, turnUndoSnapshot = null, lastTapAt = 0;

  function t(key, values) { return window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key; }
  function storedDifficulty() { try { const difficulty = localStorage.getItem(DIFFICULTY_KEY); return DIFFICULTIES.has(difficulty) ? difficulty : "easy"; } catch { return "easy"; } }
  function storedMode() { try { const mode = localStorage.getItem(MODE_KEY); return MODES.has(mode) ? mode : "computer"; } catch { return "computer"; } }
  function isTwoPlayer() { return storedMode() === "two-player"; }
  function applyDifficulty() { if (els.difficulty) els.difficulty.value = storedDifficulty(); }
  function saveDifficulty() { if (!els.difficulty) return; try { localStorage.setItem(DIFFICULTY_KEY, DIFFICULTIES.has(els.difficulty.value) ? els.difficulty.value : "easy"); } catch {} }
  function applyMode() { if (els.mode) els.mode.value = storedMode(); if (els.difficulty) els.difficulty.disabled = isTwoPlayer(); }
  function saveMode() { if (!els.mode) return; try { localStorage.setItem(MODE_KEY, MODES.has(els.mode.value) ? els.mode.value : "computer"); } catch {} applyMode(); startNewGame(); }
  function applyTheme() { try { const theme = localStorage.getItem(THEME_KEY); document.body.dataset.theme = THEMES.has(theme) ? theme : "colorblind"; } catch { document.body.dataset.theme = "colorblind"; } }
  function freshBoard() {
    const board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
    for (let row = 0; row < 3; row += 1) for (let col = 0; col < BOARD_SIZE; col += 1) if ((row + col) % 2) board[row][col] = { color: BLACK, king: false };
    for (let row = 5; row < BOARD_SIZE; row += 1) for (let col = 0; col < BOARD_SIZE; col += 1) if ((row + col) % 2) board[row][col] = { color: RED, king: false };
    return board;
  }
  function freshState() { return { version: SAVE_VERSION, board: freshBoard(), turn: RED, winner: null, mustContinue: null }; }
  function clone(source) { return JSON.parse(JSON.stringify(source)); }
  function saveState() { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function loadState() { try { const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY)); return saved?.version === SAVE_VERSION && saved?.board?.length === BOARD_SIZE ? saved : null; } catch { return null; } }
  function opponent(color) { return color === RED ? BLACK : RED; }
  function inBounds(row, col) { return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE; }
  function directions(piece) { return piece.king ? [[-1,-1],[-1,1],[1,-1],[1,1]] : piece.color === RED ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]]; }
  function pieceCaptureSteps(board, row, col) {
    const piece = board[row]?.[col];
    if (!piece) return [];
    return directions(piece).flatMap(([dr, dc]) => {
      const midRow = row + dr, midCol = col + dc, toRow = row + dr * 2, toCol = col + dc * 2;
      if (!inBounds(toRow, toCol)) return [];
      const jumped = board[midRow][midCol];
      if (jumped && jumped.color !== piece.color && !board[toRow][toCol]) return [{ from: { row, col }, to: { row: toRow, col: toCol }, jumped: { row: midRow, col: midCol } }];
      return [];
    });
  }
  function pieceQuietSteps(board, row, col) {
    const piece = board[row]?.[col];
    if (!piece) return [];
    return directions(piece).flatMap(([dr, dc]) => {
      const toRow = row + dr, toCol = col + dc;
      return inBounds(toRow, toCol) && !board[toRow][toCol] ? [{ from: { row, col }, to: { row: toRow, col: toCol } }] : [];
    });
  }
  function allCaptureSteps(board, color) {
    const moves = [];
    for (let row = 0; row < BOARD_SIZE; row += 1) for (let col = 0; col < BOARD_SIZE; col += 1) if (board[row][col]?.color === color) moves.push(...pieceCaptureSteps(board, row, col));
    return moves;
  }
  function allQuietSteps(board, color) {
    const moves = [];
    for (let row = 0; row < BOARD_SIZE; row += 1) for (let col = 0; col < BOARD_SIZE; col += 1) if (board[row][col]?.color === color) moves.push(...pieceQuietSteps(board, row, col));
    return moves;
  }
  function promoteRow(color) { return color === RED ? 0 : 7; }
  function applyStep(board, step) {
    const next = clone(board);
    const piece = next[step.from.row][step.from.col];
    next[step.from.row][step.from.col] = null;
    if (step.jumped) next[step.jumped.row][step.jumped.col] = null;
    const becameKing = !piece.king && step.to.row === promoteRow(piece.color);
    piece.king = piece.king || becameKing;
    next[step.to.row][step.to.col] = piece;
    return { board: next, becameKing };
  }
  function captureSequencesFrom(board, step, priorSteps) {
    const applied = applyStep(board, step);
    const sequence = priorSteps.concat([step]);
    if (applied.becameKing) return [{ steps: sequence, board: applied.board }];
    const more = pieceCaptureSteps(applied.board, step.to.row, step.to.col);
    if (!more.length) return [{ steps: sequence, board: applied.board }];
    return more.flatMap((nextStep) => captureSequencesFrom(applied.board, nextStep, sequence));
  }
  function legalTurnSequences(board, color) {
    const captures = allCaptureSteps(board, color);
    if (captures.length) return captures.flatMap((step) => captureSequencesFrom(board, step, []));
    return allQuietSteps(board, color).map((step) => ({ steps: [step], board: applyStep(board, step).board }));
  }
  function updateWinner() {
    const red = state.board.flat().filter((piece) => piece?.color === RED).length;
    const black = state.board.flat().filter((piece) => piece?.color === BLACK).length;
    if (!red) state.winner = BLACK;
    else if (!black) state.winner = RED;
    else if (!legalTurnSequences(state.board, state.turn).length) state.winner = opponent(state.turn);
  }
  function endTurn(nextTurn) {
    state.turn = nextTurn;
    state.mustContinue = null;
    selected = null;
    legalTargets = [];
    turnUndoSnapshot = null;
    updateWinner();
  }
  function applyPlayerStep(step) {
    const applied = applyStep(state.board, step);
    state.board = applied.board;
    if (step.jumped && !applied.becameKing) {
      const more = pieceCaptureSteps(state.board, step.to.row, step.to.col);
      if (more.length) {
        state.mustContinue = { row: step.to.row, col: step.to.col };
        selected = clone(state.mustContinue);
        legalTargets = more;
        updateWinner();
        render();
        return;
      }
    }
    endTurn(opponent(step.to ? state.board[step.to.row][step.to.col]?.color || RED : RED));
    render();
    if (!isTwoPlayer()) window.setTimeout(computerMove, 280);
  }
  function applySequence(sequence) {
    state.board = clone(sequence.board);
    endTurn(opponent(state.turn));
  }
  function chooseComputerSequence(sequences) {
    const difficulty = storedDifficulty();
    if (difficulty === "easy") return preferCapturesRandomly(sequences);
    const depth = difficulty === "hard" ? 6 : 3;
    const jitter = difficulty === "hard" ? 0.001 : 0.35;
    const scored = sequences.map((sequence) => ({ sequence, score: minimax(sequence.board, RED, depth - 1, -Infinity, Infinity) + Math.random() * jitter }));
    scored.sort((a, b) => b.score - a.score);
    return scored[0].sequence;
  }
  function preferCapturesRandomly(sequences) {
    const bestCaptureCount = Math.max(...sequences.map((sequence) => sequence.steps.filter((step) => step.jumped).length));
    const pool = bestCaptureCount ? sequences.filter((sequence) => sequence.steps.filter((step) => step.jumped).length === bestCaptureCount) : sequences;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function minimax(board, turn, depth, alpha, beta) {
    const sequences = legalTurnSequences(board, turn);
    if (!sequences.length) return turn === BLACK ? -99999 - depth : 99999 + depth;
    if (depth <= 0) return evaluateBoard(board);
    if (turn === BLACK) {
      let value = -Infinity;
      for (const sequence of orderedSequences(sequences, BLACK)) {
        value = Math.max(value, minimax(sequence.board, RED, depth - 1, alpha, beta));
        alpha = Math.max(alpha, value);
        if (alpha >= beta) break;
      }
      return value;
    }
    let value = Infinity;
    for (const sequence of orderedSequences(sequences, RED)) {
      value = Math.min(value, minimax(sequence.board, BLACK, depth - 1, alpha, beta));
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return value;
  }
  function orderedSequences(sequences, color) {
    return sequences.slice().sort((a, b) => sequenceTacticalScore(b, color) - sequenceTacticalScore(a, color));
  }
  function sequenceTacticalScore(sequence, color) {
    const captures = sequence.steps.filter((step) => step.jumped).length * 80;
    const last = sequence.steps[sequence.steps.length - 1];
    const piece = sequence.board[last.to.row][last.to.col];
    const king = piece?.king ? 25 : 0;
    const advance = piece && !piece.king ? (piece.color === BLACK ? last.to.row : 7 - last.to.row) * 4 : 0;
    const center = 6 - Math.abs(3.5 - last.to.row) - Math.abs(3.5 - last.to.col);
    return captures + king + advance + center + (color === BLACK ? 0 : -0.01);
  }
  function evaluateBoard(board) {
    let score = 0;
    for (let row = 0; row < BOARD_SIZE; row += 1) for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = board[row][col];
      if (!piece) continue;
      const sign = piece.color === BLACK ? 1 : -1;
      const material = piece.king ? 175 : 100;
      const advance = piece.king ? 0 : piece.color === BLACK ? row * 7 : (7 - row) * 7;
      const center = 8 - Math.abs(3.5 - row) - Math.abs(3.5 - col);
      const edge = col === 0 || col === 7 ? 5 : 0;
      score += sign * (material + advance + center + edge);
    }
    score += legalTurnSequences(board, BLACK).length * 3;
    score -= legalTurnSequences(board, RED).length * 3;
    score += allCaptureSteps(board, BLACK).length * 18;
    score -= allCaptureSteps(board, RED).length * 22;
    return score;
  }
  function computerMove() {
    if (isTwoPlayer() || state.winner || state.turn !== BLACK) return;
    const sequences = legalTurnSequences(state.board, BLACK);
    if (!sequences.length) { updateWinner(); render(); return; }
    applySequence(chooseComputerSequence(sequences));
    render();
  }
  function rememberUndo() {
    if (!turnUndoSnapshot) turnUndoSnapshot = clone(state);
    undoSnapshot = clone(turnUndoSnapshot);
    els.undo.disabled = false;
  }
  function legalStepsForSelection(row, col) {
    if (state.mustContinue) return state.mustContinue.row === row && state.mustContinue.col === col ? pieceCaptureSteps(state.board, row, col) : [];
    const color = isTwoPlayer() ? state.turn : RED;
    const captures = allCaptureSteps(state.board, color);
    if (captures.length) return captures.filter((move) => move.from.row === row && move.from.col === col);
    return pieceQuietSteps(state.board, row, col).filter((move) => state.board[move.from.row][move.from.col]?.color === color);
  }
  function render() {
    els.board.innerHTML = "";
    const targetSet = new Set(legalTargets.map((move) => `${move.to.row},${move.to.col}`));
    for (let row = 0; row < BOARD_SIZE; row += 1) for (let col = 0; col < BOARD_SIZE; col += 1) {
      const square = document.createElement("button");
      square.type = "button"; square.className = `square ${(row + col) % 2 ? "dark" : "light"}`; square.dataset.row = String(row); square.dataset.col = String(col);
      if (selected && selected.row === row && selected.col === col) square.classList.add("selected");
      if (targetSet.has(`${row},${col}`)) square.classList.add("legal");
      const piece = state.board[row][col];
      square.setAttribute("aria-label", t("checkersSquare", { row: row + 1, col: col + 1 }));
      if (piece) { const div = document.createElement("div"); div.className = `piece ${piece.color === RED ? "red" : "black"}`; div.textContent = piece.king ? "\u265B" : ""; square.appendChild(div); }
      square.addEventListener("click", onSquareClick); els.board.appendChild(square);
    }
    els.status.textContent = state.winner ? isTwoPlayer() ? t(state.winner === RED ? "redWon" : "blackWon") : t(state.winner === RED ? "youWon" : "computerWon") : isTwoPlayer() ? t(state.turn === RED ? "redTurn" : "blackTurn") : t("yourTurn");
    saveState();
  }
  function onSquareClick(event) {
    if ((!isTwoPlayer() && state.turn !== RED) || state.winner) return;
    const row = Number(event.currentTarget.dataset.row), col = Number(event.currentTarget.dataset.col);
    const chosenMove = legalTargets.find((move) => move.to.row === row && move.to.col === col);
    if (chosenMove) { rememberUndo(); applyPlayerStep(chosenMove); return; }
    if (state.mustContinue && (state.mustContinue.row !== row || state.mustContinue.col !== col)) return;
    if (state.board[row][col]?.color === (isTwoPlayer() ? state.turn : RED)) {
      selected = { row, col };
      legalTargets = legalStepsForSelection(row, col);
    } else {
      selected = null; legalTargets = [];
    }
    render();
  }
  function startNewGame() { state = freshState(); selected = null; legalTargets = []; undoSnapshot = null; turnUndoSnapshot = null; els.undo.disabled = true; render(); }
  function undo() { if (!undoSnapshot) return; state = clone(undoSnapshot); selected = null; legalTargets = []; turnUndoSnapshot = null; undoSnapshot = null; els.undo.disabled = true; render(); }
  function preventBrowserDoubleClick(event) { const now = Date.now(); if (now - lastTapAt < 420) event.preventDefault(); lastTapAt = now; }
  function preventViewportMove(event) { event.preventDefault(); }
  function preventGestureZoom(event) { event.preventDefault(); }
  function applyLanguage() { if (window.LMAG_I18N) window.LMAG_I18N.apply(document); render(); }
  function registerServiceWorker() { if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("../../sw.js").catch(() => {})); }
  els.newGame.addEventListener("click", startNewGame); els.undo.addEventListener("click", undo); if (els.difficulty) els.difficulty.addEventListener("change", saveDifficulty); if (els.mode) els.mode.addEventListener("change", saveMode);
  document.addEventListener("contextmenu", (event) => event.preventDefault()); document.addEventListener("dblclick", preventBrowserDoubleClick, { capture: true }); document.addEventListener("dragstart", (event) => event.preventDefault()); document.addEventListener("touchmove", preventViewportMove, { passive: false }); document.addEventListener("gesturestart", preventGestureZoom); document.addEventListener("gesturechange", preventGestureZoom); document.addEventListener("gestureend", preventGestureZoom); document.addEventListener("lmag:languagechange", applyLanguage);
  applyTheme(); applyDifficulty(); applyMode(); state = loadState() || freshState(); updateWinner(); render(); registerServiceWorker();
})();
