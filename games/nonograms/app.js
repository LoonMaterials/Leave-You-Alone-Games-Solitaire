(function () {
  "use strict";
  try {
    localStorage.setItem("leave-me-alone-games-last-game", JSON.stringify({ id: "nonograms", href: "games/nonograms/index.html", title: document.querySelector("h1")?.textContent?.trim() || "nonograms", playedAt: Date.now() }));
  } catch {}

  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const KEY = "leave-me-alone-nonograms-current-game";
  const SAVE_VERSION = 4;
  const SIZES = [8, 10, 12];
  const DEFAULT_SIZE = 10;
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
      document.body.dataset.theme = selectedTheme;
      document.body.classList.remove("theme-colorblind", "theme-blue", "theme-grey", "theme-orange", "theme-purple", "theme-red", "theme-sand", "theme-midnight", "theme-rose");
      if (selectedTheme !== "green") document.body.classList.add(`theme-${selectedTheme}`);
    } catch {}
  }

  function emptyGrid(size = DEFAULT_SIZE, value = 0) {
    return Array.from({ length: size }, () => Array(size).fill(value));
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function rand(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function stamp(grid, row, col, radius = 1) {
    const size = grid.length;
    for (let r = row - radius; r <= row + radius; r += 1) {
      for (let c = col - radius; c <= col + radius; c += 1) {
        if (r < 0 || c < 0 || r >= size || c >= size) continue;
        if (Math.abs(r - row) + Math.abs(c - col) <= radius + 1) grid[r][c] = 1;
      }
    }
  }

  function mirror(grid) {
    const size = grid.length;
    const mode = Math.random();
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (!grid[r][c]) continue;
        if (mode < 0.45) grid[r][size - 1 - c] = 1;
        else if (mode < 0.75) grid[size - 1 - r][c] = 1;
        else {
          grid[r][size - 1 - c] = 1;
          grid[size - 1 - r][c] = 1;
        }
      }
    }
  }

  function addLines(grid) {
    const size = grid.length;
    const count = rand(size >= 12 ? 3 : 2, size >= 12 ? 5 : 4);
    for (let i = 0; i < count; i += 1) {
      const horizontal = Math.random() < 0.5;
      const fixed = rand(1, size - 2);
      const start = rand(0, Math.max(1, Math.floor(size * 0.32)));
      const end = rand(Math.ceil(size * 0.62), size - 1);
      for (let n = start; n <= end; n += 1) {
        const row = horizontal ? fixed : n;
        const col = horizontal ? n : fixed;
        grid[row][col] = 1;
      }
    }
  }

  function addBlobs(grid) {
    const size = grid.length;
    const count = rand(size >= 12 ? 5 : 3, size >= 12 ? 8 : 6);
    for (let i = 0; i < count; i += 1) {
      stamp(grid, rand(1, size - 2), rand(1, size - 2), rand(1, size >= 12 ? 3 : 2));
    }
  }

  function cellCount(grid) {
    return grid.flat().filter(Boolean).length;
  }

  function makeSolution(size = DEFAULT_SIZE) {
    let grid;
    let attempts = 0;
    const cells = size * size;
    const minFilled = Math.floor(cells * 0.22);
    const maxFilled = Math.floor(cells * 0.62);
    do {
      grid = emptyGrid(size);
      addBlobs(grid);
      addLines(grid);
      mirror(grid);
      attempts += 1;
    } while ((cellCount(grid) < minFilled || cellCount(grid) > maxFilled) && attempts < 30);
    return grid;
  }

  function fresh() {
    const size = randomItem(SIZES);
    return {
      version: SAVE_VERSION,
      size,
      solution: makeSolution(size),
      marks: emptyGrid(size),
      solved: false
    };
  }

  function isValidSave(saved) {
    const size = saved?.size;
    return saved?.version === SAVE_VERSION &&
      SIZES.includes(size) &&
      saved?.solution?.length === size &&
      saved?.marks?.length === size &&
      saved.solution.every((row) => Array.isArray(row) && row.length === size) &&
      saved.marks.every((row) => Array.isArray(row) && row.length === size);
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
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
    const size = state.size || DEFAULT_SIZE;
    board.style.setProperty("--nonogram-size", String(size));
    board.style.setProperty("--nonogram-cell", size >= 12 ? "clamp(1.05rem, 5.75vw, 1.7rem)" : size <= 8 ? "clamp(1.55rem, 8.2vw, 2.45rem)" : "clamp(1.38rem, 7.2vw, 2.15rem)");
    const wrap = document.createElement("div");
    wrap.className = "nonogram-wrap";

    const top = document.createElement("div");
    top.className = "top-clues";
    for (let c = 0; c < size; c += 1) top.appendChild(label(clues(state.solution.map((row) => row[c]))));

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
    const size = state.size || DEFAULT_SIZE;
    const solved = state.marks.flat().every((value, i) => {
      const row = Math.floor(i / size);
      const col = i % size;
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
