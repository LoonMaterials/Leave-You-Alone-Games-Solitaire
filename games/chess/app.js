(function () {
  "use strict";

  const STORAGE_KEY = "leave-me-alone-chess-current-game";
  const DIFFICULTY_KEY = "leave-me-alone-chess-difficulty";
  const MODE_KEY = "leave-me-alone-chess-mode";
  const THEME_KEY = "leave-me-alone-games-theme";
  const SAVE_VERSION = 2;
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const DIFFICULTIES = new Set(["easy", "medium", "hard", "grandmaster"]);
  const MODES = new Set(["computer", "two-player"]);
  const VALUES = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };
  const PIECE_SQUARES = {
    P: [
      [0,0,0,0,0,0,0,0],
      [50,50,50,50,50,50,50,50],
      [10,10,20,30,30,20,10,10],
      [5,5,10,25,25,10,5,5],
      [0,0,0,20,20,0,0,0],
      [5,-5,-10,0,0,-10,-5,5],
      [5,10,10,-20,-20,10,10,5],
      [0,0,0,0,0,0,0,0]
    ],
    N: [
      [-50,-40,-30,-30,-30,-30,-40,-50],
      [-40,-20,0,5,5,0,-20,-40],
      [-30,5,10,15,15,10,5,-30],
      [-30,0,15,20,20,15,0,-30],
      [-30,5,15,20,20,15,5,-30],
      [-30,0,10,15,15,10,0,-30],
      [-40,-20,0,0,0,0,-20,-40],
      [-50,-40,-30,-30,-30,-30,-40,-50]
    ],
    B: [
      [-20,-10,-10,-10,-10,-10,-10,-20],
      [-10,5,0,0,0,0,5,-10],
      [-10,10,10,10,10,10,10,-10],
      [-10,0,10,10,10,10,0,-10],
      [-10,5,5,10,10,5,5,-10],
      [-10,0,5,10,10,5,0,-10],
      [-10,0,0,0,0,0,0,-10],
      [-20,-10,-10,-10,-10,-10,-10,-20]
    ],
    R: [
      [0,0,0,5,5,0,0,0],
      [-5,0,0,0,0,0,0,-5],
      [-5,0,0,0,0,0,0,-5],
      [-5,0,0,0,0,0,0,-5],
      [-5,0,0,0,0,0,0,-5],
      [-5,0,0,0,0,0,0,-5],
      [5,10,10,10,10,10,10,5],
      [0,0,0,0,0,0,0,0]
    ],
    Q: [
      [-20,-10,-10,-5,-5,-10,-10,-20],
      [-10,0,0,0,0,0,0,-10],
      [-10,0,5,5,5,5,0,-10],
      [-5,0,5,5,5,5,0,-5],
      [0,0,5,5,5,5,0,-5],
      [-10,5,5,5,5,5,0,-10],
      [-10,0,5,0,0,0,0,-10],
      [-20,-10,-10,-5,-5,-10,-10,-20]
    ],
    K: [
      [20,30,10,0,0,10,30,20],
      [20,20,0,0,0,0,20,20],
      [-10,-20,-20,-20,-20,-20,-20,-10],
      [-20,-30,-30,-40,-40,-30,-30,-20],
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-30,-40,-40,-50,-50,-40,-40,-30]
    ]
  };

  const els = {
    board: document.getElementById("board"),
    status: document.getElementById("status"),
    undo: document.getElementById("undo"),
    newGame: document.getElementById("new-game"),
    difficulty: document.getElementById("difficulty"),
    mode: document.getElementById("game-mode")
  };
  let state = null;
  let selected = null;
  let legalTargets = [];
  let undoSnapshot = null;
  let lastTapAt = 0;

  function t(key, values) {
    return window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key;
  }

  function storedDifficulty() {
    try {
      const difficulty = localStorage.getItem(DIFFICULTY_KEY);
      return DIFFICULTIES.has(difficulty) ? difficulty : "easy";
    } catch {
      return "easy";
    }
  }

  function storedMode() {
    try {
      const mode = localStorage.getItem(MODE_KEY);
      return MODES.has(mode) ? mode : "computer";
    } catch {
      return "computer";
    }
  }

  function isTwoPlayer() {
    return storedMode() === "two-player";
  }

  function applyDifficulty() {
    if (els.difficulty) els.difficulty.value = storedDifficulty();
  }

  function saveDifficulty() {
    if (!els.difficulty) return;
    try {
      localStorage.setItem(DIFFICULTY_KEY, DIFFICULTIES.has(els.difficulty.value) ? els.difficulty.value : "easy");
    } catch {}
  }

  function applyMode() {
    if (els.mode) els.mode.value = storedMode();
    if (els.difficulty) els.difficulty.disabled = isTwoPlayer();
  }

  function saveMode() {
    if (!els.mode) return;
    try {
      localStorage.setItem(MODE_KEY, MODES.has(els.mode.value) ? els.mode.value : "computer");
    } catch {}
    applyMode();
    startNewGame();
  }

  function applyTheme() {
    try {
      const theme = localStorage.getItem(THEME_KEY);
      document.body.dataset.theme = THEMES.has(theme) ? theme : "colorblind";
    } catch {
      document.body.dataset.theme = "colorblind";
    }
  }

  function freshState() {
    return {
      version: SAVE_VERSION,
      board: [
        ["bR","bN","bB","bQ","bK","bB","bN","bR"],
        ["bP","bP","bP","bP","bP","bP","bP","bP"],
        [null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null],
        ["wP","wP","wP","wP","wP","wP","wP","wP"],
        ["wR","wN","wB","wQ","wK","wB","wN","wR"]
      ],
      turn: "w",
      winner: null,
      draw: false,
      castling: { wK: true, wQ: true, bK: true, bQ: true },
      enPassant: null,
      halfMove: 0,
      fullMove: 1
    };
  }

  function clone(source) {
    return JSON.parse(JSON.stringify(source));
  }

  function saveState() {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadState() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
      if (!saved || saved.version !== SAVE_VERSION || !Array.isArray(saved.board) || saved.board.length !== 8) return null;
      return saved;
    } catch {
      return null;
    }
  }

  function inBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }

  function colorOf(piece) {
    return piece ? piece[0] : null;
  }

  function typeOf(piece) {
    return piece ? piece[1] : null;
  }

  function other(color) {
    return color === "w" ? "b" : "w";
  }

  function pieceAt(board, row, col) {
    return inBounds(row, col) ? board[row][col] : null;
  }

  function findKing(board, color) {
    const king = `${color}K`;
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        if (board[row][col] === king) return { row, col };
      }
    }
    return null;
  }

  function isSquareAttacked(board, row, col, byColor) {
    const pawnDir = byColor === "w" ? -1 : 1;
    for (const dc of [-1, 1]) {
      if (pieceAt(board, row - pawnDir, col - dc) === `${byColor}P`) return true;
    }
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      if (pieceAt(board, row + dr, col + dc) === `${byColor}N`) return true;
    }
    for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
      let nextRow = row + dr;
      let nextCol = col + dc;
      while (inBounds(nextRow, nextCol)) {
        const piece = board[nextRow][nextCol];
        if (piece) {
          if (colorOf(piece) === byColor && (typeOf(piece) === "B" || typeOf(piece) === "Q")) return true;
          break;
        }
        nextRow += dr;
        nextCol += dc;
      }
    }
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      let nextRow = row + dr;
      let nextCol = col + dc;
      while (inBounds(nextRow, nextCol)) {
        const piece = board[nextRow][nextCol];
        if (piece) {
          if (colorOf(piece) === byColor && (typeOf(piece) === "R" || typeOf(piece) === "Q")) return true;
          break;
        }
        nextRow += dr;
        nextCol += dc;
      }
    }
    for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
      if (pieceAt(board, row + dr, col + dc) === `${byColor}K`) return true;
    }
    return false;
  }

  function isInCheck(position, color) {
    const king = findKing(position.board, color);
    return king ? isSquareAttacked(position.board, king.row, king.col, other(color)) : true;
  }

  function addSlideMoves(position, moves, row, col, color, directions) {
    directions.forEach(([dr, dc]) => {
      let nextRow = row + dr;
      let nextCol = col + dc;
      while (inBounds(nextRow, nextCol)) {
        const target = position.board[nextRow][nextCol];
        if (!target) {
          moves.push({ from: { row, col }, to: { row: nextRow, col: nextCol } });
        } else {
          if (colorOf(target) !== color) moves.push({ from: { row, col }, to: { row: nextRow, col: nextCol }, capture: target });
          break;
        }
        nextRow += dr;
        nextCol += dc;
      }
    });
  }

  function pseudoMovesFor(position, row, col) {
    const piece = position.board[row][col];
    if (!piece || position.winner || position.draw) return [];
    const color = colorOf(piece);
    const type = typeOf(piece);
    const moves = [];
    if (type === "P") {
      const dir = color === "w" ? -1 : 1;
      const start = color === "w" ? 6 : 1;
      const promoteRow = color === "w" ? 0 : 7;
      if (inBounds(row + dir, col) && !position.board[row + dir][col]) {
        moves.push({ from: { row, col }, to: { row: row + dir, col }, promotion: row + dir === promoteRow ? "Q" : null });
        if (row === start && !position.board[row + dir * 2][col]) {
          moves.push({ from: { row, col }, to: { row: row + dir * 2, col }, doublePawn: true });
        }
      }
      [-1, 1].forEach((dc) => {
        const nextRow = row + dir;
        const nextCol = col + dc;
        if (!inBounds(nextRow, nextCol)) return;
        const target = position.board[nextRow][nextCol];
        if (target && colorOf(target) !== color) {
          moves.push({ from: { row, col }, to: { row: nextRow, col: nextCol }, capture: target, promotion: nextRow === promoteRow ? "Q" : null });
        } else if (position.enPassant && position.enPassant.row === nextRow && position.enPassant.col === nextCol) {
          moves.push({ from: { row, col }, to: { row: nextRow, col: nextCol }, capture: `${other(color)}P`, enPassant: true });
        }
      });
    }
    if (type === "N") {
      [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr, dc]) => {
        const nextRow = row + dr;
        const nextCol = col + dc;
        if (!inBounds(nextRow, nextCol)) return;
        const target = position.board[nextRow][nextCol];
        if (!target || colorOf(target) !== color) moves.push({ from: { row, col }, to: { row: nextRow, col: nextCol }, capture: target || null });
      });
    }
    if (type === "B" || type === "Q") addSlideMoves(position, moves, row, col, color, [[-1,-1],[-1,1],[1,-1],[1,1]]);
    if (type === "R" || type === "Q") addSlideMoves(position, moves, row, col, color, [[-1,0],[1,0],[0,-1],[0,1]]);
    if (type === "K") {
      [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr, dc]) => {
        const nextRow = row + dr;
        const nextCol = col + dc;
        if (!inBounds(nextRow, nextCol)) return;
        const target = position.board[nextRow][nextCol];
        if (!target || colorOf(target) !== color) moves.push({ from: { row, col }, to: { row: nextRow, col: nextCol }, capture: target || null });
      });
      addCastles(position, moves, color);
    }
    return moves;
  }

  function addCastles(position, moves, color) {
    const row = color === "w" ? 7 : 0;
    if (position.board[row][4] !== `${color}K` || isInCheck(position, color)) return;
    if (position.castling?.[`${color}K`] && position.board[row][7] === `${color}R` && !position.board[row][5] && !position.board[row][6]) {
      if (!isSquareAttacked(position.board, row, 5, other(color)) && !isSquareAttacked(position.board, row, 6, other(color))) {
        moves.push({ from: { row, col: 4 }, to: { row, col: 6 }, castle: "king" });
      }
    }
    if (position.castling?.[`${color}Q`] && position.board[row][0] === `${color}R` && !position.board[row][1] && !position.board[row][2] && !position.board[row][3]) {
      if (!isSquareAttacked(position.board, row, 3, other(color)) && !isSquareAttacked(position.board, row, 2, other(color))) {
        moves.push({ from: { row, col: 4 }, to: { row, col: 2 }, castle: "queen" });
      }
    }
  }

  function legalMovesFor(position, row, col) {
    const piece = position.board[row]?.[col];
    if (!piece) return [];
    const color = colorOf(piece);
    return pseudoMovesFor(position, row, col).filter((move) => {
      const next = clone(position);
      applyMove(next, clone(move), { updateStatus: false });
      return !isInCheck(next, color);
    });
  }

  function allLegalMoves(position, color) {
    const moves = [];
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        if (colorOf(position.board[row][col]) === color) moves.push(...legalMovesFor(position, row, col));
      }
    }
    return moves;
  }

  function updateCastlingRights(position, piece, move, captured) {
    if (piece === "wK") {
      position.castling.wK = false;
      position.castling.wQ = false;
    }
    if (piece === "bK") {
      position.castling.bK = false;
      position.castling.bQ = false;
    }
    if (piece === "wR" && move.from.row === 7 && move.from.col === 0) position.castling.wQ = false;
    if (piece === "wR" && move.from.row === 7 && move.from.col === 7) position.castling.wK = false;
    if (piece === "bR" && move.from.row === 0 && move.from.col === 0) position.castling.bQ = false;
    if (piece === "bR" && move.from.row === 0 && move.from.col === 7) position.castling.bK = false;
    if (captured === "wR" && move.to.row === 7 && move.to.col === 0) position.castling.wQ = false;
    if (captured === "wR" && move.to.row === 7 && move.to.col === 7) position.castling.wK = false;
    if (captured === "bR" && move.to.row === 0 && move.to.col === 0) position.castling.bQ = false;
    if (captured === "bR" && move.to.row === 0 && move.to.col === 7) position.castling.bK = false;
  }

  function applyMove(position, move, options = {}) {
    const piece = position.board[move.from.row][move.from.col];
    const color = colorOf(piece);
    const captured = move.enPassant ? position.board[move.from.row][move.to.col] : position.board[move.to.row][move.to.col];
    position.board[move.from.row][move.from.col] = null;
    if (move.enPassant) position.board[move.from.row][move.to.col] = null;
    position.board[move.to.row][move.to.col] = move.promotion ? `${color}${move.promotion}` : piece;
    if (move.castle === "king") {
      position.board[move.to.row][5] = position.board[move.to.row][7];
      position.board[move.to.row][7] = null;
    }
    if (move.castle === "queen") {
      position.board[move.to.row][3] = position.board[move.to.row][0];
      position.board[move.to.row][0] = null;
    }
    updateCastlingRights(position, piece, move, captured);
    position.enPassant = move.doublePawn ? { row: (move.from.row + move.to.row) / 2, col: move.from.col } : null;
    position.halfMove = typeOf(piece) === "P" || captured ? 0 : (position.halfMove || 0) + 1;
    if (color === "b") position.fullMove = (position.fullMove || 1) + 1;
    position.turn = other(color);
    if (options.updateStatus !== false) updateGameStatus(position);
  }

  function updateGameStatus(position) {
    const moves = allLegalMoves(position, position.turn);
    position.winner = null;
    position.draw = false;
    if (!moves.length) {
      if (isInCheck(position, position.turn)) position.winner = other(position.turn);
      else position.draw = true;
    } else if ((position.halfMove || 0) >= 100) {
      position.draw = true;
    }
  }

  function evaluate(position) {
    if (position.winner === "b") return 999999;
    if (position.winner === "w") return -999999;
    if (position.draw) return 0;
    let score = 0;
    const bishops = { w: 0, b: 0 };
    const pawnsByFile = { w: Array(8).fill(0), b: Array(8).fill(0) };
    const rooks = [];
    const kings = { w: null, b: null };
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const piece = position.board[row][col];
        if (!piece) continue;
        const color = colorOf(piece);
        const type = typeOf(piece);
        if (type === "B") bishops[color] += 1;
        if (type === "P") pawnsByFile[color][col] += 1;
        if (type === "R") rooks.push({ color, col });
        if (type === "K") kings[color] = { row, col };
        const tableRow = color === "w" ? row : 7 - row;
        const value = VALUES[type] + (PIECE_SQUARES[type]?.[tableRow]?.[col] || 0);
        score += color === "b" ? value : -value;
      }
    }
    if (bishops.b >= 2) score += 35;
    if (bishops.w >= 2) score -= 35;
    for (let file = 0; file < 8; file += 1) {
      if (pawnsByFile.b[file] > 1) score -= 18 * (pawnsByFile.b[file] - 1);
      if (pawnsByFile.w[file] > 1) score += 18 * (pawnsByFile.w[file] - 1);
      if (pawnsByFile.b[file] && !pawnsByFile.b[file - 1] && !pawnsByFile.b[file + 1]) score -= 12;
      if (pawnsByFile.w[file] && !pawnsByFile.w[file - 1] && !pawnsByFile.w[file + 1]) score += 12;
    }
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const piece = position.board[row][col];
        if (typeOf(piece) !== "P") continue;
        const color = colorOf(piece);
        const enemy = other(color);
        let passed = true;
        for (let file = Math.max(0, col - 1); file <= Math.min(7, col + 1); file += 1) {
          const start = color === "b" ? row + 1 : row - 1;
          const end = color === "b" ? 7 : 0;
          for (let checkRow = start; color === "b" ? checkRow <= end : checkRow >= end; checkRow += color === "b" ? 1 : -1) {
            if (position.board[checkRow]?.[file] === `${enemy}P`) passed = false;
          }
        }
        if (passed) {
          const progress = color === "b" ? row : 7 - row;
          score += color === "b" ? 18 + progress * 9 : -(18 + progress * 9);
        }
      }
    }
    rooks.forEach((rook) => {
      if (!pawnsByFile.w[rook.col] && !pawnsByFile.b[rook.col]) score += rook.color === "b" ? 20 : -20;
      else if (!pawnsByFile[rook.color][rook.col]) score += rook.color === "b" ? 10 : -10;
    });
    for (const color of ["w", "b"]) {
      const king = kings[color];
      if (!king) continue;
      let shield = 0;
      const pawnRow = color === "w" ? king.row - 1 : king.row + 1;
      for (let col = Math.max(0, king.col - 1); col <= Math.min(7, king.col + 1); col += 1) {
        if (position.board[pawnRow]?.[col] === `${color}P`) shield += 1;
      }
      score += color === "b" ? shield * 8 : -shield * 8;
      const castled = color === "w" ? king.row === 7 && (king.col === 6 || king.col === 2) : king.row === 0 && (king.col === 6 || king.col === 2);
      if (castled) score += color === "b" ? 24 : -24;
    }
    const sideMoves = allLegalMoves(position, position.turn).length;
    score += position.turn === "b" ? sideMoves * 2 : -sideMoves * 2;
    if (isInCheck(position, "w")) score += 35;
    if (isInCheck(position, "b")) score -= 35;
    return score;
  }

  function orderedMoves(position, moves) {
    return moves.slice().sort((a, b) => moveGuess(position, b) - moveGuess(position, a));
  }

  function moveGuess(position, move) {
    const piece = position.board[move.from.row][move.from.col];
    const captured = move.enPassant ? `${other(colorOf(piece))}P` : position.board[move.to.row][move.to.col];
    let score = (VALUES[typeOf(captured)] || 0) * 10 - (VALUES[typeOf(piece)] || 0);
    if (move.promotion) score += VALUES.Q;
    if (move.castle) score += 45;
    return score;
  }

  function boardKey(position, depth, phase) {
    return `${phase}|${depth}|${position.turn}|${position.castling.wK ? 1 : 0}${position.castling.wQ ? 1 : 0}${position.castling.bK ? 1 : 0}${position.castling.bQ ? 1 : 0}|${position.enPassant ? `${position.enPassant.row},${position.enPassant.col}` : "-"}|${position.board.map((row) => row.map((piece) => piece || "--").join("")).join("/")}`;
  }

  function quiescence(position, alpha, beta, depth, cache) {
    updateGameStatus(position);
    const key = boardKey(position, depth, "q");
    if (cache.has(key)) return cache.get(key);
    const standPat = evaluate(position);
    if (position.winner || position.draw || depth <= 0) {
      cache.set(key, standPat);
      return standPat;
    }
    const maximizing = position.turn === "b";
    if (maximizing) {
      if (standPat >= beta) return beta;
      alpha = Math.max(alpha, standPat);
    } else {
      if (standPat <= alpha) return alpha;
      beta = Math.min(beta, standPat);
    }
    const tacticalMoves = orderedMoves(position, allLegalMoves(position, position.turn))
      .filter((move) => move.capture || move.enPassant || move.promotion);
    if (!tacticalMoves.length) {
      cache.set(key, standPat);
      return standPat;
    }
    let best = standPat;
    for (const move of tacticalMoves) {
      const next = clone(position);
      applyMove(next, clone(move));
      const score = quiescence(next, alpha, beta, depth - 1, cache);
      if (maximizing) {
        best = Math.max(best, score);
        alpha = Math.max(alpha, best);
      } else {
        best = Math.min(best, score);
        beta = Math.min(beta, best);
      }
      if (beta <= alpha) break;
    }
    cache.set(key, best);
    return best;
  }

  function minimax(position, depth, alpha, beta, cache) {
    updateGameStatus(position);
    if (position.winner || position.draw) return evaluate(position);
    if (depth <= 0) return quiescence(position, alpha, beta, 3, cache);
    const key = boardKey(position, depth, "m");
    if (cache.has(key)) return cache.get(key);
    const maximizing = position.turn === "b";
    const moves = orderedMoves(position, allLegalMoves(position, position.turn));
    if (!moves.length) return evaluate(position);
    if (maximizing) {
      let best = -Infinity;
      for (const move of moves) {
        const next = clone(position);
        applyMove(next, clone(move));
        best = Math.max(best, minimax(next, depth - 1, alpha, beta, cache));
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
      cache.set(key, best);
      return best;
    }
    let best = Infinity;
    for (const move of moves) {
      const next = clone(position);
      applyMove(next, clone(move));
      best = Math.min(best, minimax(next, depth - 1, alpha, beta, cache));
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    cache.set(key, best);
    return best;
  }

  function chooseComputerMove(moves) {
    const difficulty = storedDifficulty();
    if (difficulty === "easy") {
      const captures = moves.filter((move) => move.capture);
      const pool = captures.length && Math.random() < 0.65 ? captures : moves;
      return pool[Math.floor(Math.random() * pool.length)];
    }
    const depth = difficulty === "grandmaster" ? 4 : difficulty === "hard" ? 3 : 2;
    const jitter = difficulty === "grandmaster" ? 0 : difficulty === "hard" ? 4 : 22;
    const cache = new Map();
    const scored = orderedMoves(state, moves).map((move) => {
      const next = clone(state);
      applyMove(next, clone(move));
      return { move, score: minimax(next, depth - 1, -Infinity, Infinity, cache) + (Math.random() * jitter) };
    }).sort((a, b) => b.score - a.score);
    const best = scored[0].score;
    const nearBest = scored.filter((item) => best - item.score <= (difficulty === "grandmaster" ? 0 : difficulty === "hard" ? 8 : 35));
    return nearBest[Math.floor(Math.random() * nearBest.length)].move;
  }

  function computerMove() {
    if (isTwoPlayer() || state.winner || state.draw || state.turn !== "b") return;
    const moves = allLegalMoves(state, "b");
    if (!moves.length) {
      updateGameStatus(state);
      render();
      return;
    }
    applyMove(state, chooseComputerMove(moves));
    state.turn = "w";
    render();
  }

  function rememberUndo() {
    undoSnapshot = clone(state);
    els.undo.disabled = false;
  }

  function statusText() {
    if (state.draw) return t("chessStalemate");
    if (state.winner) return t("chessCheckmate", { winner: isTwoPlayer() ? t(state.winner === "w" ? "whiteWon" : "blackWon") : state.winner === "w" ? t("youWon") : t("computerWon") });
    if (isInCheck(state, state.turn)) return t("chessCheck");
    return isTwoPlayer() ? t(state.turn === "w" ? "whiteTurn" : "blackTurn") : state.turn === "w" ? t("yourTurn") : t("chessThinking");
  }

  function render() {
    els.board.innerHTML = "";
    const targetSet = new Set(legalTargets.map((move) => `${move.to.row},${move.to.col}`));
    const checkedKing = !state.winner && !state.draw && isInCheck(state, state.turn) ? findKing(state.board, state.turn) : null;
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const square = document.createElement("button");
        square.type = "button";
        square.className = `square ${(row + col) % 2 ? "dark" : "light"}`;
        square.dataset.row = String(row);
        square.dataset.col = String(col);
        const piece = state.board[row][col];
        if (selected && selected.row === row && selected.col === col) square.classList.add("selected");
        if (targetSet.has(`${row},${col}`)) square.classList.add(piece ? "capture" : "legal");
        if (checkedKing && checkedKing.row === row && checkedKing.col === col) square.classList.add("check");
        square.setAttribute("aria-label", t("chessSquare", { file: "abcdefgh"[col], rank: 8 - row }));
        if (piece) {
          const span = document.createElement("span");
          span.className = `piece ${piece[0] === "w" ? "white" : "black"}`;
          span.textContent = typeOf(piece);
          square.appendChild(span);
        }
        square.addEventListener("click", onSquareClick);
        els.board.appendChild(square);
      }
    }
    els.status.textContent = statusText();
    saveState();
  }

  function onSquareClick(event) {
    if ((!isTwoPlayer() && state.turn !== "w") || state.winner || state.draw) return;
    const row = Number(event.currentTarget.dataset.row);
    const col = Number(event.currentTarget.dataset.col);
    const chosenMove = legalTargets.find((move) => move.to.row === row && move.to.col === col);
    if (chosenMove) {
      rememberUndo();
      applyMove(state, chosenMove);
      selected = null;
      legalTargets = [];
      render();
      if (!isTwoPlayer() && !state.winner && !state.draw) {
        const difficulty = storedDifficulty();
        window.setTimeout(computerMove, difficulty === "grandmaster" ? 260 : difficulty === "hard" ? 180 : 120);
      }
      return;
    }
    if (colorOf(state.board[row][col]) === state.turn) {
      selected = { row, col };
      legalTargets = legalMovesFor(state, row, col);
    } else {
      selected = null;
      legalTargets = [];
    }
    render();
  }

  function startNewGame() {
    state = freshState();
    selected = null;
    legalTargets = [];
    undoSnapshot = null;
    els.undo.disabled = true;
    render();
  }

  function undo() {
    if (!undoSnapshot) return;
    state = clone(undoSnapshot);
    selected = null;
    legalTargets = [];
    undoSnapshot = null;
    els.undo.disabled = true;
    render();
  }

  function preventBrowserDoubleClick(event) {
    const now = Date.now();
    if (now - lastTapAt < 420) event.preventDefault();
    lastTapAt = now;
  }

  function preventViewportMove(event) { event.preventDefault(); }
  function preventGestureZoom(event) { event.preventDefault(); }
  function applyLanguage() { if (window.LMAG_I18N) window.LMAG_I18N.apply(document); render(); }
  function registerServiceWorker() {
    if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("../../sw.js").catch(() => {}));
  }

  els.newGame.addEventListener("click", startNewGame);
  els.undo.addEventListener("click", undo);
  if (els.difficulty) els.difficulty.addEventListener("change", saveDifficulty);
  if (els.mode) els.mode.addEventListener("change", saveMode);
  document.addEventListener("contextmenu", (event) => event.preventDefault());
  document.addEventListener("dblclick", preventBrowserDoubleClick, { capture: true });
  document.addEventListener("dragstart", (event) => event.preventDefault());
  document.addEventListener("touchmove", preventViewportMove, { passive: false });
  document.addEventListener("gesturestart", preventGestureZoom);
  document.addEventListener("gesturechange", preventGestureZoom);
  document.addEventListener("gestureend", preventGestureZoom);
  document.addEventListener("lmag:languagechange", applyLanguage);

  applyTheme();
  applyDifficulty();
  applyMode();
  state = loadState() || freshState();
  updateGameStatus(state);
  render();
  registerServiceWorker();
})();
