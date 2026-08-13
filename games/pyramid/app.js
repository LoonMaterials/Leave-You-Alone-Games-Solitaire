(function () {
  "use strict";
  try {
    localStorage.setItem("leave-me-alone-games-last-game", JSON.stringify({ id: "pyramid", href: "games/pyramid/index.html", title: document.querySelector("h1")?.textContent?.trim() || "pyramid", playedAt: Date.now() }));
  } catch {}

  const SUITS = ["S", "H", "D", "C"];
  const SUIT_LABELS = { S: "\u2660", H: "\u2665", D: "\u2666", C: "\u2663" };
  const RANK_LABELS = { 1: "A", 11: "J", 12: "Q", 13: "K" };
  const STORAGE_KEY = "leave-you-alone-pyramid-current-game";
  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);

  const els = {
    pyramid: document.getElementById("pyramid"),
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

  function cardValue(card) {
    return card.rank;
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
    const pyramid = [];
    for (let row = 0; row < 7; row += 1) {
      const cards = [];
      for (let column = 0; column <= row; column += 1) {
        cards.push(deck.shift());
      }
      pyramid.push(cards);
    }
    return {
      pyramid,
      stock: deck,
      waste: [],
      removed: [],
      recycleUsed: false,
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
      if (!saved || !Array.isArray(saved.pyramid) || !Array.isArray(saved.stock) || !Array.isArray(saved.waste)) return null;
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

  function isPyramidAvailable(row, column) {
    const card = state.pyramid[row][column];
    if (!card || card.removed) return false;
    if (row === 6) return true;
    const leftCover = state.pyramid[row + 1][column];
    const rightCover = state.pyramid[row + 1][column + 1];
    return Boolean(leftCover.removed && rightCover.removed);
  }

  function sourceCard(source) {
    if (!source) return null;
    if (source.type === "pyramid") return state.pyramid[source.row][source.column];
    if (source.type === "waste") return state.waste[state.waste.length - 1] || null;
    return null;
  }

  function sameSource(first, second) {
    if (!first || !second || first.type !== second.type) return false;
    if (first.type === "waste") return true;
    return first.row === second.row && first.column === second.column;
  }

  function canSelect(source) {
    if (!source) return false;
    if (source.type === "waste") return state.waste.length > 0;
    return isPyramidAvailable(source.row, source.column);
  }

  function canRemovePair(first, second) {
    const firstCard = sourceCard(first);
    const secondCard = sourceCard(second);
    if (!firstCard || !secondCard || sameSource(first, second)) return false;
    return cardValue(firstCard) + cardValue(secondCard) === 13;
  }

  function removeSource(source) {
    const card = sourceCard(source);
    if (!card) return;
    if (source.type === "waste") {
      state.removed.push(state.waste.pop());
    } else {
      card.removed = true;
      state.removed.push(card);
    }
  }

  function removeCards(first, second) {
    rememberUndo();
    removeSource(first);
    removeSource(second);
    selected = null;
    updateWin();
    render();
  }

  function removeKing(source) {
    rememberUndo();
    removeSource(source);
    selected = null;
    updateWin();
    render();
  }

  function updateWin() {
    state.won = state.pyramid.flat().every((card) => card.removed);
  }

  function cardElement(card, source, options = {}) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = `card ${cardColor(card)}`;
    if (options.covered) el.classList.add("covered");
    if (selected && sameSource(selected, source)) el.classList.add("selected");
    el.dataset.sourceType = source.type;
    if (source.row !== undefined) el.dataset.row = String(source.row);
    if (source.column !== undefined) el.dataset.column = String(source.column);
    el.dataset.cardId = cardId(card);
    el.setAttribute("aria-label", `${rankLabel(card.rank)} ${SUIT_LABELS[card.suit]}`);

    if (source.type === "pyramid") {
      el.style.setProperty("--row", String(source.row));
      el.style.setProperty("--x", String(6 - source.row + source.column * 2));
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

    el.addEventListener("click", onCardClick);
    el.addEventListener("dblclick", (event) => event.preventDefault());
    return el;
  }

  function renderPyramid() {
    clear(els.pyramid);
    state.pyramid.forEach((rowCards, row) => {
      rowCards.forEach((card, column) => {
        if (card.removed) return;
        const source = { type: "pyramid", row, column };
        const covered = !isPyramidAvailable(row, column);
        els.pyramid.appendChild(cardElement(card, source, { covered }));
      });
    });
  }

  function renderStock() {
    clear(els.stock);
    els.stock.classList.toggle("has-cards", state.stock.length > 0);
    els.stock.setAttribute("aria-label", stockLabel());
  }

  function renderWaste() {
    clear(els.waste);
    const card = state.waste[state.waste.length - 1];
    els.waste.classList.toggle("has-card", Boolean(card));
    if (card) {
      els.waste.appendChild(cardElement(card, { type: "waste" }));
    }
  }

  function renderRemoved() {
    clear(els.removed);
    const card = state.removed[state.removed.length - 1];
    els.removed.classList.toggle("has-card", Boolean(card));
    if (card) {
      els.removed.appendChild(cardElement(card, { type: "removed" }));
    }
  }

  function stockLabel() {
    if (state.stock.length) return t("drawFromStock");
    if (state.waste.length && !state.recycleUsed) return t("recycleWastePile");
    return t("stockEmpty");
  }

  function render() {
    renderPyramid();
    renderStock();
    renderWaste();
    renderRemoved();
    els.status.textContent = state.won ? t("complete") : "";
    els.win.hidden = !state.won;
    saveState();
  }

  function sourceFromElement(el) {
    const type = el.dataset.sourceType;
    if (type === "waste") return { type };
    if (type === "pyramid") {
      return {
        type,
        row: Number(el.dataset.row),
        column: Number(el.dataset.column)
      };
    }
    return null;
  }

  function onCardClick(event) {
    event.preventDefault();
    const source = sourceFromElement(event.currentTarget);
    if (!canSelect(source)) return;
    const card = sourceCard(source);
    if (card.rank === 13) {
      removeKing(source);
      return;
    }
    if (selected && canRemovePair(selected, source)) {
      removeCards(selected, source);
      return;
    }
    selected = selected && sameSource(selected, source) ? null : source;
    render();
  }

  function drawStock() {
    if (state.won) return;
    if (state.stock.length) {
      rememberUndo();
      selected = null;
      state.waste.push(state.stock.pop());
      render();
      return;
    }
    if (state.waste.length && !state.recycleUsed) {
      rememberUndo();
      selected = null;
      state.stock = state.waste.reverse();
      state.waste = [];
      state.recycleUsed = true;
      render();
    }
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
