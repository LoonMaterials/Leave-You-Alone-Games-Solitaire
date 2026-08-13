(function () {
  "use strict";
  try {
    localStorage.setItem("leave-me-alone-games-last-game", JSON.stringify({ id: "peg-solitaire", href: "games/peg-solitaire/index.html", title: document.querySelector("h1")?.textContent?.trim() || "peg-solitaire", playedAt: Date.now() }));
  } catch {}

  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const KEY = "leave-me-alone-peg-solitaire-current-game";
  const SAVE_VERSION = 6;
  const LAYOUTS = [
    {
      id: "classic",
      mask: [
        [0, 0, 1, 1, 1, 0, 0],
        [0, 0, 1, 1, 1, 0, 0],
        [1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1],
        [0, 0, 1, 1, 1, 0, 0],
        [0, 0, 1, 1, 1, 0, 0],
      ],
      goals: [{ row: 3, col: 3 }],
    },
    {
      id: "diamond",
      mask: [
        [0, 0, 0, 1, 0, 0, 0],
        [0, 0, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 0, 0],
        [0, 0, 0, 1, 0, 0, 0],
      ],
      goals: [{ row: 3, col: 3 }],
    },
    {
      id: "wide",
      mask: [
        [0, 1, 1, 1, 1, 1, 0],
        [0, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 0],
        [0, 1, 1, 1, 1, 1, 0],
      ],
      goals: [{ row: 3, col: 3 }, { row: 2, col: 3 }, { row: 4, col: 3 }],
    },
    {
      id: "hourglass",
      mask: [
        [1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 0, 0],
        [0, 0, 0, 1, 0, 0, 0],
        [0, 0, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1],
      ],
      goals: [{ row: 3, col: 3 }, { row: 0, col: 3 }, { row: 6, col: 3 }],
    },
    {
      id: "plus",
      mask: [
        [0, 0, 0, 1, 0, 0, 0],
        [0, 0, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 0, 0],
        [0, 0, 0, 1, 0, 0, 0],
      ],
      goals: [{ row: 3, col: 3 }, { row: 1, col: 3 }, { row: 5, col: 3 }],
    },
    {
      id: "pyramid",
      mask: [
        [0, 0, 0, 1, 0, 0, 0],
        [0, 0, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1],
        [0, 0, 1, 1, 1, 0, 0],
        [0, 0, 1, 1, 1, 0, 0],
        [0, 0, 1, 1, 1, 0, 0],
      ],
      goals: [{ row: 3, col: 3 }, { row: 1, col: 3 }, { row: 5, col: 3 }],
    },
    {
      id: "castle",
      mask: [
        [1, 0, 1, 1, 1, 0, 1],
        [1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 0],
        [0, 1, 1, 1, 1, 1, 0],
        [0, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1],
        [1, 0, 1, 1, 1, 0, 1],
      ],
      goals: [{ row: 3, col: 3 }, { row: 2, col: 3 }, { row: 4, col: 3 }],
    },
    {
      id: "arrow",
      mask: [
        [0, 0, 1, 1, 1, 0, 0],
        [0, 0, 0, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1],
        [0, 0, 0, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 0, 0],
      ],
      goals: [{ row: 0, col: 3 }, { row: 3, col: 3 }, { row: 6, col: 3 }],
    },
    {
      id: "butterfly",
      mask: [
        [1, 1, 0, 1, 0, 1, 1],
        [1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1],
        [1, 1, 0, 1, 0, 1, 1],
      ],
      goals: [{ row: 3, col: 3 }, { row: 1, col: 3 }, { row: 5, col: 3 }],
    },
    {
      id: "fortress",
      mask: [
        [1, 1, 1, 0, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1],
        [1, 1, 0, 1, 0, 1, 1],
        [0, 1, 1, 1, 1, 1, 0],
        [1, 1, 0, 1, 0, 1, 1],
        [1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 0, 1, 1, 1],
      ],
      goals: [{ row: 3, col: 3 }, { row: 0, col: 4 }, { row: 6, col: 2 }],
    },
    {
      id: "lantern",
      mask: [
        [0, 1, 1, 1, 1, 1, 0],
        [1, 1, 0, 1, 0, 1, 1],
        [1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1],
        [1, 1, 0, 1, 0, 1, 1],
        [0, 1, 1, 1, 1, 1, 0],
      ],
      goals: [{ row: 3, col: 3 }, { row: 0, col: 3 }, { row: 6, col: 3 }],
    },
    {
      id: "windmill",
      mask: [
        [1, 1, 0, 1, 0, 1, 1],
        [1, 1, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 1, 1],
        [1, 1, 0, 1, 0, 1, 1],
      ],
      goals: [{ row: 3, col: 3 }, { row: 1, col: 3 }, { row: 5, col: 3 }],
    },
    {
      id: "diamond-wide",
      mask: [
        [0, 0, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 0, 0],
      ],
      goals: [{ row: 3, col: 3 }, { row: 2, col: 3 }, { row: 4, col: 3 }],
    },
  ];
  const DIRECTIONS = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  const board = document.getElementById("game-board");
  const status = document.getElementById("status");
  const undoButton = document.getElementById("undo-button");
  const t = (key, values) => window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key;
  let state;
  let undoStack = [];
  let selected = null;

  function applyTheme() {
    try {
      const theme = localStorage.getItem(THEME_KEY);
      const selectedTheme = THEMES.has(theme) ? theme : "colorblind";
      document.body.dataset.theme = selectedTheme;
      document.body.classList.remove("theme-colorblind", "theme-blue", "theme-grey", "theme-orange", "theme-purple", "theme-red", "theme-sand", "theme-midnight", "theme-rose");
      if (selectedTheme !== "green") document.body.classList.add(`theme-${selectedTheme}`);
    } catch {}
  }

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function layoutById(id) {
    return LAYOUTS.find((layout) => layout.id === id) || LAYOUTS[0];
  }

  function emptyGrid() {
    return Array.from({ length: 7 }, () => Array(7).fill(0));
  }

  function maskCount(mask) {
    return mask.flat().filter(Boolean).length;
  }

  function reverseMoves(pegs, mask) {
    const moves = [];
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 7; col += 1) {
        if (!pegs[row][col]) continue;
        DIRECTIONS.forEach(([dr, dc]) => {
          const midRow = row - dr;
          const midCol = col - dc;
          const toRow = row - dr * 2;
          const toCol = col - dc * 2;
          if (isMaskValid(mask, midRow, midCol) && isMaskValid(mask, toRow, toCol) && !pegs[midRow][midCol] && !pegs[toRow][toCol]) {
            moves.push({ from: { row, col }, mid: { row: midRow, col: midCol }, to: { row: toRow, col: toCol } });
          }
        });
      }
    }
    return moves;
  }

  function buildPlayableBoard(layout) {
    const targetCount = maskCount(layout.mask);
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const pegs = emptyGrid();
      const goal = randomItem(layout.goals);
      pegs[goal.row][goal.col] = 1;
      while (pegs.flat().filter(Boolean).length < targetCount) {
        const choices = reverseMoves(pegs, layout.mask);
        if (!choices.length) break;
        const move = randomItem(choices);
        pegs[move.from.row][move.from.col] = 0;
        pegs[move.mid.row][move.mid.col] = 1;
        pegs[move.to.row][move.to.col] = 1;
      }
      if (pegs.flat().filter(Boolean).length >= Math.min(18, targetCount - 1) && forwardMoves(pegs, layout.mask).length) return pegs;
    }
    return layout.mask.map((row, rowIndex) => row.map((valid, colIndex) => valid && !(rowIndex === 3 && colIndex === 3) ? 1 : 0));
  }

  function fresh() {
    const layout = randomItem(LAYOUTS);
    return { version: SAVE_VERSION, layout: layout.id, pegs: buildPlayableBoard(layout) };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (saved?.version !== SAVE_VERSION || !Array.isArray(saved.pegs) || saved.pegs.length !== 7 || !layoutById(saved.layout)) return fresh();
      return saved;
    } catch {
      return fresh();
    }
  }

  function remember() {
    undoStack.push(clone(state));
    undoStack = undoStack.slice(-40);
  }

  function currentLayout() {
    return layoutById(state?.layout);
  }

  function isMaskValid(mask, row, col) {
    return Boolean(mask[row]?.[col]);
  }

  function isValid(row, col) {
    return isMaskValid(currentLayout().mask, row, col);
  }

  function pegCount() {
    return state.pegs.flat().filter(Boolean).length;
  }

  function legalMovesFrom(row, col) {
    if (!state.pegs[row]?.[col]) return [];
    return DIRECTIONS.flatMap(([dr, dc]) => {
      const midRow = row + dr;
      const midCol = col + dc;
      const toRow = row + dr * 2;
      const toCol = col + dc * 2;
      if (isValid(toRow, toCol) && state.pegs[midRow]?.[midCol] && !state.pegs[toRow][toCol]) {
        return [{ from: { row, col }, mid: { row: midRow, col: midCol }, to: { row: toRow, col: toCol } }];
      }
      return [];
    });
  }

  function forwardMoves(pegs, mask) {
    const moves = [];
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 7; col += 1) {
        if (!pegs[row][col]) continue;
        DIRECTIONS.forEach(([dr, dc]) => {
          const midRow = row + dr;
          const midCol = col + dc;
          const toRow = row + dr * 2;
          const toCol = col + dc * 2;
          if (isMaskValid(mask, toRow, toCol) && pegs[midRow]?.[midCol] && !pegs[toRow][toCol]) {
            moves.push({ from: { row, col }, mid: { row: midRow, col: midCol }, to: { row: toRow, col: toCol } });
          }
        });
      }
    }
    return moves;
  }

  function allLegalMoves() {
    const moves = [];
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 7; col += 1) moves.push(...legalMovesFrom(row, col));
    }
    return moves;
  }

  function sameCell(a, row, col) {
    return a && a.row === row && a.col === col;
  }

  function makeMove(move) {
    remember();
    state.pegs[move.from.row][move.from.col] = 0;
    state.pegs[move.mid.row][move.mid.col] = 0;
    state.pegs[move.to.row][move.to.col] = 1;
    selected = null;
    save();
    render();
  }

  function clickHole(row, col) {
    if (!isValid(row, col)) return;
    if (selected) {
      const move = legalMovesFrom(selected.row, selected.col).find((candidate) => sameCell(candidate.to, row, col));
      if (move) {
        makeMove(move);
        return;
      }
    }
    selected = state.pegs[row][col] ? { row, col } : null;
    render();
  }

  function statusText() {
    if (pegCount() === 1) return t("puzzleSolved");
    if (!allLegalMoves().length) return t("puzzleTryAgain");
    return t("pegPrompt");
  }

  function render() {
    board.textContent = "";
    board.className = "board peg-board";
    const legalTargets = new Set(selected ? legalMovesFrom(selected.row, selected.col).map((move) => `${move.to.row},${move.to.col}`) : []);
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 7; col += 1) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `peg-cell ${isValid(row, col) ? "" : "invalid"} ${state.pegs[row][col] ? "has-peg" : ""} ${sameCell(selected, row, col) ? "selected" : ""} ${legalTargets.has(`${row},${col}`) ? "legal" : ""}`;
        button.setAttribute("aria-label", t("pegHole", { number: row * 7 + col + 1 }));
        button.disabled = !isValid(row, col);
        button.addEventListener("click", () => clickHole(row, col));
        if (state.pegs[row][col]) {
          const peg = document.createElement("span");
          peg.className = "peg";
          button.appendChild(peg);
        }
        board.appendChild(button);
      }
    }
    status.textContent = statusText();
    undoButton.disabled = undoStack.length === 0;
  }

  function check() {
    status.textContent = statusText();
  }

  function newGame() {
    state = fresh();
    undoStack = [];
    selected = null;
    save();
    render();
  }

  function undo() {
    if (!undoStack.length) return;
    state = undoStack.pop();
    selected = null;
    save();
    render();
  }

  applyTheme();
  state = load();
  document.getElementById("check-button").addEventListener("click", check);
  document.getElementById("new-game-button").addEventListener("click", newGame);
  undoButton.addEventListener("click", undo);
  document.addEventListener("lmag:languagechange", render);
  render();
})();
