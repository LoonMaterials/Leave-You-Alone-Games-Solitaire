(function () {
  "use strict";
  try {
    localStorage.setItem("leave-me-alone-games-last-game", JSON.stringify({ id: "sudoku", href: "games/sudoku/index.html", title: document.querySelector("h1")?.textContent?.trim() || "sudoku", playedAt: Date.now() }));
  } catch {}

  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const KEY = "leave-me-alone-sudoku-current-game";
  const DIFFICULTY_KEY = "leave-me-alone-sudoku-difficulty";
  const SAVE_VERSION = 4;
  const SIZE = 9;
  const BOX = 3;
  const DIFFICULTIES = {
    easy: { min: 40, max: 45 },
    medium: { min: 30, max: 34 },
    hard: { min: 24, max: 28 }
  };
  const board = document.getElementById("game-board");
  const status = document.getElementById("status");
  const undoButton = document.getElementById("undo-button");
  const difficultySelect = document.getElementById("difficulty-select");
  const t = (key, values) => window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key;
  let undoStack = [];
  let state;

  function applyTheme() {
    try {
      const theme = localStorage.getItem(THEME_KEY);
      const selectedTheme = THEMES.has(theme) ? theme : "colorblind";
      document.body.dataset.theme = selectedTheme;
      document.body.classList.remove("theme-colorblind", "theme-blue", "theme-grey", "theme-orange", "theme-purple", "theme-red", "theme-sand", "theme-midnight", "theme-rose");
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

  function allowedValues(values, row, col) {
    const used = new Set();
    for (let index = 0; index < SIZE; index += 1) {
      if (values[row][index]) used.add(values[row][index]);
      if (values[index][col]) used.add(values[index][col]);
    }
    const startRow = Math.floor(row / BOX) * BOX;
    const startCol = Math.floor(col / BOX) * BOX;
    for (let r = startRow; r < startRow + BOX; r += 1) {
      for (let c = startCol; c < startCol + BOX; c += 1) {
        if (values[r][c]) used.add(values[r][c]);
      }
    }
    return shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((value) => !used.has(value)));
  }

  function countSolutions(values, limit = 2) {
    const grid = values.map((row) => row.slice());
    let count = 0;

    function findCell() {
      let best = null;
      let bestChoices = null;
      for (let row = 0; row < SIZE; row += 1) {
        for (let col = 0; col < SIZE; col += 1) {
          if (grid[row][col]) continue;
          const choices = allowedValues(grid, row, col);
          if (!choices.length) return { row, col, choices };
          if (!bestChoices || choices.length < bestChoices.length) {
            best = { row, col };
            bestChoices = choices;
          }
        }
      }
      return best ? { ...best, choices: bestChoices } : null;
    }

    function solve() {
      if (count >= limit) return;
      const cell = findCell();
      if (!cell) {
        count += 1;
        return;
      }
      if (!cell.choices.length) return;
      cell.choices.forEach((value) => {
        grid[cell.row][cell.col] = value;
        solve();
        grid[cell.row][cell.col] = 0;
      });
    }

    solve();
    return count;
  }

  function storedDifficulty() {
    try {
      const difficulty = localStorage.getItem(DIFFICULTY_KEY);
      return DIFFICULTIES[difficulty] ? difficulty : "medium";
    } catch {
      return "medium";
    }
  }

  function setStoredDifficulty(difficulty) {
    const next = DIFFICULTIES[difficulty] ? difficulty : "medium";
    try {
      localStorage.setItem(DIFFICULTY_KEY, next);
    } catch {}
    return next;
  }

  function makePuzzle(solution, difficulty = storedDifficulty()) {
    const values = solution.map((row) => row.slice());
    const fixed = Array.from({ length: SIZE }, () => Array(SIZE).fill(1));
    const holes = shuffle(Array.from({ length: Math.ceil(SIZE * SIZE / 2) }, (_, index) => index));
    const range = DIFFICULTIES[difficulty] || DIFFICULTIES.medium;
    const targetGivens = range.min + Math.floor(Math.random() * (range.max - range.min + 1));
    holes.forEach((index) => {
      if (values.flat().filter(Boolean).length <= targetGivens) return;
      const row = Math.floor(index / SIZE);
      const col = index % SIZE;
      const pairRow = SIZE - 1 - row;
      const pairCol = SIZE - 1 - col;
      const removed = [[row, col], [pairRow, pairCol]]
        .filter(([r, c], i, cells) => values[r][c] && cells.findIndex(([er, ec]) => er === r && ec === c) === i)
        .map(([r, c]) => [r, c, values[r][c]]);
      if (!removed.length) return;
      removed.forEach(([r, c]) => {
        values[r][c] = 0;
        fixed[r][c] = 0;
      });
      if (countSolutions(values) !== 1) {
        removed.forEach(([r, c, value]) => {
          values[r][c] = value;
          fixed[r][c] = 1;
        });
      }
    });
    return { values, fixed };
  }

  function fresh() {
    const difficulty = setStoredDifficulty(difficultySelect?.value || storedDifficulty());
    const solution = makeSolution();
    const puzzle = makePuzzle(solution, difficulty);
    return {
      version: SAVE_VERSION,
      difficulty,
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
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }

  function isValidSaved(saved) {
    return saved?.version === SAVE_VERSION &&
      DIFFICULTIES[saved.difficulty] &&
      Array.isArray(saved.values) && saved.values.length === SIZE &&
      Array.isArray(saved.fixed) && saved.fixed.length === SIZE &&
      Array.isArray(saved.solution) && saved.solution.length === SIZE;
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
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
    if (difficultySelect) difficultySelect.value = state.difficulty || storedDifficulty();
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
  if (difficultySelect) {
    difficultySelect.value = storedDifficulty();
    difficultySelect.addEventListener("change", () => {
      setStoredDifficulty(difficultySelect.value);
      newGame();
    });
  }
  state = load();
  save();
  document.getElementById("check-button").addEventListener("click", check);
  document.getElementById("new-game-button").addEventListener("click", newGame);
  undoButton.addEventListener("click", undo);
  document.addEventListener("lmag:languagechange", render);
  render();
})();
