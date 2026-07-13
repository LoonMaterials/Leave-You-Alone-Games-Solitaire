(function () {
  "use strict";

  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const KEY = "leave-me-alone-kakuro-current-game";
  const SAVE_VERSION = 3;
  const board = document.getElementById("game-board");
  const status = document.getElementById("status");
  const undoButton = document.getElementById("undo-button");
  const t = (key, values) => window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key;
  const TEMPLATES = [
    { id: "kakuro-01", blocks: [[1,1,1,1,1,1,1,1,1,1],[1,1,1,1,0,0,1,1,1,1],[1,1,1,0,0,0,1,1,1,1],[1,1,1,0,0,1,1,1,1,1],[1,0,0,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0,0,1],[1,0,0,0,1,0,0,0,1,1],[1,1,1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1]] },
    { id: "kakuro-02", blocks: [[1,1,1,1,1,1,1,1],[1,1,0,0,0,0,1,1],[1,1,0,0,0,0,1,1],[1,1,0,0,0,0,1,1],[1,0,0,0,0,0,0,1],[1,0,0,0,1,0,0,1],[1,1,1,1,1,0,0,1],[1,1,1,1,1,1,1,1]] },
    { id: "kakuro-03", blocks: [[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1],[1,0,0,0,0,0,1,1],[1,0,0,0,0,0,0,1],[1,1,0,0,0,0,0,1],[1,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,1],[1,1,1,1,1,1,1,1]] },
    { id: "kakuro-04", blocks: [[1,1,1,1,1,1,1,1,1],[1,1,1,0,0,1,0,0,1],[1,0,0,0,0,1,0,0,1],[1,0,0,0,0,0,0,0,1],[1,0,0,0,1,0,0,0,1],[1,0,0,1,1,1,1,1,1],[1,0,0,1,0,0,0,0,1],[1,1,1,1,0,0,0,0,1],[1,1,1,1,1,1,1,1,1]] },
    { id: "kakuro-05", blocks: [[1,1,1,1,1,1,1,1],[1,1,1,1,1,0,0,1],[1,1,0,0,1,0,0,1],[1,1,0,0,1,0,0,1],[1,1,1,1,0,0,0,1],[1,0,0,0,0,0,1,1],[1,0,0,0,1,1,1,1],[1,1,1,1,1,1,1,1]] },
    { id: "kakuro-06", blocks: [[1,1,1,1,1,1,1,1],[1,1,1,0,0,0,0,1],[1,1,1,0,0,0,0,1],[1,0,0,0,0,1,1,1],[1,0,0,0,1,0,0,1],[1,1,1,1,1,0,0,1],[1,1,1,1,1,0,0,1],[1,1,1,1,1,1,1,1]] },
    { id: "kakuro-07", blocks: [[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1],[1,0,0,0,0,1,1,1],[1,0,0,0,0,1,1,1],[1,0,0,0,1,0,0,1],[1,1,0,0,0,0,0,1],[1,1,1,1,0,0,0,1],[1,1,1,1,1,1,1,1]] },
    { id: "kakuro-08", blocks: [[1,1,1,1,1,1,1,1,1],[1,0,0,0,1,1,1,1,1],[1,0,0,0,0,0,0,1,1],[1,0,0,1,0,0,0,1,1],[1,0,0,1,0,0,1,1,1],[1,0,0,1,1,1,1,1,1],[1,0,0,0,0,1,0,0,1],[1,0,0,0,0,1,0,0,1],[1,1,1,1,1,1,1,1,1]] },
    { id: "kakuro-09", blocks: [[1,1,1,1,1,1,1,1],[1,0,0,0,0,1,1,1],[1,0,0,0,0,1,1,1],[1,1,1,1,0,0,1,1],[1,1,1,0,0,0,0,1],[1,1,1,0,0,0,0,1],[1,1,1,0,0,0,0,1],[1,1,1,1,1,1,1,1]] },
    { id: "kakuro-10", blocks: [[1,1,1,1,1,1,1,1,1],[1,1,1,0,0,1,1,1,1],[1,1,1,0,0,1,1,1,1],[1,1,1,0,0,0,0,0,1],[1,1,1,0,0,0,0,0,1],[1,1,1,0,0,0,0,0,1],[1,1,1,0,0,0,0,1,1],[1,1,1,0,0,0,1,1,1],[1,1,1,1,1,1,1,1,1]] },
    { id: "kakuro-11", blocks: [[1,1,1,1,1,1,1,1],[1,1,1,0,0,1,1,1],[1,0,0,0,0,1,1,1],[1,0,0,0,0,1,1,1],[1,0,0,0,0,1,1,1],[1,1,0,0,0,1,1,1],[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1]] },
    { id: "kakuro-12", blocks: [[1,1,1,1,1,1,1,1,1,1],[1,0,0,1,1,1,1,1,1,1],[1,0,0,0,0,0,0,1,1,1],[1,0,0,0,0,0,0,0,1,1],[1,0,0,1,0,0,0,0,1,1],[1,1,0,0,0,0,1,0,0,1],[1,1,0,0,0,0,0,0,0,1],[1,1,0,0,0,0,0,1,1,1],[1,1,1,1,1,0,0,1,1,1],[1,1,1,1,1,1,1,1,1,1]] },
    { id: "kakuro-13", blocks: [[1,1,1,1,1,1,1,1],[1,1,0,0,1,0,0,1],[1,0,0,0,1,0,0,1],[1,0,0,0,1,1,1,1],[1,1,1,0,0,0,1,1],[1,1,0,0,0,0,1,1],[1,1,0,0,1,1,1,1],[1,1,1,1,1,1,1,1]] },
    { id: "kakuro-14", blocks: [[1,1,1,1,1,1,1,1,1],[1,0,0,1,1,1,1,1,1],[1,0,0,1,1,1,0,0,1],[1,0,0,1,0,0,0,0,1],[1,1,1,1,0,0,0,0,1],[1,1,1,1,0,0,0,0,1],[1,1,1,0,0,0,0,0,1],[1,1,1,0,0,0,0,0,1],[1,1,1,1,1,1,1,1,1]] },
    { id: "kakuro-15", blocks: [[1,1,1,1,1,1,1,1,1],[1,0,0,0,0,1,0,0,1],[1,0,0,0,0,1,0,0,1],[1,1,0,0,1,0,0,0,1],[1,0,0,0,0,0,0,0,1],[1,0,0,1,0,0,0,0,1],[1,1,1,0,0,0,1,1,1],[1,1,1,0,0,0,1,1,1],[1,1,1,1,1,1,1,1,1]] },
    { id: "kakuro-16", blocks: [[1,1,1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1],[1,1,1,0,0,0,1,1,1,1],[1,1,1,0,0,0,1,1,1,1],[1,1,1,0,0,0,1,0,0,1],[1,1,1,1,1,0,0,0,0,1],[1,1,1,1,1,0,0,1,1,1],[1,1,1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1]] },
    { id: "kakuro-17", blocks: [[1,1,1,1,1,1,1],[1,0,0,0,0,0,1],[1,0,0,0,0,0,1],[1,0,0,1,0,0,1],[1,1,1,1,0,0,1],[1,1,1,1,0,0,1],[1,1,1,1,1,1,1]] },
    { id: "kakuro-18", blocks: [[1,1,1,1,1,1,1],[1,0,0,1,0,0,1],[1,0,0,0,0,0,1],[1,0,0,0,0,0,1],[1,1,1,0,0,0,1],[1,1,1,1,0,0,1],[1,1,1,1,1,1,1]] },
  ];
  let undoStack = [];
  let state;

  function applyTheme() {
    try {
      const theme = localStorage.getItem(THEME_KEY);
      const selectedTheme = THEMES.has(theme) ? theme : "colorblind";
      document.body.classList.remove("theme-colorblind", "theme-blue", "theme-grey", "theme-orange");
      if (selectedTheme !== "green") document.body.classList.add(`theme-${selectedTheme}`);
    } catch {}
  }

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function key(row, col) {
    return `${row},${col}`;
  }

  function shuffledDigits() {
    const digits = [1,2,3,4,5,6,7,8,9];
    for (let index = digits.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [digits[index], digits[swap]] = [digits[swap], digits[index]];
    }
    return digits;
  }

  function isOpen(puzzle, row, col) {
    return puzzle.blocks[row]?.[col] === 0;
  }

  function clueFor(puzzle, row, col) {
    const down = [];
    const across = [];
    if (!isOpen(puzzle, row + 1, col)) {
      // no down clue
    } else if (!isOpen(puzzle, row - 1, col)) {
      let next = row + 1;
      while (isOpen(puzzle, next, col)) {
        down.push(puzzle.solution[key(next, col)]);
        next += 1;
      }
    }
    if (!isOpen(puzzle, row, col + 1)) {
      // no across clue
    } else if (!isOpen(puzzle, row, col - 1)) {
      let next = col + 1;
      while (isOpen(puzzle, row, next)) {
        across.push(puzzle.solution[key(row, next)]);
        next += 1;
      }
    }
    return {
      down: down.length > 1 ? down.reduce((sum, value) => sum + value, 0) : null,
      across: across.length > 1 ? across.reduce((sum, value) => sum + value, 0) : null,
    };
  }

  function runsForCell(puzzle, row, col) {
    const runs = [];
    let start = col;
    while (isOpen(puzzle, row, start - 1)) start -= 1;
    let cells = [];
    let scan = start;
    while (isOpen(puzzle, row, scan)) {
      cells.push(key(row, scan));
      scan += 1;
    }
    if (cells.length > 1) runs.push(cells);
    start = row;
    while (isOpen(puzzle, start - 1, col)) start -= 1;
    cells = [];
    scan = start;
    while (isOpen(puzzle, scan, col)) {
      cells.push(key(scan, col));
      scan += 1;
    }
    if (cells.length > 1) runs.push(cells);
    return runs;
  }

  function allRuns(puzzle) {
    const runs = [];
    for (let row = 0; row < puzzle.size; row += 1) {
      for (let col = 0; col < puzzle.size; col += 1) {
        if (isOpen(puzzle, row, col) && !isOpen(puzzle, row, col - 1)) {
          const cells = [];
          let scan = col;
          while (isOpen(puzzle, row, scan)) {
            cells.push(key(row, scan));
            scan += 1;
          }
          if (cells.length > 1) runs.push(cells);
        }
        if (isOpen(puzzle, row, col) && !isOpen(puzzle, row - 1, col)) {
          const cells = [];
          let scan = row;
          while (isOpen(puzzle, scan, col)) {
            cells.push(key(scan, col));
            scan += 1;
          }
          if (cells.length > 1) runs.push(cells);
        }
      }
    }
    return runs;
  }

  function generateSolution(blocks) {
    const puzzle = { size: blocks.length, blocks, solution: {} };
    const runs = allRuns(puzzle);
    const runIdsByCell = new Map();
    runs.forEach((cells, index) => {
      cells.forEach((cell) => {
        if (!runIdsByCell.has(cell)) runIdsByCell.set(cell, []);
        runIdsByCell.get(cell).push(index);
      });
    });
    const cells = [];
    for (let row = 0; row < puzzle.size; row += 1) {
      for (let col = 0; col < puzzle.size; col += 1) {
        if (isOpen(puzzle, row, col)) cells.push(key(row, col));
      }
    }
    cells.sort((a, b) => (runIdsByCell.get(b)?.length || 0) - (runIdsByCell.get(a)?.length || 0));
    const usedByRun = runs.map(() => new Set());
    const solution = {};

    function place(index) {
      if (index >= cells.length) return true;
      const cell = cells[index];
      const runIds = runIdsByCell.get(cell) || [];
      for (const digit of shuffledDigits()) {
        if (runIds.some((runId) => usedByRun[runId].has(digit))) continue;
        solution[cell] = digit;
        runIds.forEach((runId) => usedByRun[runId].add(digit));
        if (place(index + 1)) return true;
        runIds.forEach((runId) => usedByRun[runId].delete(digit));
        delete solution[cell];
      }
      return false;
    }

    return place(0) ? solution : null;
  }

  function makePuzzle() {
    const templates = TEMPLATES.slice();
    for (let index = templates.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [templates[index], templates[swap]] = [templates[swap], templates[index]];
    }
    for (const template of templates) {
      const blocks = clone(template.blocks);
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const solution = generateSolution(blocks);
        if (solution) return { id: `${template.id}-${Date.now()}-${attempt}`, size: blocks.length, blocks, solution };
      }
    }
    const fallback = clone(TEMPLATES[0].blocks);
    return { id: "kakuro-fallback", size: fallback.length, blocks: fallback, solution: generateSolution(fallback) || {} };
  }

  function emptyValues(puzzle) {
    const values = {};
    Object.keys(puzzle.solution).forEach((cell) => { values[cell] = ""; });
    return values;
  }

  function fresh() {
    const puzzle = makePuzzle();
    return { version: SAVE_VERSION, puzzle, values: emptyValues(puzzle) };
  }

  function currentPuzzle() {
    return state?.puzzle || fresh().puzzle;
  }

  function save() {
    try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }

  function load() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(KEY));
      if (saved?.version !== SAVE_VERSION || !saved.puzzle?.solution || !saved.values) return fresh();
      return saved;
    } catch {
      return fresh();
    }
  }

  function remember() {
    undoStack.push(clone(state));
    if (undoStack.length > 40) undoStack.shift();
  }

  function runHasConflict(puzzle, cells) {
    const values = cells.map((cell) => Number(state.values[cell]) || 0).filter(Boolean);
    return values.length !== new Set(values).size;
  }

  function runIsSolved(puzzle, cells) {
    const values = cells.map((cell) => Number(state.values[cell]) || 0);
    if (values.some((value) => value < 1 || value > 9)) return false;
    if (values.length !== new Set(values).size) return false;
    const target = cells.reduce((sum, cell) => sum + puzzle.solution[cell], 0);
    const actual = values.reduce((sum, value) => sum + value, 0);
    return actual === target;
  }

  function isConflict(puzzle, row, col) {
    const value = Number(state.values[key(row, col)]) || 0;
    if (!value) return false;
    return runsForCell(puzzle, row, col).some((cells) => runHasConflict(puzzle, cells));
  }

  function renderClue(clue) {
    const cell = document.createElement("div");
    cell.className = "kakuro-clue";
    if (clue.down) {
      const down = document.createElement("span");
      down.className = "clue-down";
      down.textContent = `↓${clue.down}`;
      cell.appendChild(down);
    }
    if (clue.across) {
      const across = document.createElement("span");
      across.className = "clue-across";
      across.textContent = `→${clue.across}`;
      cell.appendChild(across);
    }
    return cell;
  }

  function render() {
    const puzzle = currentPuzzle();
    board.textContent = "";
    board.className = "board kakuro-grid";
    board.style.setProperty("--kakuro-size", String(puzzle.size));
    for (let row = 0; row < puzzle.size; row += 1) {
      for (let col = 0; col < puzzle.size; col += 1) {
        if (!isOpen(puzzle, row, col)) {
          board.appendChild(renderClue(clueFor(puzzle, row, col)));
          continue;
        }
        const cell = document.createElement("div");
        cell.className = `kakuro-cell ${isConflict(puzzle, row, col) ? "conflict" : ""}`;
        const input = document.createElement("input");
        input.inputMode = "numeric";
        input.pattern = "[1-9]*";
        input.maxLength = 1;
        input.value = state.values[key(row, col)] || "";
        input.setAttribute("aria-label", t("puzzleCell", { row: row + 1, col: col + 1 }));
        input.addEventListener("input", () => {
          remember();
          state.values[key(row, col)] = input.value.replace(/[^1-9]/g, "").slice(0, 1);
          save();
          undoButton.disabled = false;
          render();
        });
        cell.appendChild(input);
        board.appendChild(cell);
      }
    }
    status.textContent = t("kakuroPrompt");
    undoButton.disabled = undoStack.length === 0;
  }

  function check() {
    const puzzle = currentPuzzle();
    const solved = allRuns(puzzle).every((cells) => runIsSolved(puzzle, cells));
    status.textContent = t(solved ? "puzzleSolved" : "puzzleTryAgain");
  }

  function newGame() {
    state = fresh();
    undoStack = [];
    save();
    render();
  }

  function undo() {
    if (!undoStack.length) return;
    state = undoStack.pop();
    save();
    render();
  }

  applyTheme();
  state = load();
  save();
  document.getElementById("check-button").addEventListener("click", check);
  document.getElementById("new-game-button").addEventListener("click", newGame);
  undoButton.addEventListener("click", undo);
  document.addEventListener("lmag:languagechange", render);
  render();
})();
