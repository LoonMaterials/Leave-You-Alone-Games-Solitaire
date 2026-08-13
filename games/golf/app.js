(function () {
  "use strict";
  try {
    localStorage.setItem("leave-me-alone-games-last-game", JSON.stringify({ id: "golf", href: "games/golf/index.html", title: document.querySelector("h1")?.textContent?.trim() || "golf", playedAt: Date.now() }));
  } catch {}

  const SUITS = ["S", "H", "D", "C"];
  const SUIT_LABELS = { S: "\u2660", H: "\u2665", D: "\u2666", C: "\u2663" };
  const RANK_LABELS = { 1: "A", 11: "J", 12: "Q", 13: "K" };
  const STORAGE_KEY = "leave-you-alone-golf-current-game";
  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);

  const els = {
    tableau: document.getElementById("tableau"),
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
    const tableau = Array.from({ length: 7 }, () => []);
    for (let row = 0; row < 5; row += 1) {
      for (let column = 0; column < 7; column += 1) {
        tableau[column].push(deck.shift());
      }
    }
    const waste = [deck.shift()];
    return {
      tableau,
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
      if (!saved || !Array.isArray(saved.tableau) || !Array.isArray(saved.stock) || !Array.isArray(saved.waste)) return null;
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

  function topWaste() {
    return state.waste[state.waste.length - 1] || null;
  }

  function columnTop(column) {
    const pile = state.tableau[column];
    return pile[pile.length - 1] || null;
  }

  function canPlay(card) {
    const waste = topWaste();
    if (!card || !waste) return false;
    const difference = Math.abs(card.rank - waste.rank);
    return difference === 1 || difference === 12;
  }

  function updateWin() {
    state.won = state.tableau.every((pile) => pile.length === 0);
  }

  function cardElement(card, source, options = {}) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = `card ${cardColor(card)}`;
    if (options.covered) el.classList.add("covered");
    if (selected === source.column) el.classList.add("selected");
    el.dataset.sourceType = source.type;
    if (source.column !== undefined) el.dataset.column = String(source.column);
    if (source.index !== undefined) el.dataset.index = String(source.index);
    el.dataset.cardId = cardId(card);
    el.setAttribute("aria-label", `${rankLabel(card.rank)} ${SUIT_LABELS[card.suit]}`);

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

    if (source.type === "tableau" && options.playable) {
      el.addEventListener("click", onTableauClick);
    }
    el.addEventListener("dblclick", (event) => event.preventDefault());
    return el;
  }

  function renderTableau() {
    clear(els.tableau);
    state.tableau.forEach((pileCards, column) => {
      const pile = document.createElement("div");
      pile.className = "column";
      pile.setAttribute("aria-label", t("golfColumn", { number: column + 1 }));
      pileCards.forEach((card, index) => {
        const playable = index === pileCards.length - 1;
        const cardEl = cardElement(card, { type: "tableau", column, index }, { playable, covered: !playable });
        cardEl.style.setProperty("--stack-index", String(index));
        pile.appendChild(cardEl);
      });
      els.tableau.appendChild(pile);
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
    els.removed.classList.toggle("has-card", state.removed.length > 0);
  }

  function render() {
    renderTableau();
    renderStock();
    renderWaste();
    renderRemoved();
    els.status.textContent = state.won ? t("complete") : "";
    els.win.hidden = !state.won;
    saveState();
  }

  function onTableauClick(event) {
    event.preventDefault();
    const column = Number(event.currentTarget.dataset.column);
    const card = columnTop(column);
    if (!card) return;
    if (!canPlay(card)) {
      selected = selected === column ? null : column;
      render();
      return;
    }
    rememberUndo();
    const moved = state.tableau[column].pop();
    state.waste.push(moved);
    state.removed.push(moved);
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
