(function () {
  "use strict";

  const SUITS = ["S", "H", "D", "C"];
  const RANKS = ["", "", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const SYMBOLS = { S: "♠", H: "♥", D: "♦", C: "♣" };
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const els = {
    status: document.getElementById("status"), hands: document.getElementById("hands"), melds: document.getElementById("melds"),
    stock: document.getElementById("stock-count"), discard: document.getElementById("discard-top"), count1: document.getElementById("count-1"), count2: document.getElementById("count-2"),
    draw: document.getElementById("draw-card"), drawDiscard: document.getElementById("draw-discard"), layMeld: document.getElementById("lay-meld"),
    discardCard: document.getElementById("discard-card"), goOut: document.getElementById("go-out"), mode: document.getElementById("computer-mode"),
    playerCount: document.getElementById("player-count"), passPanel: document.getElementById("pass-panel"), passTitle: document.getElementById("pass-title"),
    showHand: document.getElementById("show-hand"), note: document.getElementById("turn-note")
  };
  let state;

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
      revealedPlayer: 0, lastActive: 0
    };
    for (let round = 0; round < 7; round += 1) for (let player = 0; player < playerCount; player += 1) state.hands[player].push(state.stock.pop());
    state.discard.push(state.stock.pop());
    els.playerCount.disabled = computer;
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
    state.score[winner] += state.hands.reduce((total, hand, player) => total + (player === winner ? 0 : hand.reduce((sum, card) => sum + cardValue(card), 0)), 0);
    state.aiPending = false;
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
    recycleStock();
    const top = state.discard[state.discard.length - 1];
    const useDiscard = top && bestPartition(state.hands[player].concat(top)).used > bestPartition(state.hands[player]).used;
    if (useDiscard) state.hands[player].push(state.discard.pop());
    else if (state.stock.length) state.hands[player].push(state.stock.pop());
    else if (top) state.hands[player].push(state.discard.pop());
    state.drawn = true;
    aiLayCards(player);
    if (!state.hands[player].length) { finishRound(player); render(); return; }
    let best = null;
    state.hands[player].forEach((card, index) => {
      const hand = state.hands[player].slice();
      hand.splice(index, 1);
      const candidate = { index, deadwood: bestPartition(hand).deadwood, value: cardValue(card) };
      if (!best || candidate.deadwood < best.deadwood || (candidate.deadwood === best.deadwood && candidate.value > best.value)) best = candidate;
    });
    state.discard.push(state.hands[player].splice(best ? best.index : 0, 1)[0]);
    state.drawn = false;
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
      hand.forEach((card) => row.appendChild(cardButton(card, player === state.active && canAct(), state.selected.includes(card.id), () => selectCard(card.id), !handVisible(player))));
      box.appendChild(row);
      els.hands.appendChild(box);
    });
    const chosen = selectedCards(state.active);
    const top = state.discard[state.discard.length - 1];
    els.status.textContent = state.winner !== null ? "Player " + (state.winner + 1) + " went out." : state.computer && state.active === 1 ? "Computer is thinking…" : canAct() ? state.drawn ? "Lay melds, add to a meld, or select one card to discard." : "Draw a card, or go out now if all seven cards form melds." : "Pass the device to Player " + (state.active + 1) + ".";
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
    els.note.textContent = state.winner === null ? "Basic Rummy uses seven-card hands here. Meld sets or same-suit runs on the table; unlike Gin Rummy, players may lay off cards during play." : "Unmelded cards left in the other hands were added to the winner's score.";
    renderMelds();
  }

  els.mode.addEventListener("change", newGame);
  els.playerCount.addEventListener("change", () => { if (!els.mode.checked) newGame(); });
  els.showHand.addEventListener("click", showActiveHand);
  document.getElementById("new-game").addEventListener("click", newGame);
  els.draw.addEventListener("click", drawFromStock);
  els.drawDiscard.addEventListener("click", drawFromDiscard);
  els.layMeld.addEventListener("click", layMeld);
  els.discardCard.addEventListener("click", discardSelected);
  els.goOut.addEventListener("click", goOut);
  try { const theme = localStorage.getItem("leave-me-alone-games-theme"); document.body.dataset.theme = THEMES.has(theme) ? theme : "colorblind"; } catch { document.body.dataset.theme = "colorblind"; }
  newGame();
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("../../sw.js").catch(() => {}));
})();
