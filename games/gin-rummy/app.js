(function () {
  "use strict";

  const SUITS = ["S", "H", "D", "C"];
  const RANKS = ["", "", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const SYMBOLS = { S: "♠", H: "♥", D: "♦", C: "♣" };
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const els = {
    status: document.getElementById("status"), hands: document.getElementById("hands"), stock: document.getElementById("stock-count"),
    discard: document.getElementById("discard-top"), count1: document.getElementById("count-1"), count2: document.getElementById("count-2"),
    draw: document.getElementById("draw-card"), drawDiscard: document.getElementById("draw-discard"), discardCard: document.getElementById("discard-card"),
    knock: document.getElementById("knock"), mode: document.getElementById("computer-mode"), playerCount: document.getElementById("player-count"),
    passPanel: document.getElementById("pass-panel"), passTitle: document.getElementById("pass-title"), showHand: document.getElementById("show-hand"), note: document.getElementById("turn-note")
  };
  let state;

  function handVisible(player) { return state.computer ? player === 0 : state.revealedPlayer === player; }
  function canAct() { return state.result === null && (!state.computer || state.active === 0) && handVisible(state.active); }
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
  function cardValue(card) { return Math.min(10, card.rank === 14 ? 10 : card.rank); }
  function isSet(cards) { return cards.length >= 3 && cards.length <= 4 && cards.every((card) => card.rank === cards[0].rank); }
  function isRun(cards) {
    if (cards.length < 3) return false;
    const ordered = cards.slice().sort((a, b) => a.rank - b.rank);
    return ordered.every((card, index) => card.suit === ordered[0].suit && (index === 0 || card.rank === ordered[index - 1].rank + 1));
  }
  function isMeld(cards) { return isSet(cards) || isRun(cards); }

  function bestPartition(cards) {
    const memo = new Map();
    function solve(mask) {
      if (!mask) return { groups: [], used: 0, deadwood: 0 };
      if (memo.has(mask)) return memo.get(mask);
      let first = 0;
      while (!(mask & (1 << first))) first += 1;
      const restWithoutFirst = solve(mask ^ (1 << first));
      let best = { groups: restWithoutFirst.groups, used: restWithoutFirst.used, deadwood: restWithoutFirst.deadwood + cardValue(cards[first]) };
      const remaining = mask ^ (1 << first);
      for (let subset = remaining; subset; subset = (subset - 1) & remaining) {
        const group = [cards[first]];
        for (let index = 0; index < cards.length; index += 1) if (subset & (1 << index)) group.push(cards[index]);
        if (!isMeld(group)) continue;
        const rest = solve(mask ^ (subset | (1 << first)));
        const candidate = { groups: [group].concat(rest.groups), used: group.length + rest.used, deadwood: rest.deadwood };
        if (candidate.used > best.used || (candidate.used === best.used && candidate.deadwood < best.deadwood)) best = candidate;
      }
      memo.set(mask, best);
      return best;
    }
    return solve((1 << cards.length) - 1);
  }

  function deadwood(hand) { return bestPartition(hand).deadwood; }

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
    const handSize = playerCount === 2 ? 10 : 7;
    state = { stock: deck, discard: [deck.pop()], hands: Array.from({ length: playerCount }, () => []), active: 0, drawn: false, selected: null, computer, playerCount, scores: Array(playerCount).fill(0), result: null, aiPending: false, revealedPlayer: 0, lastActive: 0 };
    for (let round = 0; round < handSize; round += 1) for (let player = 0; player < playerCount; player += 1) state.hands[player].push(state.stock.pop());
    els.playerCount.disabled = computer;
    render();
    scheduleAI();
  }

  function drawFromStock() {
    if (state.result || !canAct() || state.drawn) return;
    recycleStock();
    if (!state.stock.length) return;
    state.hands[state.active].push(state.stock.pop()); state.drawn = true; state.selected = null; render();
  }

  function drawFromDiscard() {
    if (state.result || !canAct() || state.drawn || !state.discard.length) return;
    state.hands[state.active].push(state.discard.pop()); state.drawn = true; state.selected = null; render();
  }

  function selectCard(index) {
    if (state.result || !canAct() || !state.drawn) return;
    state.selected = state.selected === index ? null : index; render();
  }

  function roundResult(knocker, knockerHand) {
    const opponent = (knocker + 1) % state.playerCount;
    const knockDeadwood = deadwood(knockerHand);
    const opponentDeadwood = deadwood(state.hands[opponent]);
    if (knockDeadwood === 0) { state.scores[knocker] += opponentDeadwood + 25; state.result = { winner: knocker, text: "Gin! Player " + (knocker + 1) + " scores " + (opponentDeadwood + 25) + "." }; return; }
    if (knockDeadwood < opponentDeadwood) { state.scores[knocker] += opponentDeadwood - knockDeadwood; state.result = { winner: knocker, text: "Player " + (knocker + 1) + " wins the knock by " + (opponentDeadwood - knockDeadwood) + "." }; return; }
    state.scores[opponent] += knockDeadwood - opponentDeadwood + 25;
    state.result = { winner: opponent, text: "Undercut! Player " + (opponent + 1) + " scores " + (knockDeadwood - opponentDeadwood + 25) + "." };
  }

  function discard(index, knock) {
    if (state.result || !canAct() || !state.drawn || index === null || index === undefined) return;
    const player = state.active;
    const hand = state.hands[player].slice(); hand.splice(index, 1);
    if (knock && deadwood(hand) > 10) return;
    state.discard.push(state.hands[player].splice(index, 1)[0]); state.drawn = false; state.selected = null;
    if (knock) roundResult(player, state.hands[player]);
    else { state.active = (player + 1) % state.playerCount; scheduleAI(); }
    render();
  }

  function aiDraw() {
    recycleStock();
    const top = state.discard[state.discard.length - 1];
    const stockCard = state.stock[state.stock.length - 1];
    const discardValue = top ? deadwood(state.hands[1].concat(top)) : Infinity;
    const stockValue = stockCard ? deadwood(state.hands[1].concat(stockCard)) : Infinity;
    if (top && discardValue <= stockValue) state.hands[1].push(state.discard.pop());
    else if (state.stock.length) state.hands[1].push(state.stock.pop());
    else if (top) state.hands[1].push(state.discard.pop());
    state.drawn = true;
  }

  function aiDiscard() {
    let best = null;
    state.hands[1].forEach((card, index) => {
      const hand = state.hands[1].slice(); hand.splice(index, 1);
      const candidate = { index, deadwood: deadwood(hand), value: cardValue(card) };
      if (!best || candidate.deadwood < best.deadwood || (candidate.deadwood === best.deadwood && candidate.value > best.value)) best = candidate;
    });
    const hand = state.hands[1].slice(); hand.splice(best.index, 1);
    state.discard.push(state.hands[1].splice(best.index, 1)[0]); state.drawn = false;
    if (deadwood(hand) <= 10) roundResult(1, hand);
    else { state.active = 0; state.aiPending = false; }
    render();
  }

  function scheduleAI() {
    if (!state || !state.computer || state.active !== 1 || state.result || state.aiPending) return;
    state.aiPending = true;
    window.setTimeout(() => {
      if (!state || !state.computer || state.active !== 1 || state.result) return;
      aiDraw(); render();
      window.setTimeout(() => { if (state && state.active === 1 && !state.result) aiDiscard(); }, 300);
    }, 350);
  }

  function cardButton(card, enabled, selected, onClick, hidden) {
    const button = document.createElement("button"); button.type = "button";
    button.className = "playing-card" + (isRed(card) ? " red" : "") + (selected ? " selected" : "");
    button.textContent = hidden ? "🂠" : cardText(card); button.disabled = !enabled;
    if (onClick) button.addEventListener("click", onClick); return button;
  }

  function render() {
    resetReveal();
    els.hands.textContent = "";
    state.hands.forEach((hand, player) => {
      const box = document.createElement("div"); box.className = "player-box";
      const heading = document.createElement("h3"); heading.textContent = "Player " + (player + 1) + (state.active === player && !state.result ? " · active" : "") + (player === 1 && state.computer ? " · computer" : ""); box.appendChild(heading);
      const row = document.createElement("div"); row.className = "card-row";
      hand.forEach((card, index) => row.appendChild(cardButton(card, player === state.active && canAct() && state.drawn, state.selected === index, () => selectCard(index), !handVisible(player))));
      box.appendChild(row); els.hands.appendChild(box);
    });
    const top = state.discard[state.discard.length - 1];
    els.status.textContent = state.result ? state.result.text : (state.computer && state.active === 1 ? "Computer is thinking…" : (canAct() ? (state.drawn ? "Select a discard, then end the turn or knock." : "Your turn: draw a card.") : "Pass the device to Player " + (state.active + 1) + "."));
    els.stock.textContent = String(state.stock.length); els.discard.textContent = top ? cardText(top) : "—";
    els.count1.textContent = state.hands[0].length + " cards · " + state.scores[0] + " points";
    els.count2.textContent = (state.computer ? "Computer" : "Player 2") + " · " + state.hands[1].length + " cards · " + state.scores[1] + " points";
    const selectedHand = state.selected === null ? null : state.hands[state.active].slice();
    if (selectedHand) selectedHand.splice(state.selected, 1);
    const canKnock = Boolean(selectedHand && deadwood(selectedHand) <= 10);
    els.draw.disabled = !canAct() || state.drawn || !state.stock.length;
    els.drawDiscard.disabled = !canAct() || state.drawn || !state.discard.length;
    els.discardCard.disabled = !canAct() || !state.drawn || state.selected === null;
    els.knock.disabled = !canAct() || !canKnock;
    els.passPanel.hidden = state.computer || state.result !== null || handVisible(state.active);
    els.passTitle.textContent = "Pass the device to Player " + (state.active + 1) + ".";
    els.showHand.textContent = "Player " + (state.active + 1) + ": show cards";
    els.note.textContent = state.result ? "Start a new deal to test another knock or gin." : "Knock is allowed when the discarded hand has 10 or fewer deadwood points. A zero-deadwood hand scores gin.";
  }

  els.mode.addEventListener("change", () => { newGame(); });
  els.playerCount.addEventListener("change", () => { if (!els.mode.checked) newGame(); });
  els.showHand.addEventListener("click", showActiveHand);
  document.getElementById("new-game").addEventListener("click", newGame);
  els.draw.addEventListener("click", drawFromStock); els.drawDiscard.addEventListener("click", drawFromDiscard);
  els.discardCard.addEventListener("click", () => discard(state.selected, false)); els.knock.addEventListener("click", () => discard(state.selected, true));
  try { const theme = localStorage.getItem("leave-me-alone-games-theme"); document.body.dataset.theme = THEMES.has(theme) ? theme : "colorblind"; } catch { document.body.dataset.theme = "colorblind"; }
  newGame();
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("../../sw.js").catch(() => {}));
})();
