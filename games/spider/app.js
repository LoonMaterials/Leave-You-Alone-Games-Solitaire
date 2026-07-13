(function () {
  "use strict";

  const SUITS = ["S", "H", "D", "C"];
  const SUIT_LABELS = { S: "\u2660", H: "\u2665", D: "\u2666", C: "\u2663" };
  const RANK_LABELS = { 1: "A", 11: "J", 12: "Q", 13: "K" };
  const STORAGE_KEY = "leave-you-alone-spider-current-game";
  const THEME_KEY = "leave-me-alone-games-theme";
  const MODE_KEY = "leave-me-alone-spider-suit-mode";
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const MODES = new Set(["one", "two", "four"]);

  const els = {
    stock: document.getElementById("stock"),
    completed: document.getElementById("completed"),
    tableau: document.getElementById("tableau"),
    status: document.getElementById("status"),
    themeSelect: document.getElementById("theme-select"),
    modeSelect: document.getElementById("mode-select"),
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
  let drag = null;
  let undoSnapshot = null;
  let suppressNextClick = false;
  let lastTapAt = 0;

  function rankLabel(rank) {
    return RANK_LABELS[rank] || String(rank);
  }

  function cardId(card) {
    return `${card.suit}-${card.deck}-${card.rank}-${card.serial}`;
  }

  function cardColor(card) {
    return card.suit === "H" || card.suit === "D" ? "red" : "black";
  }

  function suitSetForMode(mode) {
    if (mode === "four") return SUITS;
    if (mode === "two") return ["S", "H"];
    return ["S"];
  }

  function copiesPerSuit(mode) {
    if (mode === "four") return 2;
    if (mode === "two") return 4;
    return 8;
  }

  function makeDeck(mode) {
    const cards = [];
    let serial = 0;
    suitSetForMode(mode).forEach((suit) => {
      for (let deck = 0; deck < copiesPerSuit(mode); deck += 1) {
        for (let rank = 1; rank <= 13; rank += 1) {
          cards.push({ suit, rank, faceUp: false, deck, serial });
          serial += 1;
        }
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

  function freshState(mode = getStoredMode()) {
    const cards = shuffle(makeDeck(mode));
    const tableau = Array.from({ length: 10 }, () => []);
    for (let column = 0; column < 10; column += 1) {
      const count = column < 4 ? 6 : 5;
      for (let index = 0; index < count; index += 1) {
        const card = cards.shift();
        card.faceUp = index === count - 1;
        tableau[column].push(card);
      }
    }
    cards.forEach((card) => {
      card.faceUp = false;
    });
    return {
      stock: cards,
      completed: 0,
      mode,
      tableau,
      won: false
    };
  }

  function cloneState(source) {
    return JSON.parse(JSON.stringify(source));
  }

  function saveState() {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadState() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
      if (!saved || !Array.isArray(saved.stock) || !Array.isArray(saved.tableau)) return null;
      if (!MODES.has(saved.mode)) saved.mode = "one";
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

  function getStoredMode() {
    try {
      const mode = localStorage.getItem(MODE_KEY);
      return MODES.has(mode) ? mode : "one";
    } catch {
      return "one";
    }
  }

  function setMode(mode, options = {}) {
    const nextMode = MODES.has(mode) ? mode : "one";
    els.modeSelect.value = nextMode;
    try {
      localStorage.setItem(MODE_KEY, nextMode);
    } catch {
      // The game still works if local settings are unavailable.
    }
    if (options.newGame) {
      state = freshState(nextMode);
      undoSnapshot = null;
      selected = null;
      els.undo.disabled = true;
      render();
    }
  }

  function rememberUndo() {
    undoSnapshot = cloneState(state);
    els.undo.disabled = false;
  }

  function clear(element) {
    while (element.firstChild) element.removeChild(element.firstChild);
  }

  function cardElement(card, source) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = card.faceUp ? `card ${cardColor(card)}` : "card back";
    el.dataset.cardId = cardId(card);
    el.dataset.sourceType = source.type;
    el.dataset.sourceIndex = String(source.index);
    if (source.cardIndex !== undefined) el.dataset.cardIndex = String(source.cardIndex);
    el.setAttribute("aria-label", card.faceUp ? `${rankLabel(card.rank)} ${SUIT_LABELS[card.suit]}` : t("faceDownCard"));

    if (card.faceUp) {
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
    }

    if (card.faceUp) {
      el.addEventListener("pointerdown", onPointerDown);
      el.addEventListener("click", onCardClick);
      el.addEventListener("dblclick", (event) => event.preventDefault());
    }
    return el;
  }

  function pileElement(index) {
    const el = document.createElement("div");
    el.className = "pile tableau-pile";
    el.dataset.targetType = "tableau";
    el.dataset.targetIndex = String(index);
    el.addEventListener("pointerup", onPilePointerUp);
    el.addEventListener("click", onPileClick);
    return el;
  }

  function completedPile(index) {
    const el = document.createElement("div");
    el.className = index < state.completed ? "pile completed-pile has-card" : "pile completed-pile";
    return el;
  }

  function render() {
    clear(els.completed);
    clear(els.tableau);

    els.stock.classList.toggle("has-cards", state.stock.length > 0);
    els.stock.disabled = !state.stock.length || state.won;
    els.stock.setAttribute("aria-label", state.stock.length ? t("dealFromStock") : t("stockEmpty"));
    els.modeSelect.value = state.mode || "one";

    for (let index = 0; index < 8; index += 1) {
      els.completed.appendChild(completedPile(index));
    }

    state.tableau.forEach((pileCards, pileIndex) => {
      const pile = pileElement(pileIndex);
      pileCards.forEach((card, cardIndex) => {
        const cardEl = cardElement(card, { type: "tableau", index: pileIndex, cardIndex });
        cardEl.style.setProperty("--stack-index", String(cardIndex));
        cardEl.style.zIndex = String(cardIndex + 1);
        pile.appendChild(cardEl);
      });
      els.tableau.appendChild(pile);
    });

    els.status.textContent = state.won ? t("complete") : "";
    els.win.hidden = !state.won;
    saveState();
  }

  function revealTopCard(pile) {
    if (!pile.length) return;
    pile[pile.length - 1].faceUp = true;
  }

  function sourceCards(source) {
    const pile = state.tableau[source.index];
    if (!pile) return [];
    return pile.slice(source.cardIndex);
  }

  function isRunnable(cards) {
    if (!cards.length || cards.some((card) => !card.faceUp)) return false;
    for (let index = 0; index < cards.length - 1; index += 1) {
      if (cards[index].rank !== cards[index + 1].rank + 1 || cards[index].suit !== cards[index + 1].suit) return false;
    }
    return true;
  }

  function canMoveToTableau(cards, destinationIndex) {
    if (!cards.length || !isRunnable(cards)) return false;
    const destination = state.tableau[destinationIndex];
    if (!destination.length) return true;
    const target = destination[destination.length - 1];
    return target.faceUp && target.rank === cards[0].rank + 1;
  }

  function findCompletedRun(pile) {
    if (pile.length < 13) return -1;
    const start = pile.length - 13;
    const run = pile.slice(start);
    if (!run.every((card) => card.faceUp)) return -1;
    for (let index = 0; index < 13; index += 1) {
      if (run[index].rank !== 13 - index) return -1;
      if (run[index].suit !== run[0].suit) return -1;
    }
    return start;
  }

  function removeCompletedRuns() {
    state.tableau.forEach((pile) => {
      let start = findCompletedRun(pile);
      while (start !== -1) {
        pile.splice(start, 13);
        state.completed += 1;
        revealTopCard(pile);
        start = findCompletedRun(pile);
      }
    });
    state.won = state.completed === 8;
  }

  function moveCards(source, target) {
    if (!source || !target) return false;
    if (source.type === target.type && source.index === target.index) return false;
    const cards = sourceCards(source);
    if (!canMoveToTableau(cards, target.index)) return false;

    rememberUndo();
    const fromPile = state.tableau[source.index];
    const moved = fromPile.splice(source.cardIndex, cards.length);
    revealTopCard(fromPile);
    state.tableau[target.index].push(...moved);
    selected = null;
    removeCompletedRuns();
    render();
    return true;
  }

  function dealStock() {
    if (!state.stock.length || state.tableau.some((pile) => pile.length === 0)) return;
    rememberUndo();
    for (let index = 0; index < 10; index += 1) {
      const card = state.stock.shift();
      card.faceUp = true;
      state.tableau[index].push(card);
    }
    selected = null;
    removeCompletedRuns();
    render();
  }

  function sourceFromElement(el) {
    return {
      type: el.dataset.sourceType,
      index: Number(el.dataset.sourceIndex),
      cardIndex: Number(el.dataset.cardIndex)
    };
  }

  function targetFromElement(el) {
    if (!el) return null;
    const pile = el.closest(".pile");
    if (!pile || pile.dataset.targetType !== "tableau") return null;
    return {
      type: "tableau",
      index: Number(pile.dataset.targetIndex)
    };
  }

  function onCardClick(event) {
    event.preventDefault();
    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }
    const selectedCardId = event.currentTarget.dataset.cardId;
    const source = sourceFromElement(event.currentTarget);
    if (selected && moveCards(selected, targetFromElement(event.currentTarget))) return;
    if (!isRunnable(sourceCards(source))) return;
    selected = source;
    render();
    requestAnimationFrame(() => {
      const active = document.querySelector(`[data-card-id="${selectedCardId}"]`);
      if (active) active.classList.add("selected");
    });
  }

  function onPileClick(event) {
    if (!selected) return;
    event.preventDefault();
    moveCards(selected, targetFromElement(event.currentTarget));
  }

  function onPointerDown(event) {
    if (event.button !== 0 || event.pointerType === "mouse" && event.buttons !== 1) return;
    event.preventDefault();
    const source = sourceFromElement(event.currentTarget);
    const cards = sourceCards(source);
    if (!isRunnable(cards)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    drag = {
      source,
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      moved: false,
      ghost: makeDragGhost(cards)
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    document.addEventListener("pointermove", onPointerMove, { passive: false });
    document.addEventListener("pointerup", onPointerUp, { passive: false });
    updateGhost(event.clientX, event.clientY);
    markDragging(source);
  }

  function makeDragGhost(cards) {
    const ghost = document.createElement("div");
    ghost.className = "drag-stack";
    cards.forEach((card, index) => {
      const cardEl = cardElement(card, { type: "ghost", index: 0, cardIndex: index });
      cardEl.style.setProperty("--stack-index", String(index));
      cardEl.style.zIndex = String(index + 1);
      ghost.appendChild(cardEl);
    });
    document.body.appendChild(ghost);
    return ghost;
  }

  function updateGhost(x, y) {
    if (!drag) return;
    drag.ghost.style.transform = `translate(${x - drag.offsetX}px, ${y - drag.offsetY}px)`;
  }

  function markDragging(source) {
    document.querySelectorAll(`.tableau-pile:nth-child(${source.index + 1}) .card`).forEach((el, index) => {
      if (index >= source.cardIndex) el.classList.add("dragging");
    });
  }

  function onPointerMove(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.preventDefault();
    drag.moved = true;
    updateGhost(event.clientX, event.clientY);
  }

  function onPointerUp(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.preventDefault();
    const current = drag;
    cleanupDrag();
    const targetEl = document.elementFromPoint(event.clientX, event.clientY);
    if (current.moved) {
      suppressNextClick = true;
      moveCards(current.source, targetFromElement(targetEl));
    }
  }

  function onPilePointerUp(event) {
    if (drag) event.preventDefault();
  }

  function cleanupDrag() {
    if (!drag) return;
    drag.ghost.remove();
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    drag = null;
    document.querySelectorAll(".dragging").forEach((el) => el.classList.remove("dragging"));
  }

  function startNewGame() {
    state = freshState(els.modeSelect.value);
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

  els.stock.addEventListener("click", dealStock);
  els.newGame.addEventListener("click", startNewGame);
  els.undo.addEventListener("click", undo);
  if (els.themeSelect) els.themeSelect.addEventListener("change", () => setTheme(els.themeSelect.value));
  els.modeSelect.addEventListener("change", () => setMode(els.modeSelect.value, { newGame: true }));
  document.addEventListener("contextmenu", (event) => event.preventDefault());
  document.addEventListener("dblclick", preventBrowserDoubleClick, { capture: true });
  document.addEventListener("dragstart", (event) => event.preventDefault());
  document.addEventListener("touchmove", preventViewportMove, { passive: false });
  document.addEventListener("gesturestart", preventGestureZoom);
  document.addEventListener("gesturechange", preventGestureZoom);
  document.addEventListener("gestureend", preventGestureZoom);
  document.addEventListener("lmag:languagechange", applyLanguage);

  setTheme(getStoredTheme());
  setMode(getStoredMode());
  state = loadState() || freshState();
  els.modeSelect.value = state.mode || getStoredMode();
  render();
  registerServiceWorker();
})();
