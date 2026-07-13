(function () {
  "use strict";

  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const KEY = "leave-me-alone-nonograms-current-game";
  const SAVE_VERSION = 3;
  const SIZE = 10;
  const board = document.getElementById("game-board");
  const status = document.getElementById("status");
  const undoButton = document.getElementById("undo-button");
  const t = (key, values) => window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key;

  let state;
  let undoStack = [];

  function applyTheme() {
    try {
      const theme = localStorage.getItem(THEME_KEY);
      const selectedTheme = THEMES.has(theme) ? theme : "colorblind";
      document.body.classList.remove("theme-colorblind", "theme-blue", "theme-grey", "theme-orange");
      if (selectedTheme !== "green") document.body.classList.add(`theme-${selectedTheme}`);
    } catch {}
  }

  function emptyGrid(value = 0) {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(value));
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function rand(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function stamp(grid, row, col, radius = 1) {
    for (let r = row - radius; r <= row + radius; r += 1) {
      for (let c = col - radius; c <= col + radius; c += 1) {
        if (r < 0 || c < 0 || r >= SIZE || c >= SIZE) continue;
        if (Math.abs(r - row) + Math.abs(c - col) <= radius + 1) grid[r][c] = 1;
      }
    }
  }

  function mirror(grid) {
    const mode = Math.random();
    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        if (!grid[r][c]) continue;
        if (mode < 0.45) grid[r][SIZE - 1 - c] = 1;
        else if (mode < 0.75) grid[SIZE - 1 - r][c] = 1;
        else {
          grid[r][SIZE - 1 - c] = 1;
          grid[SIZE - 1 - r][c] = 1;
        }
      }
    }
  }

  function addLines(grid) {
    const count = rand(2, 4);
    for (let i = 0; i < count; i += 1) {
      const horizontal = Math.random() < 0.5;
      const fixed = rand(1, SIZE - 2);
      const start = rand(0, 3);
      const end = rand(6, SIZE - 1);
      for (let n = start; n <= end; n += 1) {
        const row = horizontal ? fixed : n;
        const col = horizontal ? n : fixed;
        grid[row][col] = 1;
      }
    }
  }

  function addBlobs(grid) {
    const count = rand(3, 6);
    for (let i = 0; i < count; i += 1) {
      stamp(grid, rand(1, SIZE - 2), rand(1, SIZE - 2), rand(1, 2));
    }
  }

  function cellCount(grid) {
    return grid.flat().filter(Boolean).length;
  }

  function makeSolution() {
    let grid;
    let attempts = 0;
    do {
      grid = emptyGrid();
      addBlobs(grid);
      addLines(grid);
      mirror(grid);
      attempts += 1;
    } while ((cellCount(grid) < 22 || cellCount(grid) > 62) && attempts < 30);
    return grid;
  }

  function fresh() {
    return {
      version: SAVE_VERSION,
      size: SIZE,
      solution: makeSolution(),
      marks: emptyGrid(),
      solved: false
    };
  }

  function isValidSave(saved) {
    return saved?.version === SAVE_VERSION &&
      saved?.size === SIZE &&
      saved?.solution?.length === SIZE &&
      saved?.marks?.length === SIZE;
  }

  function save() {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }

  function load() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(KEY));
      return isValidSave(saved) ? saved : fresh();
    } catch {
      return fresh();
    }
  }

  function remember() {
    undoStack.push(clone(state));
    if (undoStack.length > 50) undoStack.shift();
  }

  function clues(line) {
    const runs = [];
    let run = 0;
    line.forEach((cell) => {
      if (cell) run += 1;
      else if (run) {
        runs.push(run);
        run = 0;
      }
    });
    if (run) runs.push(run);
    return runs.length ? runs.join(" ") : "0";
  }

  function label(text) {
    const el = document.createElement("div");
    el.className = "clue-label";
    el.textContent = text;
    return el;
  }

  function markClass(mark) {
    if (mark === 1) return "filled";
    if (mark === 2) return "marked";
    return "";
  }

  function render() {
    board.textContent = "";
    board.className = "board";
    board.style.setProperty("--nonogram-size", String(SIZE));
    const wrap = document.createElement("div");
    wrap.className = "nonogram-wrap";

    const top = document.createElement("div");
    top.className = "top-clues";
    for (let c = 0; c < SIZE; c += 1) top.appendChild(label(clues(state.solution.map((row) => row[c]))));

    const side = document.createElement("div");
    side.className = "side-clues";
    state.solution.forEach((row) => side.appendChild(label(clues(row))));

    const grid = document.createElement("div");
    grid.className = "nonogram-grid";
    state.marks.forEach((row, r) => row.forEach((mark, c) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `nonogram-cell ${markClass(mark)}`.trim();
      button.textContent = mark === 2 ? "×" : "";
      button.setAttribute("aria-label", t("puzzleCell", { row: r + 1, col: c + 1 }));
      button.addEventListener("click", () => {
        remember();
        state.marks[r][c] = (state.marks[r][c] + 1) % 3;
        state.solved = false;
        save();
        render();
      });
      grid.appendChild(button);
    }));

    wrap.appendChild(top);
    wrap.appendChild(side);
    wrap.appendChild(grid);
    board.appendChild(wrap);
    status.textContent = state.solved ? t("puzzleSolved") : t("nonogramsPrompt");
    undoButton.disabled = undoStack.length === 0;
  }

  function check() {
    const solved = state.marks.flat().every((value, i) => {
      const row = Math.floor(i / SIZE);
      const col = i % SIZE;
      return (value === 1 ? 1 : 0) === state.solution[row][col];
    });
    state.solved = solved;
    save();
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

  function preventBrowserDoubleClick(event) {
    event.preventDefault();
  }

  applyTheme();
  state = load();
  save();
  document.getElementById("check-button").addEventListener("click", check);
  document.getElementById("new-game-button").addEventListener("click", newGame);
  undoButton.addEventListener("click", undo);
  document.addEventListener("contextmenu", preventBrowserDoubleClick);
  document.addEventListener("lmag:languagechange", render);
  render();
})();
