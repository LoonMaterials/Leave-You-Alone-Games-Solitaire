(function () {
  "use strict";
  try {
    localStorage.setItem("leave-me-alone-games-last-game", JSON.stringify({ id: "tripeaks", href: "games/tripeaks/index.html", title: document.querySelector("h1")?.textContent?.trim() || "tripeaks", playedAt: Date.now() }));
  } catch {}

  const SUITS = ["S", "H", "D", "C"];
  const SUIT_LABELS = { S: "\u2660", H: "\u2665", D: "\u2666", C: "\u2663" };
  const RANK_LABELS = { 1: "A", 11: "J", 12: "Q", 13: "K" };
  const STORAGE_KEY = "leave-you-alone-tripeaks-current-game";
  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const LAYOUT = [
    { row: 0, x: 1, children: [3, 4] },
    { row: 0, x: 7, children: [5, 6] },
    { row: 0, x: 13, children: [7, 8] },
    { row: 1, x: 0, children: [9, 10] },
    { row: 1, x: 2, children: [10, 11] },
    { row: 1, x: 6, children: [12, 13] },
    { row: 1, x: 8, children: [13, 14] },
    { row: 1, x: 12, children: [15, 16] },
    { row: 1, x: 14, children: [16, 17] },
    { row: 2, x: 0, children: [18, 19] },
    { row: 2, x: 2, children: [19, 20] },
    { row: 2, x: 4, children: [20, 21] },
    { row: 2, x: 6, children: [21, 22] },
    { row: 2, x: 8, children: [22, 23] },
    { row: 2, x: 10, children: [23, 24] },
    { row: 2, x: 12, children: [24, 25] },
    { row: 2, x: 14, children: [25, 26] },
    { row: 2, x: 16, children: [26, 27] },
    { row: 3, x: 0, children: [] },
    { row: 3, x: 2, children: [] },
    { row: 3, x: 4, children: [] },
    { row: 3, x: 6, children: [] },
    { row: 3, x: 8, children: [] },
    { row: 3, x: 10, children: [] },
    { row: 3, x: 12, children: [] },
    { row: 3, x: 14, children: [] },
    { row: 3, x: 16, children: [] },
    { row: 3, x: 18, children: [] }
  ];

  const els = {
    peaks: document.getElementById("peaks"),
    stock: document.getElementById("stock"),
    waste: document.getElementById("waste"),
    removed: document.getElementById("removed"),
    status: document.getElementById("status"),
    themeSelect: document.getElementById("theme-select"),
    undo: document.getElementById("undo"),
    newGame: document.getElementById("new-game"),
    win: document.getElementById("win-message")
  };

  function t(key, values) {
    return window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key;
  }

  function applyLanguage() {
    if (window.LMAG_I18N) window.LMAG_I18N.apply(document);
    render();
  }

  let state = null;
  let selected = null;
  let undoSnapshot = null;
  let lastTapAt = 0;

  function rankLabel(rank) {
    return RANK_LABELS[rank] || String(rank);
  }

  function cardId(card) {
    return `${card.suit}-${card.rank}-${card.serial}`;
  }

  function cardColor(card) {
    return card.suit === "H" || card.suit === "D" ? "red" : "black";
  }

  function makeDeck() {
    const cards = [];
    let serial = 0;
    SUITS.forEach((suit) => {
      for (let rank = 1; rank <= 13; rank += 1) {
        cards.push({ suit, rank, removed: false, serial });
        serial += 1;
      }
    });
    return cards;
  }

  function shuffle(deck) {
    const cards = deck.slice();
    for (let index = cards.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [cards[index], cards[swap]] = [cards[swap], cards[index]];
    }
    return cards;
  }

  function freshState() {
    const deck = shuffle(makeDeck());
    const peaks = LAYOUT.map(() => deck.shift());
    const waste = [deck.shift()];
    return {
      peaks,
      stock: deck,
      waste,
      removed: [],
      won: false
    };
  }

  function cloneState(source) {
    return JSON.parse(JSON.stringify(source));
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || !Array.isArray(saved.peaks) || !Array.isArray(saved.stock) || !Array.isArray(saved.waste)) return null;
      if (!Array.isArray(saved.removed)) saved.removed = [];
      return saved;
    } catch {
      return null;
    }
  }

  function getStoredTheme() {
    try {
      const theme = localStorage.getItem(THEME_KEY);
      return THEMES.has(theme) ? theme : "colorblind";
    } catch {
      return "colorblind";
    }
  }

  function setTheme(theme) {
    const nextTheme = THEMES.has(theme) ? theme : "colorblind";
    document.body.dataset.theme = nextTheme;
    if (els.themeSelect) els.themeSelect.value = nextTheme;
    try {
      localStorage.setItem(THEME_KEY, nextTheme);
    } catch {
      // The game still works if local settings are unavailable.
    }
  }

  function rememberUndo() {
    undoSnapshot = cloneState(state);
    els.undo.disabled = false;
  }

  function clear(element) {
    while (element.firstChild) element.removeChild(element.firstChild);
  }

  function isAvailable(index) {
    const card = state.peaks[index];
    if (!card || card.removed) return false;
    return LAYOUT[index].children.every((childIndex) => state.peaks[childIndex].removed);
  }

  function topWaste() {
    return state.waste[state.waste.length - 1] || null;
  }

  function canPlay(card) {
    const waste = topWaste();
    if (!card || !waste) return false;
    const difference = Math.abs(card.rank - waste.rank);
    return difference === 1 || difference === 12;
  }

  function updateWin() {
    state.won = state.peaks.every((card) => card.removed);
  }

  function cardElement(card, source, options = {}) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = `card ${cardColor(card)}`;
    if (options.covered) el.classList.add("covered");
    if (selected === source.index) el.classList.add("selected");
    el.dataset.sourceType = source.type;
    if (source.index !== undefined) el.dataset.index = String(source.index);
    el.dataset.cardId = cardId(card);
    el.setAttribute("aria-label", `${rankLabel(card.rank)} ${SUIT_LABELS[card.suit]}`);

    if (source.type === "peaks") {
      const layout = LAYOUT[source.index];
      el.style.setProperty("--row", String(layout.row));
      el.style.setProperty("--x", String(layout.x));
    }

    const label = `${rankLabel(card.rank)}${SUIT_LABELS[card.suit]}`;
    const top = document.createElement("div");
    top.className = "corner";
    top.textContent = label;
    const center = document.createElement("div");
    center.className = "center";
    center.textContent = SUIT_LABELS[card.suit];
    const bottom = top.cloneNode(true);
    bottom.className = "corner bottom";
    el.append(top, center, bottom);

    if (source.type === "peaks") {
      el.addEventListener("click", onPeakClick);
    }
    el.addEventListener("dblclick", (event) => event.preventDefault());
    return el;
  }

  function renderPeaks() {
    clear(els.peaks);
    state.peaks.forEach((card, index) => {
      if (card.removed) return;
      const covered = !isAvailable(index);
      els.peaks.appendChild(cardElement(card, { type: "peaks", index }, { covered }));
    });
  }

  function renderStock() {
    clear(els.stock);
    els.stock.classList.toggle("has-cards", state.stock.length > 0);
    els.stock.disabled = !state.stock.length || state.won;
    els.stock.setAttribute("aria-label", state.stock.length ? t("drawFromStock") : t("stockEmpty"));
  }

  function renderWaste() {
    clear(els.waste);
    const card = topWaste();
    els.waste.classList.toggle("has-card", Boolean(card));
    if (card) els.waste.appendChild(cardElement(card, { type: "waste" }));
  }

  function renderRemoved() {
    clear(els.removed);
    const card = state.removed[state.removed.length - 1];
    els.removed.classList.toggle("has-card", Boolean(card));
    if (card) els.removed.appendChild(cardElement(card, { type: "removed" }));
  }

  function render() {
    renderPeaks();
    renderStock();
    renderWaste();
    renderRemoved();
    els.status.textContent = state.won ? t("complete") : "";
    els.win.hidden = !state.won;
    saveState();
  }

  function onPeakClick(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.index);
    const card = state.peaks[index];
    if (!isAvailable(index)) return;
    if (!canPlay(card)) {
      selected = selected === index ? null : index;
      render();
      return;
    }
    rememberUndo();
    card.removed = true;
    state.waste.push(card);
    selected = null;
    updateWin();
    render();
  }

  function drawStock() {
    if (state.won || !state.stock.length) return;
    rememberUndo();
    selected = null;
    state.waste.push(state.stock.pop());
    render();
  }

  function startNewGame() {
    state = freshState();
    undoSnapshot = null;
    selected = null;
    els.undo.disabled = true;
    render();
  }

  function undo() {
    if (!undoSnapshot) return;
    state = cloneState(undoSnapshot);
    undoSnapshot = null;
    selected = null;
    els.undo.disabled = true;
    render();
  }

  function preventBrowserDoubleClick(event) {
    const now = Date.now();
    if (now - lastTapAt < 420) event.preventDefault();
    lastTapAt = now;
  }

  function preventViewportMove(event) {
    event.preventDefault();
  }

  function preventGestureZoom(event) {
    event.preventDefault();
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("../../sw.js").catch(() => {});
      });
    }
  }

  els.stock.addEventListener("click", drawStock);
  els.newGame.addEventListener("click", startNewGame);
  els.undo.addEventListener("click", undo);
  if (els.themeSelect) els.themeSelect.addEventListener("change", () => setTheme(els.themeSelect.value));
  document.addEventListener("contextmenu", (event) => event.preventDefault());
  document.addEventListener("dblclick", preventBrowserDoubleClick, { capture: true });
  document.addEventListener("dragstart", (event) => event.preventDefault());
  document.addEventListener("touchmove", preventViewportMove, { passive: false });
  document.addEventListener("gesturestart", preventGestureZoom);
  document.addEventListener("gesturechange", preventGestureZoom);
  document.addEventListener("gestureend", preventGestureZoom);
  document.addEventListener("lmag:languagechange", applyLanguage);

  setTheme(getStoredTheme());
  state = loadState() || freshState();
  render();
  registerServiceWorker();
})();
