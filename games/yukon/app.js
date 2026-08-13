(function () {
  "use strict";
  try {
    localStorage.setItem("leave-me-alone-games-last-game", JSON.stringify({ id: "yukon", href: "games/yukon/index.html", title: document.querySelector("h1")?.textContent?.trim() || "yukon", playedAt: Date.now() }));
  } catch {}

  const SUITS = ["S", "H", "D", "C"];
  const SUIT_LABELS = { S: "\u2660", H: "\u2665", D: "\u2666", C: "\u2663" };
  const RANK_LABELS = { 1: "A", 11: "J", 12: "Q", 13: "K" };
  const STORAGE_KEY = "leave-you-alone-yukon-current-game";
  const THEME_KEY = "leave-me-alone-games-theme";
  const AUTO_FINISH_KEY = "leave-me-alone-games-auto-finish";
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);

  const els = {
    foundations: document.getElementById("foundations"),
    tableau: document.getElementById("tableau"),
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
  let drag = null;
  let undoSnapshot = null;
  let suppressNextClick = false;
  let lastTapAt = 0;
  let autoFinishTimer = null;

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
        cards.push({ suit, rank, faceUp: false, serial });
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
    const cards = shuffle(makeDeck());
    const tableau = Array.from({ length: 7 }, () => []);
    tableau[0].push({ ...cards.shift(), faceUp: true });

    for (let pileIndex = 1; pileIndex < 7; pileIndex += 1) {
      for (let hidden = 0; hidden < pileIndex; hidden += 1) {
        tableau[pileIndex].push({ ...cards.shift(), faceUp: false });
      }
    }

    for (let pileIndex = 1; pileIndex < 7; pileIndex += 1) {
      for (let shown = 0; shown < 5; shown += 1) {
        tableau[pileIndex].push({ ...cards.shift(), faceUp: true });
      }
    }

    return {
      foundations: { S: [], H: [], D: [], C: [] },
      tableau,
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
      if (!saved || !Array.isArray(saved.tableau) || !saved.foundations) return null;
      if (!SUITS.every((suit) => Array.isArray(saved.foundations[suit]))) return null;
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
      el.addEventListener("pointerdown", onPointerDown);
      el.addEventListener("click", onCardClick);
      el.addEventListener("dblclick", (event) => {
        event.preventDefault();
        moveToFoundation(source);
      });
    }
    return el;
  }

  function pileElement(className, target) {
    const el = document.createElement("div");
    el.className = `pile ${className}`;
    el.dataset.targetType = target.type;
    el.dataset.targetIndex = String(target.index);
    if (target.suit) el.dataset.suit = target.suit;
    el.addEventListener("pointerup", onPilePointerUp);
    el.addEventListener("click", onPileClick);
    return el;
  }

  function render() {
    clear(els.foundations);
    clear(els.tableau);

    SUITS.forEach((suit) => {
      const pile = pileElement("foundation-pile", { type: "foundation", index: suit, suit });
      const cards = state.foundations[suit];
      if (cards.length) {
        pile.classList.add("has-card");
        pile.appendChild(cardElement(cards[cards.length - 1], { type: "foundation", index: suit }));
      }
      els.foundations.appendChild(pile);
    });

    state.tableau.forEach((pileCards, pileIndex) => {
      const pile = pileElement("tableau-pile", { type: "tableau", index: pileIndex });
      pile.setAttribute("aria-label", t("tableauPile", { number: pileIndex + 1 }));
      let stackY = 0;
      pileCards.forEach((card, cardIndex) => {
        const cardEl = cardElement(card, { type: "tableau", index: pileIndex, cardIndex });
        cardEl.style.setProperty("--stack-y", `${stackY}px`);
        cardEl.style.zIndex = String(cardIndex + 1);
        if (selected && selected.type === "tableau" && selected.index === pileIndex && cardIndex >= selected.cardIndex) {
          cardEl.classList.add("selected");
        }
        stackY += stackOffset(card);
        pile.appendChild(cardEl);
      });
      els.tableau.appendChild(pile);
    });

    els.status.textContent = state.won ? t("complete") : "";
    els.win.hidden = !state.won;
    saveState();
    scheduleAutoFinish();
  }

  function stackOffset(card) {
    const styles = getComputedStyle(document.documentElement);
    const value = styles.getPropertyValue(card.faceUp ? "--face-up-stack" : "--face-down-stack");
    return Number.parseFloat(value) || (card.faceUp ? 28 : 12);
  }

  function sourceCards(source) {
    if (source.type === "foundation") {
      const pile = state.foundations[source.index];
      return pile.length ? [pile[pile.length - 1]] : [];
    }
    const pile = state.tableau[source.index];
    return pile.slice(source.cardIndex);
  }

  function canMoveToFoundation(card, suit) {
    if (!card || card.suit !== suit) return false;
    const foundation = state.foundations[suit];
    if (!foundation.length) return card.rank === 1;
    return foundation[foundation.length - 1].rank + 1 === card.rank;
  }

  function autoFinishEnabled() {
    try {
      return localStorage.getItem(AUTO_FINISH_KEY) !== "false";
    } catch {
      return true;
    }
  }

  function drainToFoundations(game) {
    if (!game.tableau.every((pile) => pile.every((card) => card.faceUp))) return false;

    let moved = true;
    while (moved) {
      moved = false;
      for (const pile of game.tableau) {
        const card = pile[pile.length - 1];
        if (card && card.rank === game.foundations[card.suit].length + 1) {
          game.foundations[card.suit].push(pile.pop());
          moved = true;
        }
      }
    }

    game.won = SUITS.every((suit) => game.foundations[suit].length === 13);
    return game.won;
  }

  function scheduleAutoFinish() {
    if (autoFinishTimer) window.clearTimeout(autoFinishTimer);
    autoFinishTimer = null;
    if (!autoFinishEnabled() || state.won || !drainToFoundations(cloneState(state))) return;
    autoFinishTimer = window.setTimeout(() => {
      autoFinishTimer = null;
      rememberUndo();
      drainToFoundations(state);
      selected = null;
      render();
    }, 250);
  }

  function canMoveToTableau(cards, destinationIndex) {
    if (!cards.length || !cards[0].faceUp) return false;
    const moving = cards[0];
    const destination = state.tableau[destinationIndex];
    if (!destination.length) return moving.rank === 13;
    const target = destination[destination.length - 1];
    return target.faceUp && target.rank === moving.rank + 1 && cardColor(target) !== cardColor(moving);
  }

  function revealTopCard(pile) {
    if (!pile.length) return;
    pile[pile.length - 1].faceUp = true;
  }

  function removeFromSource(source, count) {
    if (source.type === "foundation") return state.foundations[source.index].splice(-1, 1);
    return state.tableau[source.index].splice(source.cardIndex, count);
  }

  function addToTarget(cards, target) {
    if (target.type === "foundation") state.foundations[target.index].push(cards[0]);
    if (target.type === "tableau") state.tableau[target.index].push(...cards);
  }

  function moveCards(source, target) {
    if (!source || !target) return false;
    if (source.type === target.type && String(source.index) === String(target.index)) return false;
    const cards = sourceCards(source);
    if (!cards.length || !cards[0].faceUp) return false;

    if (target.type === "foundation" && (cards.length !== 1 || !canMoveToFoundation(cards[0], target.index))) return false;
    if (target.type === "tableau" && !canMoveToTableau(cards, target.index)) return false;

    rememberUndo();
    const moved = removeFromSource(source, cards.length);
    if (source.type === "tableau") revealTopCard(state.tableau[source.index]);
    addToTarget(moved, target);
    state.won = SUITS.every((suit) => state.foundations[suit].length === 13);
    selected = null;
    render();
    return true;
  }

  function moveToFoundation(source) {
    const cards = sourceCards(source);
    if (cards.length !== 1) return false;
    return moveCards(source, { type: "foundation", index: cards[0].suit });
  }

  function sourceFromElement(el) {
    return {
      type: el.dataset.sourceType,
      index: el.dataset.sourceType === "foundation" ? el.dataset.sourceIndex : Number(el.dataset.sourceIndex),
      cardIndex: el.dataset.cardIndex === undefined ? undefined : Number(el.dataset.cardIndex)
    };
  }

  function targetFromElement(el) {
    if (!el) return null;
    const pile = el.closest(".pile");
    if (!pile) return null;
    return {
      type: pile.dataset.targetType,
      index: pile.dataset.targetType === "foundation" ? pile.dataset.targetIndex : Number(pile.dataset.targetIndex)
    };
  }

  function onCardClick(event) {
    event.preventDefault();
    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }
    const source = sourceFromElement(event.currentTarget);
    if (selected && moveCards(selected, targetFromElement(event.currentTarget))) return;
    selected = source;
    render();
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
    if (!cards.length || !cards[0].faceUp) return;
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
    let stackY = 0;
    cards.forEach((card) => {
      const cardEl = cardElement(card, { type: "ghost", index: 0 });
      cardEl.style.setProperty("--stack-y", `${stackY}px`);
      cardEl.style.zIndex = String(ghost.children.length + 1);
      stackY += stackOffset(card);
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
    if (source.type !== "tableau") return;
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
