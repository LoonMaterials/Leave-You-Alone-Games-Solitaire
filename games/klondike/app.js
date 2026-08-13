(function () {
  try {
    localStorage.setItem("leave-me-alone-games-last-game", JSON.stringify({ id: "klondike", href: "games/klondike/index.html", title: document.querySelector("h1")?.textContent?.trim() || "Klondike", playedAt: Date.now() }));
  } catch {}
  const SUITS = ["S", "H", "D", "C"];
  const SUIT_LABELS = { S: "\u2660", H: "\u2665", D: "\u2666", C: "\u2663" };
  const RANK_LABELS = { 1: "A", 11: "J", 12: "Q", 13: "K" };
  const THEMES = ["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"];
  const THEME_STORAGE_KEY = "leave-me-alone-games-theme";
  const AUTO_FINISH_STORAGE_KEY = "leave-me-alone-games-auto-finish";
  const DRAW_COUNT_STORAGE_KEY = "leave-you-alone-solitaire-draw-count";
  const GAME_STORAGE_KEY = "leave-you-alone-solitaire-current-game";

  const state = {
    /*
      The full game state lives here and is the single source of truth:
      - stock: face-down cards available to draw
      - waste: drawn cards, with only the top card movable
      - foundations: one pile per suit, building A through K
      - tableau: seven piles; each card tracks whether it is face up
      - selected: source information for the card or tableau run being dragged
      - moves / won: small UI status flags
    */
    stock: [],
    waste: [],
    foundations: { S: [], H: [], D: [], C: [] },
    tableau: [[], [], [], [], [], [], []],
    drag: null,
    touch: null,
    selected: null,
    lastTap: null,
    lastTouchEnd: 0,
    undoSnapshot: null,
    drawCount: 1,
    moves: 0,
    won: false
  };

  const els = {
    stock: document.getElementById("stock"),
    waste: document.getElementById("waste"),
    foundations: document.getElementById("foundations"),
    tableau: document.getElementById("tableau"),
    autoFinish: document.getElementById("auto-finish"),
    drawCount: document.getElementById("draw-count"),
    themeSelect: document.getElementById("theme-select"),
    undo: document.getElementById("undo"),
    newGame: document.getElementById("new-game"),
    status: document.getElementById("status"),
    winMessage: document.getElementById("win-message")
  };
  let autoFinishTimer = null;

  function t(key, values) {
    return window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key;
  }

  function applyLanguage() {
    if (window.LMAG_I18N) window.LMAG_I18N.apply(document);
    render();
  }

  function createDeck() {
    let id = 0;
    return SUITS.flatMap((suit) =>
      Array.from({ length: 13 }, (_, index) => {
        const rank = index + 1;
        return {
          id: `${suit}-${rank}-${id++}`,
          suit,
          rank,
          color: suit === "H" || suit === "D" ? "red" : "black",
          faceUp: false
        };
      })
    );
  }

  function shuffle(cards) {
    const deck = cards.slice();
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  function newGame() {
    const deck = shuffle(createDeck());
    state.stock = [];
    state.waste = [];
    state.foundations = { S: [], H: [], D: [], C: [] };
    state.tableau = [[], [], [], [], [], [], []];
    state.drag = null;
    state.selected = null;
    state.lastTap = null;
    state.undoSnapshot = null;
    endTouchDrag(false);
    state.moves = 0;
    state.won = false;

    for (let pileIndex = 0; pileIndex < 7; pileIndex++) {
      for (let cardIndex = 0; cardIndex <= pileIndex; cardIndex++) {
        const card = deck.pop();
        card.faceUp = cardIndex === pileIndex;
        state.tableau[pileIndex].push(card);
      }
    }

    state.stock = deck;
    saveGame();
    render();
  }

  function drawFromStock() {
    if (state.won) return;

    if (state.stock.length) {
      saveUndoSnapshot();
      state.selected = null;
      const cardsToDraw = Math.min(state.drawCount, state.stock.length);
      for (let index = 0; index < cardsToDraw; index++) {
        const card = state.stock.pop();
        card.faceUp = true;
        state.waste.push(card);
      }
      countMove();
    } else if (state.waste.length) {
      saveUndoSnapshot();
      state.selected = null;
      state.stock = state.waste.reverse().map((card) => ({ ...card, faceUp: false }));
      state.waste = [];
      countMove();
    }
  }

  function countMove() {
    state.moves += 1;
    checkWin();
    saveGame();
    render();
  }

  function checkWin() {
    state.won = SUITS.every((suit) => state.foundations[suit].length === 13);
  }

  function render() {
    els.status.textContent = t(state.moves === 1 ? "moves" : "movesPlural", { count: state.moves });
    els.winMessage.hidden = !state.won;
    els.autoFinish.disabled = state.won || !canAutoFinish();
    els.undo.disabled = !state.undoSnapshot;
    renderStock();
    renderWaste();
    renderFoundations();
    renderTableau();
    scheduleAutoFinish();
  }

  function renderStock() {
    els.stock.className = `pile stock ${state.stock.length ? "has-cards" : "empty"}`;
    els.stock.dataset.label = t("reset");
    els.stock.title = state.stock.length ? `${t("draw")} ${state.drawCount}` : t("recycleWaste");
  }

  function renderWaste() {
    clear(els.waste);
    const row = document.createElement("div");
    row.className = "waste-row";
    const visibleCards = state.waste.slice(-Math.min(state.drawCount, 3));
    visibleCards.forEach((card, index) => {
      const isTopCard = index === visibleCards.length - 1;
      const cardEl = cardElement(card, {
        draggable: isTopCard,
        source: isTopCard ? { area: "waste" } : null
      });
      cardEl.classList.add("waste-card");
      cardEl.style.zIndex = String(index + 1);
      row.appendChild(cardEl);
    });
    els.waste.appendChild(row);
  }

  function renderFoundations() {
    clear(els.foundations);
    SUITS.forEach((suit) => {
      const pile = pileElement("foundation", suit);
      pile.dataset.suit = SUIT_LABELS[suit];
      pile.setAttribute("aria-label", t("foundation", { suit: suitName(suit) }));
      const card = top(state.foundations[suit]);
      if (card) {
        pile.appendChild(cardElement(card, {
          draggable: true,
          source: { area: "foundation", suit }
        }));
      }
      els.foundations.appendChild(pile);
    });
  }

  function renderTableau() {
    clear(els.tableau);
    state.tableau.forEach((cards, pileIndex) => {
      const pile = pileElement("tableau", String(pileIndex));
      pile.setAttribute("aria-label", t("tableauPile", { number: pileIndex + 1 }));
      let stackY = 0;

      cards.forEach((card, cardIndex) => {
        const cardEl = cardElement(card, {
          draggable: card.faceUp,
          source: { area: "tableau", pileIndex, cardIndex }
        });
        cardEl.style.setProperty("--stack-y", `${stackY}px`);
        stackY += stackOffset(card);
        pile.appendChild(cardEl);
      });

      els.tableau.appendChild(pile);
    });
  }

  function pileElement(type, key) {
    const pile = document.createElement("div");
    pile.className = `pile ${type}`;
    pile.dataset.type = type;
    pile.dataset.key = key;
    return pile;
  }

  function cardElement(card, options) {
    const el = document.createElement("div");
    el.className = card.faceUp ? `card ${card.color}` : "card back";
    el.dataset.id = card.id;
    el.draggable = false;

    if (card.faceUp) {
      const label = cardLabel(card);
      const top = document.createElement("span");
      top.className = "corner";
      top.textContent = label;
      const center = document.createElement("span");
      center.className = "center";
      center.textContent = SUIT_LABELS[card.suit];
      const bottom = top.cloneNode(true);
      bottom.className = "corner bottom";
      el.append(top, center, bottom);
    }

    if (options.source && isSelectedCard(options.source)) {
      el.classList.add("selected");
    }

    if (options.draggable) {
      el.addEventListener("pointerdown", (event) => onTouchPointerDown(event, options.source));
      el.addEventListener("dblclick", (event) => {
        event.preventDefault();
        tryMoveToFoundation(options.source);
      });
    }

    return el;
  }

  function isSelectedCard(source) {
    if (!state.selected || !source) return false;

    if (state.selected.area === "tableau" && source.area === "tableau") {
      return state.selected.pileIndex === source.pileIndex &&
        source.cardIndex >= state.selected.cardIndex;
    }

    if (state.selected.area === "foundation" && source.area === "foundation") {
      return state.selected.suit === source.suit;
    }

    return state.selected.area === source.area;
  }

  function isDoubleTap(source) {
    if (!state.lastTap) return false;
    return Date.now() - state.lastTap.time < 360 && sameSource(state.lastTap.source, source);
  }

  function sameSource(first, second) {
    if (!first || !second || first.area !== second.area) return false;

    if (first.area === "tableau") {
      return first.pileIndex === second.pileIndex && first.cardIndex === second.cardIndex;
    }

    if (first.area === "foundation") {
      return first.suit === second.suit;
    }

    return true;
  }

  function onDragStart(event, source) {
    state.drag = source;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", JSON.stringify(source));
    event.currentTarget.classList.add("dragging");
  }

  function onDragEnd(event) {
    event.currentTarget.classList.remove("dragging");
    document.querySelectorAll(".can-drop").forEach((el) => el.classList.remove("can-drop"));
    state.drag = null;
  }

  function onDragOver(event) {
    const target = dropTarget(event.currentTarget);
    if (state.drag && canMove(state.drag, target)) {
      event.preventDefault();
      event.currentTarget.classList.add("can-drop");
    }
  }

  function onDragLeave(event) {
    event.currentTarget.classList.remove("can-drop");
  }

  function onDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove("can-drop");
    const target = dropTarget(event.currentTarget);
    if (state.drag && canMove(state.drag, target)) {
      moveCards(state.drag, target);
      countMove();
    }
  }

  function onTouchPointerDown(event, source) {
    if (event.button !== 0 || state.won) return;

    const cards = movingCards(source);
    if (!cards.length || !cards[0].faceUp) return;

    event.preventDefault();
    event.stopPropagation();

    if (isDoubleTap(source)) {
      state.lastTap = null;
      tryMoveToFoundation(source);
      return;
    }

    state.lastTap = { source, time: Date.now() };
    event.currentTarget.setPointerCapture(event.pointerId);
    state.drag = source;
    state.selected = source;
    state.touch = {
      pointerId: event.pointerId,
      source,
      ghost: createTouchGhost(cards),
      currentDrop: null
    };
    document.body.classList.add("touch-dragging");
    event.currentTarget.classList.add("dragging");
    moveTouchGhost(event.clientX, event.clientY);
    updateTouchDropTarget(event.clientX, event.clientY);

    window.addEventListener("pointermove", onTouchPointerMove, { passive: false });
    window.addEventListener("pointerup", onTouchPointerUp);
    window.addEventListener("pointercancel", onTouchPointerCancel);
  }

  function onTouchPointerMove(event) {
    if (!state.touch || event.pointerId !== state.touch.pointerId) return;
    event.preventDefault();
    moveTouchGhost(event.clientX, event.clientY);
    updateTouchDropTarget(event.clientX, event.clientY);
  }

  function onTouchPointerUp(event) {
    if (!state.touch || event.pointerId !== state.touch.pointerId) return;
    event.preventDefault();

    const dropEl = state.touch.currentDrop;
    const target = dropEl ? dropTarget(dropEl) : null;
    if (target && canMove(state.touch.source, target)) {
      saveUndoSnapshot();
      moveCards(state.touch.source, target);
      endTouchDrag(false);
      countMove();
      return;
    }

    endTouchDrag(false);
  }

  function onTouchPointerCancel(event) {
    if (state.touch && event.pointerId === state.touch.pointerId) {
      endTouchDrag(false);
    }
  }

  function cancelActiveDrag() {
    endTouchDrag(false);
  }

  function createTouchGhost(cards) {
    const ghost = document.createElement("div");
    ghost.className = "touch-ghost";
    let stackY = 0;

    cards.forEach((card) => {
      const cardEl = cardElement(card, { draggable: false, source: null });
      cardEl.style.setProperty("--stack-y", `${stackY}px`);
      stackY += stackOffset(card);
      ghost.appendChild(cardEl);
    });

    document.body.appendChild(ghost);
    return ghost;
  }

  function moveTouchGhost(x, y) {
    if (!state.touch) return;
    state.touch.ghost.style.left = `${x}px`;
    state.touch.ghost.style.top = `${y}px`;
  }

  function updateTouchDropTarget(x, y) {
    if (!state.touch) return;

    const dropEl = document.elementFromPoint(x, y)?.closest(".pile");
    if (dropEl === state.touch.currentDrop) return;

    if (state.touch.currentDrop) {
      state.touch.currentDrop.classList.remove("can-drop");
    }

    state.touch.currentDrop = null;
    if (!dropEl) return;

    const target = dropTarget(dropEl);
    if (canMove(state.touch.source, target)) {
      dropEl.classList.add("can-drop");
      state.touch.currentDrop = dropEl;
    }
  }

  function endTouchDrag(keepSource) {
    if (state.touch?.currentDrop) {
      state.touch.currentDrop.classList.remove("can-drop");
    }

    state.touch?.ghost?.remove();
    document.querySelectorAll(".touch-ghost").forEach((el) => el.remove());
    document.body.classList.remove("touch-dragging");
    document.querySelectorAll(".dragging").forEach((el) => el.classList.remove("dragging"));
    window.removeEventListener("pointermove", onTouchPointerMove);
    window.removeEventListener("pointerup", onTouchPointerUp);
    window.removeEventListener("pointercancel", onTouchPointerCancel);
    state.touch = null;
    state.selected = null;
    if (!keepSource) state.drag = null;
  }

  function dropTarget(el) {
    return { area: el.dataset.type, key: el.dataset.key };
  }

  function canMove(source, target) {
    const moving = movingCards(source);
    const card = moving[0];
    if (!card || !card.faceUp) return false;

    if (target.area === "foundation") {
      return moving.length === 1 && canMoveToFoundation(card, target.key);
    }

    if (target.area === "tableau") {
      return canMoveToTableau(card, Number(target.key));
    }

    return false;
  }

  function canMoveToFoundation(card, suit) {
    if (card.suit !== suit) return false;
    const foundationTop = top(state.foundations[suit]);
    return foundationTop ? card.rank === foundationTop.rank + 1 : card.rank === 1;
  }

  function canAutoFinish() {
    if (!allTableauCardsFaceUp()) return false;
    const test = cloneFinishState();
    return drainToFoundations(test).won;
  }

  function autoFinishEnabled() {
    try {
      return localStorage.getItem(AUTO_FINISH_STORAGE_KEY) !== "false";
    } catch (_error) {
      return true;
    }
  }

  function scheduleAutoFinish() {
    if (autoFinishTimer) window.clearTimeout(autoFinishTimer);
    autoFinishTimer = null;
    if (!autoFinishEnabled() || state.won || els.autoFinish.disabled) return;
    autoFinishTimer = window.setTimeout(() => {
      autoFinishTimer = null;
      autoFinish();
    }, 250);
  }

  function allTableauCardsFaceUp() {
    return state.tableau.every((pile) => pile.every((card) => card.faceUp));
  }

  function cloneFinishState() {
    return {
      stock: state.stock.map(copyCard),
      waste: state.waste.map(copyCard),
      tableau: state.tableau.map((pile) => pile.map(copyCard)),
      drawCount: state.drawCount,
      foundationRanks: Object.fromEntries(
        SUITS.map((suit) => [suit, state.foundations[suit].length])
      )
    };
  }

  function copyCard(card) {
    return { ...card };
  }

  function saveUndoSnapshot() {
    state.undoSnapshot = {
      stock: state.stock.map(copyCard),
      waste: state.waste.map(copyCard),
      foundations: Object.fromEntries(
        SUITS.map((suit) => [suit, state.foundations[suit].map(copyCard)])
      ),
      tableau: state.tableau.map((pile) => pile.map(copyCard)),
      moves: state.moves,
      won: state.won
    };
  }

  function undoLastMove() {
    if (!state.undoSnapshot) return;

    const snapshot = state.undoSnapshot;
    state.stock = snapshot.stock.map(copyCard);
    state.waste = snapshot.waste.map(copyCard);
    state.foundations = Object.fromEntries(
      SUITS.map((suit) => [suit, snapshot.foundations[suit].map(copyCard)])
    );
    state.tableau = snapshot.tableau.map((pile) => pile.map(copyCard));
    state.moves = snapshot.moves;
    state.won = snapshot.won;
    state.drag = null;
    state.touch = null;
    state.selected = null;
    state.lastTap = null;
    state.undoSnapshot = null;
    saveGame();
    render();
  }

  function drainToFoundations(game) {
    const seen = new Set();

    while (!finishStateWon(game)) {
      const key = finishStateKey(game);
      if (seen.has(key)) return { won: false, moves: 0 };
      seen.add(key);

      let moved = 0;
      moved += moveAvailableTableauCardsToFoundation(game);
      moved += moveAvailableWasteCardToFoundation(game);

      if (moved) continue;

      if (game.stock.length) {
        drawFromFinishStock(game);
        continue;
      }

      if (game.waste.length) {
        game.stock = game.waste.reverse().map((card) => ({ ...card, faceUp: false }));
        game.waste = [];
        continue;
      }

      return { won: false, moves: 0 };
    }

    return { won: true, moves: seen.size };
  }

  function moveAvailableTableauCardsToFoundation(game) {
    let moved = 0;
    let changed = true;

    while (changed) {
      changed = false;
      for (const pile of game.tableau) {
        const card = top(pile);
        if (card && canFinishMove(game, card)) {
          pile.pop();
          game.foundationRanks[card.suit] += 1;
          moved += 1;
          changed = true;
        }
      }
    }

    return moved;
  }

  function moveAvailableWasteCardToFoundation(game) {
    const card = top(game.waste);
    if (!card || !canFinishMove(game, card)) return 0;
    game.waste.pop();
    game.foundationRanks[card.suit] += 1;
    return 1;
  }

  function drawFromFinishStock(game) {
    const cardsToDraw = Math.min(game.drawCount, game.stock.length);
    for (let index = 0; index < cardsToDraw; index++) {
      const card = game.stock.pop();
      card.faceUp = true;
      game.waste.push(card);
    }
  }

  function canFinishMove(game, card) {
    return card.rank === game.foundationRanks[card.suit] + 1;
  }

  function finishStateWon(game) {
    return SUITS.every((suit) => game.foundationRanks[suit] === 13);
  }

  function finishStateKey(game) {
    return JSON.stringify({
      stock: game.stock.map((card) => card.id),
      waste: game.waste.map((card) => card.id),
      tableau: game.tableau.map((pile) => pile.map((card) => card.id)),
      foundationRanks: game.foundationRanks
    });
  }

  function autoFinish() {
    if (els.autoFinish.disabled) return;

    saveUndoSnapshot();
    const seen = new Set();
    let moved = 0;
    let changed = true;

    while (!state.won && changed) {
      const key = finishStateKey(cloneFinishState());
      if (seen.has(key)) break;
      seen.add(key);

      changed = false;

      for (let pileIndex = 0; pileIndex < state.tableau.length; pileIndex++) {
        const card = top(state.tableau[pileIndex]);
        if (card && canMoveToFoundation(card, card.suit)) {
          moveCards(
            { area: "tableau", pileIndex, cardIndex: state.tableau[pileIndex].length - 1 },
            { area: "foundation", key: card.suit }
          );
          moved += 1;
          changed = true;
        }
      }

      const wasteCard = top(state.waste);
      if (wasteCard && canMoveToFoundation(wasteCard, wasteCard.suit)) {
        moveCards({ area: "waste" }, { area: "foundation", key: wasteCard.suit });
        moved += 1;
        changed = true;
      } else if (!changed && state.stock.length) {
        const cardsToDraw = Math.min(state.drawCount, state.stock.length);
        for (let index = 0; index < cardsToDraw; index++) {
          const card = state.stock.pop();
          card.faceUp = true;
          state.waste.push(card);
        }
        moved += 1;
        changed = true;
      } else if (!changed && state.waste.length) {
        state.stock = state.waste.reverse().map((card) => ({ ...card, faceUp: false }));
        state.waste = [];
        moved += 1;
        changed = true;
      }

      checkWin();
    }

    if (moved) {
      state.moves += moved;
      checkWin();
      saveGame();
      render();
    }
  }

  function canMoveToTableau(card, pileIndex) {
    const destinationTop = top(state.tableau[pileIndex]);
    if (!destinationTop) return card.rank === 13;
    return destinationTop.faceUp &&
      destinationTop.color !== card.color &&
      destinationTop.rank === card.rank + 1;
  }

  function moveCards(source, target) {
    const cards = removeFromSource(source);

    if (target.area === "foundation") {
      state.foundations[target.key].push(cards[0]);
    }

    if (target.area === "tableau") {
      state.tableau[Number(target.key)].push(...cards);
    }

    flipUncoveredTableauCard(source);
    state.selected = null;
  }

  function removeFromSource(source) {
    if (source.area === "waste") {
      return [state.waste.pop()];
    }

    if (source.area === "foundation") {
      return [state.foundations[source.suit].pop()];
    }

    return state.tableau[source.pileIndex].splice(source.cardIndex);
  }

  function movingCards(source) {
    if (source.area === "waste") return top(state.waste) ? [top(state.waste)] : [];
    if (source.area === "foundation") return top(state.foundations[source.suit]) ? [top(state.foundations[source.suit])] : [];
    return state.tableau[source.pileIndex].slice(source.cardIndex);
  }

  function flipUncoveredTableauCard(source) {
    if (source.area !== "tableau") return;
    const card = top(state.tableau[source.pileIndex]);
    if (card && !card.faceUp) card.faceUp = true;
  }

  function tryMoveToFoundation(source) {
    const card = movingCards(source)[0];
    if (!card) return;
    const target = { area: "foundation", key: card.suit };
    if (canMove(source, target)) {
      saveUndoSnapshot();
      moveCards(source, target);
      countMove();
    }
  }

  function cardLabel(card) {
    return `${RANK_LABELS[card.rank] || card.rank}${SUIT_LABELS[card.suit]}`;
  }

  function suitName(suit) {
    return { S: t("spades"), H: t("hearts"), D: t("diamonds"), C: t("clubs") }[suit];
  }

  function top(cards) {
    return cards[cards.length - 1];
  }

  function clear(el) {
    el.replaceChildren();
  }

  function stackOffset(card) {
    const styles = getComputedStyle(document.documentElement);
    const value = styles.getPropertyValue(card.faceUp ? "--face-up-stack" : "--face-down-stack");
    return Number.parseFloat(value) || (card.faceUp ? 28 : 12);
  }

  function applyTheme(theme) {
    const selectedTheme = THEMES.includes(theme) ? theme : "colorblind";
    document.body.dataset.theme = selectedTheme;
    if (els.themeSelect) els.themeSelect.value = selectedTheme;
    saveTheme(selectedTheme);
  }

  function savedTheme() {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY);
    } catch (_error) {
      return null;
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (_error) {
      // The theme still applies for the current page view.
    }
  }

  function applyDrawCount(value) {
    const drawCount = Number(value) === 3 ? 3 : 1;
    state.drawCount = drawCount;
    els.drawCount.value = String(drawCount);
    saveDrawCount(drawCount);
    if (state.stock.length || state.waste.length || state.tableau.some((pile) => pile.length)) {
      render();
    }
  }

  function savedDrawCount() {
    try {
      return localStorage.getItem(DRAW_COUNT_STORAGE_KEY);
    } catch (_error) {
      return null;
    }
  }

  function saveDrawCount(drawCount) {
    try {
      localStorage.setItem(DRAW_COUNT_STORAGE_KEY, String(drawCount));
    } catch (_error) {
      // The draw setting still applies for the current page view.
    }
  }

  function saveGame() {
    try {
      localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify({
        stock: state.stock,
        waste: state.waste,
        foundations: state.foundations,
        tableau: state.tableau,
        moves: state.moves,
        won: state.won,
        undoSnapshot: state.undoSnapshot
      }));
    } catch (_error) {
      // The current game still works for this page view.
    }
  }

  function restoreSavedGame() {
    try {
      const saved = JSON.parse(localStorage.getItem(GAME_STORAGE_KEY));
      if (!isSavedGame(saved)) return false;

      state.stock = saved.stock.map(copyCard);
      state.waste = saved.waste.map(copyCard);
      state.foundations = Object.fromEntries(
        SUITS.map((suit) => [suit, saved.foundations[suit].map(copyCard)])
      );
      state.tableau = saved.tableau.map((pile) => pile.map(copyCard));
      state.moves = Number(saved.moves) || 0;
      state.won = Boolean(saved.won);
      state.undoSnapshot = saved.undoSnapshot || null;
      state.drag = null;
      state.touch = null;
      state.selected = null;
      state.lastTap = null;
      render();
      return true;
    } catch (_error) {
      return false;
    }
  }

  function isSavedGame(saved) {
    return Boolean(saved) &&
      Array.isArray(saved.stock) &&
      Array.isArray(saved.waste) &&
      saved.foundations &&
      SUITS.every((suit) => Array.isArray(saved.foundations[suit])) &&
      Array.isArray(saved.tableau) &&
      saved.tableau.length === 7 &&
      saved.tableau.every(Array.isArray);
  }

  function preventViewportMove(event) {
    if (isControlTarget(event.target)) return;
    event.preventDefault();
  }

  function preventViewportTouchStart(event) {
    if (event.touches.length > 1) {
      event.preventDefault();
      cancelActiveDrag();
      return;
    }

    if (isControlTarget(event.target)) return;
  }

  function preventMultiTouchMove(event) {
    if (event.touches.length > 1) {
      event.preventDefault();
      cancelActiveDrag();
    }
  }

  function preventDoubleTapZoom(event) {
    if (!isControlTarget(event.target)) {
      event.preventDefault();
      state.lastTouchEnd = Date.now();
      return;
    }

    const now = Date.now();
    if (now - state.lastTouchEnd < 450) {
      event.preventDefault();
    }
    state.lastTouchEnd = now;
  }

  function preventGestureZoom(event) {
    event.preventDefault();
  }

  function preventBrowserDoubleClick(event) {
    if (isControlTarget(event.target)) return;
    event.preventDefault();
  }

  function rerenderForViewportChange() {
    if (state.stock.length || state.waste.length || state.tableau.some((pile) => pile.length)) {
      render();
      window.setTimeout(render, 160);
    }
  }

  function isControlTarget(target) {
    return Boolean(target.closest("a, button, input, select, option, label"));
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("../../sw.js").catch(() => {
      // The game still runs if offline caching is unavailable.
    });
  }

  els.stock.addEventListener("click", drawFromStock);
  els.undo.addEventListener("click", undoLastMove);
  els.autoFinish.addEventListener("click", autoFinish);
  els.drawCount.addEventListener("input", (event) => applyDrawCount(event.target.value));
  if (els.themeSelect) els.themeSelect.addEventListener("change", (event) => applyTheme(event.target.value));
  els.newGame.addEventListener("click", newGame);
  document.addEventListener("contextmenu", (event) => event.preventDefault());
  document.addEventListener("dblclick", preventBrowserDoubleClick, { capture: true });
  document.addEventListener("dragstart", (event) => event.preventDefault());
  document.addEventListener("touchstart", preventViewportTouchStart, { passive: false });
  document.addEventListener("touchmove", preventMultiTouchMove, { passive: false, capture: true });
  document.addEventListener("touchmove", preventViewportMove, { passive: false });
  document.addEventListener("touchend", preventDoubleTapZoom, { passive: false });
  document.addEventListener("gesturestart", preventGestureZoom);
  document.addEventListener("gesturechange", preventGestureZoom);
  document.addEventListener("gestureend", preventGestureZoom);
  document.addEventListener("lmag:languagechange", applyLanguage);
  window.addEventListener("resize", rerenderForViewportChange);
  window.addEventListener("orientationchange", rerenderForViewportChange);
  applyTheme(savedTheme());
  applyDrawCount(savedDrawCount());
  if (!restoreSavedGame()) {
    newGame();
  }
  registerServiceWorker();
})();
