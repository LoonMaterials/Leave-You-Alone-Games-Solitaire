(function () {
  "use strict";
  try {
    localStorage.setItem("leave-me-alone-games-last-game", JSON.stringify({ id: "rummy", href: "games/rummy/index.html", title: document.querySelector("h1")?.textContent?.trim() || "rummy", playedAt: Date.now() }));
  } catch {}

  const SUITS = ["S", "H", "D", "C"];
  const RANKS = ["", "", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const SYMBOLS = { S: "♠", H: "♥", D: "♦", C: "♣" };
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const DIFFICULTY_KEY = "leave-me-alone-rummy-difficulty";
  const SAVE_KEY = "leave-me-alone-rummy-save-v1";
  const HAND_ORDER_KEY = "leave-me-alone-rummy-hand-order";
  const DIFFICULTIES = new Set(["easy", "medium", "hard"]);
  const els = {
    status: document.getElementById("status"), hands: document.getElementById("hands"), melds: document.getElementById("melds"),
    stock: document.getElementById("stock-count"), discard: document.getElementById("discard-top"), count1: document.getElementById("count-1"), count2: document.getElementById("count-2"),
    draw: document.getElementById("draw-card"), drawDiscard: document.getElementById("draw-discard"), layMeld: document.getElementById("lay-meld"),
    discardCard: document.getElementById("discard-card"), goOut: document.getElementById("go-out"), mode: document.getElementById("computer-mode"), difficulty: document.getElementById("difficulty"),
    playerCount: document.getElementById("player-count"), passPanel: document.getElementById("pass-panel"), passTitle: document.getElementById("pass-title"),
    showHand: document.getElementById("show-hand"), note: document.getElementById("turn-note"), handOrder: document.getElementById("hand-order")
  };
  let state;

  function storedDifficulty() { try { const value = localStorage.getItem(DIFFICULTY_KEY); return DIFFICULTIES.has(value) ? value : "medium"; } catch { return "medium"; } }
  function applyDifficulty() { els.difficulty.value = storedDifficulty(); els.difficulty.disabled = !els.mode.checked; }
  function saveDifficulty() { try { localStorage.setItem(DIFFICULTY_KEY, DIFFICULTIES.has(els.difficulty.value) ? els.difficulty.value : "medium"); } catch {} }
  function storedHandOrder() { try { const value = localStorage.getItem(HAND_ORDER_KEY); return ["dealt", "suit", "rank"].includes(value) ? value : "suit"; } catch { return "suit"; } }
  function saveHandOrder() { try { localStorage.setItem(HAND_ORDER_KEY, els.handOrder.value); } catch {} render(); }
  function orderedHand(hand) {
    if (els.handOrder.value === "dealt") return hand.slice();
    return hand.slice().sort((a, b) => els.handOrder.value === "rank" ? (runRank(a) - runRank(b) || SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit)) : (SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit) || runRank(a) - runRank(b)));
  }
  function saveState() { if (state) try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, aiPending: false })); } catch {} }
  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!saved || !Array.isArray(saved.hands) || saved.hands.length < 2 || !Array.isArray(saved.stock) || !Array.isArray(saved.discard)) return null;
      saved.aiPending = false;
      saved.selected = [];
      saved.revealedPlayer = saved.computer ? 0 : -1;
      saved.lastActive = saved.active;
      return saved;
    } catch { return null; }
  }

  function handVisible(player) { return state.computer ? player === 0 : state.revealedPlayer === player; }
  function canAct() { return state.winner === null && (!state.computer || state.active === 0) && handVisible(state.active); }
  function resetReveal() {
    if (state.lastActive !== state.active) { state.lastActive = state.active; state.revealedPlayer = state.computer ? 0 : -1; }
  }
  function showActiveHand() { if (!state.computer) { state.revealedPlayer = state.active; render(); } }

  function makeDeck() {
    const deck = [];
    SUITS.forEach((suit) => { for (let rank = 2; rank <= 14; rank += 1) deck.push({ id: suit + rank, rank, suit }); });
    return deck;
  }

  function shuffle(cards) {
    for (let index = cards.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [cards[index], cards[swap]] = [cards[swap], cards[index]];
    }
    return cards;
  }

  function cardText(card) { return RANKS[card.rank] + SYMBOLS[card.suit]; }
  function isRed(card) { return card.suit === "H" || card.suit === "D"; }
  function cardValue(card) { return card.rank === 14 ? 1 : Math.min(10, card.rank); }
  function runRank(card) { return card.rank === 14 ? 1 : card.rank; }
  function sortMeld(cards) { return cards.slice().sort((a, b) => runRank(a) - runRank(b) || a.suit.localeCompare(b.suit)); }

  function isSet(cards) {
    return cards.length >= 3 && cards.length <= 4 && cards.every((card) => card.rank === cards[0].rank);
  }

  function isRun(cards) {
    if (cards.length < 3) return false;
    const ordered = sortMeld(cards);
    return ordered.every((card, index) => card.suit === ordered[0].suit && (index === 0 || runRank(card) === runRank(ordered[index - 1]) + 1));
  }

  function isMeld(cards) { return isSet(cards) || isRun(cards); }

  function bestPartition(cards) {
    const memo = new Map();
    function solve(mask) {
      if (!mask) return { groups: [], used: 0, deadwood: 0 };
      if (memo.has(mask)) return memo.get(mask);
      let first = 0;
      while (!(mask & (1 << first))) first += 1;
      const skipped = solve(mask ^ (1 << first));
      let best = { groups: skipped.groups, used: skipped.used, deadwood: cardValue(cards[first]) + skipped.deadwood };
      const remaining = mask ^ (1 << first);
      for (let subset = remaining; subset; subset = (subset - 1) & remaining) {
        const groupMask = subset | (1 << first);
        const group = [];
        for (let index = 0; index < cards.length; index += 1) if (groupMask & (1 << index)) group.push(cards[index]);
        if (!isMeld(group)) continue;
        const rest = solve(mask ^ groupMask);
        const candidate = { groups: [sortMeld(group)].concat(rest.groups), used: group.length + rest.used, deadwood: rest.deadwood };
        if (candidate.used > best.used || (candidate.used === best.used && candidate.deadwood < best.deadwood)) best = candidate;
      }
      memo.set(mask, best);
      return best;
    }
    return solve((1 << cards.length) - 1);
  }

  function handIsMeldable(hand) { return hand.length > 0 && bestPartition(hand).used === hand.length; }
  function handPotential(hand) {
    const partition = bestPartition(hand);
    let potential = partition.used * 35 - partition.deadwood;
    for (let first = 0; first < hand.length; first += 1) for (let second = first + 1; second < hand.length; second += 1) {
      const a = hand[first], b = hand[second];
      if (a.rank === b.rank) potential += 9;
      if (a.suit === b.suit) {
        const gap = Math.abs(runRank(a) - runRank(b));
        if (gap === 1) potential += 7;
        else if (gap === 2) potential += 3;
      }
    }
    return potential;
  }

  function opponentDiscardDanger(card) {
    return state.opponentPickups.reduce((danger, pickup) => danger + (pickup.rank === card.rank ? 8 : pickup.suit === card.suit && Math.abs(runRank(pickup) - runRank(card)) <= 2 ? 5 : 0), 0);
  }

  function bestDiscardPlan(hand, forbiddenId, hard) {
    return hand.map((card, index) => {
      if (card.id === forbiddenId) return null;
      const remaining = hand.slice();
      remaining.splice(index, 1);
      return { index, card, deadwood: bestPartition(remaining).deadwood, potential: handPotential(remaining), danger: hard ? opponentDiscardDanger(card) : 0 };
    }).filter(Boolean).sort((a, b) => b.potential - a.potential || a.deadwood - b.deadwood || a.danger - b.danger || cardValue(b.card) - cardValue(a.card))[0];
  }

  function selectedCards(player) {
    const selected = new Set(state.selected);
    return state.hands[player].filter((card) => selected.has(card.id));
  }

  function recycleStock() {
    if (state.stock.length || state.discard.length <= 1) return;
    const top = state.discard.pop();
    state.stock = shuffle(state.discard.splice(0));
    state.discard = [top];
  }

  function newGame() {
    const deck = shuffle(makeDeck());
    const computer = els.mode.checked;
    const playerCount = computer ? 2 : Number(els.playerCount.value);
    state = {
      stock: deck, discard: [], hands: Array.from({ length: playerCount }, () => []), melds: [], active: 0, drawn: false,
      selected: [], drawnDiscardId: null, computer, playerCount, winner: null, score: Array(playerCount).fill(0), aiPending: false,
      revealedPlayer: 0, lastActive: 0, opponentPickups: []
    };
    for (let round = 0; round < 7; round += 1) for (let player = 0; player < playerCount; player += 1) state.hands[player].push(state.stock.pop());
    state.discard.push(state.stock.pop());
    els.playerCount.disabled = computer;
    els.difficulty.disabled = !computer;
    render();
    scheduleAI();
  }

  function drawFromStock() {
    if (!canAct() || state.drawn) return;
    recycleStock();
    if (!state.stock.length) return;
    state.hands[state.active].push(state.stock.pop());
    state.drawn = true;
    state.drawnDiscardId = null;
    state.selected = [];
    render();
  }

  function drawFromDiscard() {
    if (!canAct() || state.drawn || !state.discard.length) return;
    const card = state.discard.pop();
    state.hands[state.active].push(card);
    if (state.computer && state.active === 0) state.opponentPickups = state.opponentPickups.concat(card).slice(-4);
    state.drawn = true;
    state.drawnDiscardId = card.id;
    state.selected = [];
    render();
  }

  function selectCard(cardId) {
    if (!canAct()) return;
    const index = state.selected.indexOf(cardId);
    if (index >= 0) state.selected.splice(index, 1);
    else state.selected.push(cardId);
    render();
  }

  function removeSelected(player) {
    const ids = new Set(state.selected);
    const cards = state.hands[player].filter((card) => ids.has(card.id));
    state.hands[player] = state.hands[player].filter((card) => !ids.has(card.id));
    state.selected = [];
    return cards;
  }

  function finishRound(winner) {
    state.winner = winner;
    if (winner >= 0) state.score[winner] += state.hands.reduce((total, hand, player) => total + (player === winner ? 0 : hand.reduce((sum, card) => sum + cardValue(card), 0)), 0);
    state.aiPending = false;
  }

  function finishLastCardShowdown() {
    if (state.winner !== null || !state.hands.every((hand) => hand.length === 1)) return false;
    const canLayOff = state.hands.some((hand) => state.melds.some((meld) => isMeld(meld.cards.concat(hand[0]))));
    if (canLayOff) return false;
    const values = state.hands.map((hand) => cardValue(hand[0]));
    const low = Math.min(...values);
    const leaders = values.map((value, player) => value === low ? player : -1).filter((player) => player >= 0);
    finishRound(leaders.length === 1 ? leaders[0] : -1);
    return true;
  }

  function layMeld() {
    if (!canAct() || !state.drawn) return;
    const cards = selectedCards(state.active);
    if (!isMeld(cards)) return;
    state.melds.push({ owner: state.active, cards: sortMeld(removeSelected(state.active)) });
    if (!state.hands[state.active].length) finishRound(state.active);
    render();
  }

  function layOff(meldIndex) {
    if (!canAct() || !state.drawn || !state.melds[meldIndex]) return;
    const cards = selectedCards(state.active);
    if (!cards.length || !isMeld(state.melds[meldIndex].cards.concat(cards))) return;
    state.melds[meldIndex].cards = sortMeld(state.melds[meldIndex].cards.concat(removeSelected(state.active)));
    if (!state.hands[state.active].length) finishRound(state.active);
    render();
  }

  function goOut() {
    if (!canAct() || !handIsMeldable(state.hands[state.active])) return;
    const player = state.active;
    const partition = bestPartition(state.hands[player]);
    partition.groups.forEach((cards) => state.melds.push({ owner: player, cards: sortMeld(cards) }));
    state.hands[player] = [];
    state.selected = [];
    finishRound(player);
    render();
  }

  function discardSelected() {
    if (!canAct() || !state.drawn || state.selected.length !== 1) return;
    const cardId = state.selected[0];
    if (cardId === state.drawnDiscardId) return;
    const player = state.active;
    const index = state.hands[player].findIndex((card) => card.id === cardId);
    if (index < 0) return;
    state.discard.push(state.hands[player].splice(index, 1)[0]);
    state.drawn = false;
    state.drawnDiscardId = null;
    state.selected = [];
    if (!state.hands[player].length) finishRound(player);
    else if (finishLastCardShowdown()) { render(); return; }
    else { state.active = (player + 1) % state.playerCount; render(); scheduleAI(); return; }
    render();
  }

  function aiLayCards(player) {
    const partition = bestPartition(state.hands[player]);
    const meldIds = new Set(partition.groups.flat().map((card) => card.id));
    partition.groups.forEach((cards) => state.melds.push({ owner: player, cards: sortMeld(cards) }));
    state.hands[player] = state.hands[player].filter((card) => !meldIds.has(card.id));
    let changed = true;
    while (changed) {
      changed = false;
      for (let cardIndex = 0; cardIndex < state.hands[player].length && !changed; cardIndex += 1) {
        for (let meldIndex = 0; meldIndex < state.melds.length; meldIndex += 1) {
          if (!isMeld(state.melds[meldIndex].cards.concat(state.hands[player][cardIndex]))) continue;
          state.melds[meldIndex].cards = sortMeld(state.melds[meldIndex].cards.concat(state.hands[player].splice(cardIndex, 1)));
          changed = true;
          break;
        }
      }
    }
  }

  function aiTurn() {
    const player = state.active;
    const difficulty = storedDifficulty();
    recycleStock();
    const top = state.discard[state.discard.length - 1];
    const currentPotential = handPotential(state.hands[player]);
    const topPlan = top ? bestDiscardPlan(state.hands[player].concat(top), top.id, difficulty === "hard") : null;
    const topGain = topPlan ? topPlan.potential - currentPotential : -Infinity;
    const useDiscard = Boolean(top && (difficulty === "easy" ? topGain > 8 && Math.random() > 0.35 : difficulty === "hard" ? topGain > -1 : topGain > 3));
    let drawnDiscardId = null;
    if (useDiscard) { const card = state.discard.pop(); state.hands[player].push(card); drawnDiscardId = card.id; }
    else if (state.stock.length) state.hands[player].push(state.stock.pop());
    else if (top) state.hands[player].push(state.discard.pop());
    state.drawn = true;
    aiLayCards(player);
    if (!state.hands[player].length) { finishRound(player); render(); return; }
    const candidates = state.hands[player].map((card, index) => ({ card, index })).filter((item) => item.card.id !== drawnDiscardId);
    let choice;
    if (difficulty === "easy") choice = candidates[Math.floor(Math.random() * candidates.length)];
    else choice = bestDiscardPlan(state.hands[player], drawnDiscardId, difficulty === "hard") || candidates[0];
    state.discard.push(state.hands[player].splice(choice ? choice.index : 0, 1)[0]);
    state.drawn = false;
    if (finishLastCardShowdown()) { state.aiPending = false; render(); return; }
    state.active = (player + 1) % state.playerCount;
    state.aiPending = false;
    render();
  }

  function scheduleAI() {
    if (!state || !state.computer || state.active === 0 || state.winner !== null || state.aiPending) return;
    state.aiPending = true;
    window.setTimeout(() => { if (state && state.computer && state.active !== 0 && state.winner === null) aiTurn(); }, 450);
  }

  function cardButton(card, enabled, selected, onClick, hidden) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "playing-card" + (isRed(card) ? " red" : "") + (selected ? " selected" : "");
    button.textContent = hidden ? "🂠" : cardText(card);
    button.disabled = !enabled;
    if (onClick) button.addEventListener("click", onClick);
    return button;
  }

  function renderMelds() {
    els.melds.textContent = "";
    if (!state.melds.length) {
      const empty = document.createElement("span");
      empty.className = "empty-melds";
      empty.textContent = "No melds have been laid yet.";
      els.melds.appendChild(empty);
      return;
    }
    state.melds.forEach((meld, meldIndex) => {
      const box = document.createElement("div");
      box.className = "meld-box";
      const row = document.createElement("div");
      row.className = "card-row";
      meld.cards.forEach((card) => row.appendChild(cardButton(card, false, false, null, false)));
      const action = document.createElement("button");
      action.type = "button";
      action.textContent = "Add selected here";
      action.disabled = !canAct() || !state.drawn || !selectedCards(state.active).length || !isMeld(meld.cards.concat(selectedCards(state.active)));
      action.addEventListener("click", () => layOff(meldIndex));
      box.appendChild(row);
      box.appendChild(action);
      els.melds.appendChild(box);
    });
  }

  function render() {
    resetReveal();
    els.hands.textContent = "";
    state.hands.forEach((hand, player) => {
      const box = document.createElement("div");
      box.className = "player-box";
      const heading = document.createElement("h3");
      heading.textContent = "Player " + (player + 1) + (state.active === player && state.winner === null ? " · active" : "") + (player === 1 && state.computer ? " · computer" : "");
      box.appendChild(heading);
      const row = document.createElement("div");
      row.className = "card-row";
      orderedHand(hand).forEach((card) => row.appendChild(cardButton(card, player === state.active && canAct(), state.selected.includes(card.id), () => selectCard(card.id), !handVisible(player))));
      box.appendChild(row);
      els.hands.appendChild(box);
    });
    const chosen = selectedCards(state.active);
    const top = state.discard[state.discard.length - 1];
    els.status.textContent = state.winner === -1 ? "Last-card showdown tied; the hand is a draw." : state.winner !== null ? "Player " + (state.winner + 1) + " won the hand." : state.computer && state.active === 1 ? "Computer is thinking…" : canAct() ? state.drawn ? "Lay melds, add to a meld, or select one card to discard." : "Draw a card, or go out now if all seven cards form melds." : "Pass the device to Player " + (state.active + 1) + ".";
    els.stock.textContent = String(state.stock.length);
    els.discard.textContent = top ? cardText(top) : "—";
    els.count1.textContent = state.hands[0].length + " cards · " + state.score[0] + " points";
    els.count2.textContent = (state.computer ? "Computer" : "Player 2") + " · " + state.hands[1].length + " cards · " + state.score[1] + " points";
    els.draw.disabled = !canAct() || state.drawn || !state.stock.length;
    els.drawDiscard.disabled = !canAct() || state.drawn || !state.discard.length;
    els.layMeld.disabled = !canAct() || !state.drawn || !isMeld(chosen);
    els.discardCard.disabled = !canAct() || !state.drawn || state.selected.length !== 1 || state.selected[0] === state.drawnDiscardId;
    els.goOut.disabled = !canAct() || !handIsMeldable(state.hands[state.active]);
    els.passPanel.hidden = state.computer || state.winner !== null || handVisible(state.active);
    els.passTitle.textContent = "Pass the device to Player " + (state.active + 1) + ".";
    els.showHand.textContent = "Player " + (state.active + 1) + ": show cards";
    els.note.textContent = state.winner === null ? "Rummy uses seven-card hands. Meld sets or same-suit runs on the table; unlike Gin Rummy, players may lay off cards during play." : state.winner === -1 ? "Equal last-card values end the hand as a draw with no points awarded." : "Unmelded cards left in the other hands were added to the winner's score.";
    renderMelds();
    saveState();
  }

  els.mode.addEventListener("change", () => { applyDifficulty(); newGame(); });
  els.difficulty.addEventListener("change", saveDifficulty);
  els.handOrder.addEventListener("change", saveHandOrder);
  els.playerCount.addEventListener("change", () => { if (!els.mode.checked) newGame(); });
  els.showHand.addEventListener("click", showActiveHand);
  document.getElementById("new-game").addEventListener("click", newGame);
  els.draw.addEventListener("click", drawFromStock);
  els.drawDiscard.addEventListener("click", drawFromDiscard);
  els.layMeld.addEventListener("click", layMeld);
  els.discardCard.addEventListener("click", discardSelected);
  els.goOut.addEventListener("click", goOut);
  try { const theme = localStorage.getItem("leave-me-alone-games-theme"); document.body.dataset.theme = THEMES.has(theme) ? theme : "colorblind"; } catch { document.body.dataset.theme = "colorblind"; }
  applyDifficulty();
  els.handOrder.value = storedHandOrder();
  state = loadState();
  if (state) {
    els.mode.checked = state.computer;
    els.playerCount.value = String(state.playerCount);
    els.playerCount.disabled = state.computer;
    applyDifficulty();
    render();
    scheduleAI();
  } else newGame();
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("../../sw.js").catch(() => {}));
})();
