(function () {
  "use strict";

  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const KEY = "leave-me-alone-sudoku-current-game";
  const SAVE_VERSION = 2;
  const SIZE = 9;
  const BOX = 3;
  const board = document.getElementById("game-board");
  const status = document.getElementById("status");
  const undoButton = document.getElementById("undo-button");
  const t = (key, values) => window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key;
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

  function shuffle(items) {
    const copy = items.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swap]] = [copy[swap], copy[index]];
    }
    return copy;
  }

  function pattern(row, col) {
    return (BOX * (row % BOX) + Math.floor(row / BOX) + col) % SIZE;
  }

  function shuffledRowsOrCols() {
    return shuffle([0, 1, 2]).flatMap((group) => shuffle([0, 1, 2]).map((item) => group * BOX + item));
  }

  function makeSolution() {
    const rows = shuffledRowsOrCols();
    const cols = shuffledRowsOrCols();
    const numbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    return rows.map((row) => cols.map((col) => numbers[pattern(row, col)]));
  }

  function makePuzzle(solution) {
    const values = solution.map((row) => row.slice());
    const fixed = Array.from({ length: SIZE }, () => Array(SIZE).fill(1));
    const holes = shuffle(Array.from({ length: SIZE * SIZE }, (_, index) => index));
    const targetHoles = 44 + Math.floor(Math.random() * 6);
    holes.slice(0, targetHoles).forEach((index) => {
      const row = Math.floor(index / SIZE);
      const col = index % SIZE;
      values[row][col] = 0;
      fixed[row][col] = 0;
    });
    return { values, fixed };
  }

  function fresh() {
    const solution = makeSolution();
    const puzzle = makePuzzle(solution);
    return {
      version: SAVE_VERSION,
      values: puzzle.values,
      fixed: puzzle.fixed,
      solution
    };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function save() {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }

  function isValidSaved(saved) {
    return saved?.version === SAVE_VERSION &&
      Array.isArray(saved.values) && saved.values.length === SIZE &&
      Array.isArray(saved.fixed) && saved.fixed.length === SIZE &&
      Array.isArray(saved.solution) && saved.solution.length === SIZE;
  }

  function load() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(KEY));
      return isValidSaved(saved) ? saved : fresh();
    } catch {
      return fresh();
    }
  }

  function remember() {
    undoStack.push(clone(state));
    if (undoStack.length > 40) undoStack.shift();
  }

  function isConflict(row, col, value) {
    if (!value) return false;
    for (let index = 0; index < SIZE; index += 1) {
      if (index !== col && state.values[row][index] === value) return true;
      if (index !== row && state.values[index][col] === value) return true;
    }
    const startRow = Math.floor(row / BOX) * BOX;
    const startCol = Math.floor(col / BOX) * BOX;
    for (let r = startRow; r < startRow + BOX; r += 1) {
      for (let c = startCol; c < startCol + BOX; c += 1) {
        if ((r !== row || c !== col) && state.values[r][c] === value) return true;
      }
    }
    return false;
  }

  function render() {
    board.textContent = "";
    board.className = "board sudoku-grid";
    state.values.forEach((row, r) => row.forEach((value, c) => {
      const fixed = Boolean(state.fixed[r][c]);
      const cell = document.createElement("div");
      cell.className = `number-cell sudoku-cell ${fixed ? "fixed" : ""} ${isConflict(r, c, value) ? "conflict" : ""}`;
      if ((c + 1) % BOX === 0 && c < SIZE - 1) cell.classList.add("box-right");
      if ((r + 1) % BOX === 0 && r < SIZE - 1) cell.classList.add("box-bottom");
      if (fixed) {
        cell.textContent = value;
      } else {
        const input = document.createElement("input");
        input.inputMode = "numeric";
        input.pattern = "[1-9]*";
        input.maxLength = 1;
        input.value = value || "";
        input.setAttribute("aria-label", t("puzzleCell", { row: r + 1, col: c + 1 }));
        input.addEventListener("input", () => {
          remember();
          const next = Number(input.value.replace(/[^1-9]/g, "").slice(0, 1)) || 0;
          state.values[r][c] = next;
          input.value = next || "";
          save();
          undoButton.disabled = false;
          render();
        });
        cell.appendChild(input);
      }
      board.appendChild(cell);
    }));
    status.textContent = t("sudokuPrompt");
    undoButton.disabled = undoStack.length === 0;
  }

  function check() {
    const solved = state.values.flat().every((value, index) => value === state.solution[Math.floor(index / SIZE)][index % SIZE]);
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
