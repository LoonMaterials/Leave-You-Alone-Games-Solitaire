(function () {
  "use strict";

  const SUITS = ["S", "H", "D", "C"];
  const RANKS = ["", "", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const SYMBOLS = { S: "♠", H: "♥", D: "♦", C: "♣" };
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const DIFFICULTY_KEY = "leave-me-alone-gin-rummy-difficulty";
  const DIFFICULTIES = new Set(["easy", "medium", "hard"]);
  const els = {
    status: document.getElementById("status"), hands: document.getElementById("hands"), stock: document.getElementById("stock-count"),
    discard: document.getElementById("discard-top"), count1: document.getElementById("count-1"), count2: document.getElementById("count-2"),
    draw: document.getElementById("draw-card"), drawDiscard: document.getElementById("draw-discard"), discardCard: document.getElementById("discard-card"),
    knock: document.getElementById("knock"), mode: document.getElementById("computer-mode"), difficulty: document.getElementById("difficulty"), playerCount: document.getElementById("player-count"),
    passPanel: document.getElementById("pass-panel"), passTitle: document.getElementById("pass-title"), showHand: document.getElementById("show-hand"), note: document.getElementById("turn-note")
  };
  let state;

  function storedDifficulty() { try { const value = localStorage.getItem(DIFFICULTY_KEY); return DIFFICULTIES.has(value) ? value : "medium"; } catch { return "medium"; } }
  function applyDifficulty() { els.difficulty.value = storedDifficulty(); els.difficulty.disabled = !els.mode.checked; }
  function saveDifficulty() { try { localStorage.setItem(DIFFICULTY_KEY, DIFFICULTIES.has(els.difficulty.value) ? els.difficulty.value : "medium"); } catch {} }

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
  function cardValue(card) { return card.rank === 14 ? 1 : Math.min(10, card.rank); }
  function runRank(card) { return card.rank === 14 ? 1 : card.rank; }
  function isSet(cards) { return cards.length >= 3 && cards.length <= 4 && cards.every((card) => card.rank === cards[0].rank); }
  function isRun(cards) {
    if (cards.length < 3) return false;
    const ordered = cards.slice().sort((a, b) => runRank(a) - runRank(b));
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

  function handPotential(hand) {
    const partition = bestPartition(hand);
    let potential = partition.used * 34 - partition.deadwood;
    for (let first = 0; first < hand.length; first += 1) for (let second = first + 1; second < hand.length; second += 1) {
      const a = hand[first], b = hand[second];
      if (a.rank === b.rank) potential += 8;
      if (a.suit === b.suit) {
        const gap = Math.abs(runRank(a) - runRank(b));
        if (gap === 1) potential += 7;
        else if (gap === 2) potential += 3;
      }
    }
    return potential;
  }

  function discardDanger(card) {
    return state.opponentPickups.reduce((danger, pickup) => danger + (pickup.rank === card.rank ? 8 : pickup.suit === card.suit && Math.abs(runRank(pickup) - runRank(card)) <= 2 ? 5 : 0), 0);
  }

  function discardPlans(hand, forbiddenId) {
    return hand.map((card, index) => {
      if (card.id === forbiddenId) return null;
      const remaining = hand.slice(); remaining.splice(index, 1);
      return { index, card, remaining, deadwood: deadwood(remaining), potential: handPotential(remaining), danger: discardDanger(card) };
    }).filter(Boolean);
  }

  function bestLayoffDeadwood(hand, knockerGroups) {
    const own = bestPartition(hand);
    const used = new Set(own.groups.flat().map((card) => card.id));
    const loose = hand.filter((card) => !used.has(card.id));
    let best = loose.reduce((total, card) => total + cardValue(card), 0);
    function place(index, groups, remaining) {
      if (index === loose.length) { best = Math.min(best, remaining); return; }
      const card = loose[index];
      place(index + 1, groups, remaining);
      groups.forEach((group, groupIndex) => {
        if (!isMeld(group.concat(card))) return;
        const next = groups.map((cards) => cards.slice()); next[groupIndex].push(card);
        place(index + 1, next, remaining - cardValue(card));
      });
    }
    place(0, knockerGroups.map((group) => group.slice()), best);
    return best;
  }

  function cancelHand() {
    state.drawn = false; state.selected = null; state.drawnDiscardId = null; state.aiPending = false;
    state.result = { winner: null, text: "Only two stock cards remain. The hand ends without a score." };
  }

  function newGame() {
    const deck = shuffle(makeDeck());
    const computer = els.mode.checked;
    const playerCount = computer ? 2 : Number(els.playerCount.value);
    const handSize = playerCount === 2 ? 10 : 7;
    state = { stock: deck, discard: [deck.pop()], hands: Array.from({ length: playerCount }, () => []), active: 0, drawn: false, drawnDiscardId: null, selected: null, computer, playerCount, scores: Array(playerCount).fill(0), result: null, aiPending: false, revealedPlayer: 0, lastActive: 0, opponentPickups: [] };
    for (let round = 0; round < handSize; round += 1) for (let player = 0; player < playerCount; player += 1) state.hands[player].push(state.stock.pop());
    els.playerCount.disabled = computer;
    els.difficulty.disabled = !computer;
    render();
    scheduleAI();
  }

  function drawFromStock() {
    if (state.result || !canAct() || state.drawn) return;
    if (state.stock.length <= 2) { cancelHand(); render(); return; }
    state.hands[state.active].push(state.stock.pop()); state.drawn = true; state.drawnDiscardId = null; state.selected = null; render();
  }

  function drawFromDiscard() {
    if (state.result || !canAct() || state.drawn || !state.discard.length) return;
    const card = state.discard.pop(); state.hands[state.active].push(card); state.drawn = true; state.drawnDiscardId = card.id; state.selected = null;
    if (state.computer && state.active === 0) state.opponentPickups = state.opponentPickups.concat(card).slice(-5);
    render();
  }

  function selectCard(index) {
    if (state.result || !canAct() || !state.drawn) return;
    state.selected = state.selected === index ? null : index; render();
  }

  function roundResult(knocker, knockerHand) {
    const knockDeadwood = deadwood(knockerHand);
    const knockerGroups = bestPartition(knockerHand).groups;
    const opponents = state.hands.map((hand, player) => player === knocker ? null : ({ player, deadwood: knockDeadwood === 0 ? deadwood(hand) : bestLayoffDeadwood(hand, knockerGroups) })).filter(Boolean);
    if (knockDeadwood === 0) {
      const points = opponents.reduce((total, opponent) => total + opponent.deadwood, 0) + 25;
      state.scores[knocker] += points; state.result = { winner: knocker, text: "Gin! Player " + (knocker + 1) + " scores " + points + "." }; return;
    }
    const undercutter = opponents.slice().sort((a, b) => a.deadwood - b.deadwood)[0];
    if (undercutter && undercutter.deadwood <= knockDeadwood) {
      const points = knockDeadwood - undercutter.deadwood + 25;
      state.scores[undercutter.player] += points;
      state.result = { winner: undercutter.player, text: "Undercut! Player " + (undercutter.player + 1) + " scores " + points + "." };
      return;
    }
    const points = opponents.reduce((total, opponent) => total + opponent.deadwood - knockDeadwood, 0);
    state.scores[knocker] += points;
    state.result = { winner: knocker, text: "Player " + (knocker + 1) + " wins the knock and scores " + points + "." };
  }

  function discard(index, knock) {
    if (state.result || !canAct() || !state.drawn || index === null || index === undefined) return;
    const player = state.active;
    if (state.hands[player][index]?.id === state.drawnDiscardId) return;
    const hand = state.hands[player].slice(); hand.splice(index, 1);
    if (knock && deadwood(hand) > 10) return;
    state.discard.push(state.hands[player].splice(index, 1)[0]); state.drawn = false; state.drawnDiscardId = null; state.selected = null;
    if (knock) roundResult(player, state.hands[player]);
    else if (state.stock.length <= 2) cancelHand();
    else { state.active = (player + 1) % state.playerCount; scheduleAI(); }
    render();
  }

  function aiDraw() {
    if (state.stock.length <= 2) { cancelHand(); return; }
    const difficulty = storedDifficulty();
    const top = state.discard[state.discard.length - 1];
    const currentDeadwood = deadwood(state.hands[1]);
    const plans = top ? discardPlans(state.hands[1].concat(top), top.id) : [];
    plans.sort((a, b) => a.deadwood - b.deadwood || b.potential - a.potential || a.danger - b.danger);
    const best = plans[0];
    const useDiscard = Boolean(best && (difficulty === "easy" ? currentDeadwood - best.deadwood >= 5 && Math.random() > 0.4 : difficulty === "hard" ? best.potential >= handPotential(state.hands[1]) : best.deadwood < currentDeadwood));
    if (useDiscard) { const card = state.discard.pop(); state.hands[1].push(card); state.drawnDiscardId = card.id; }
    else if (state.stock.length) state.hands[1].push(state.stock.pop());
    state.drawnDiscardId = useDiscard ? state.drawnDiscardId : null;
    state.drawn = true;
  }

  function aiDiscard() {
    const difficulty = storedDifficulty();
    const plans = discardPlans(state.hands[1], state.drawnDiscardId);
    let best;
    if (difficulty === "easy") best = plans[Math.floor(Math.random() * plans.length)];
    else {
      plans.sort((a, b) => a.deadwood - b.deadwood || (difficulty === "hard" ? b.potential - a.potential || a.danger - b.danger : 0) || cardValue(b.card) - cardValue(a.card));
      best = plans[0];
    }
    const hand = state.hands[1].slice(); hand.splice(best.index, 1);
    state.discard.push(state.hands[1].splice(best.index, 1)[0]); state.drawn = false; state.drawnDiscardId = null;
    const handDeadwood = deadwood(hand);
    const shouldKnock = handDeadwood === 0 || (difficulty === "easy" ? handDeadwood <= 4 && Math.random() > 0.25 : difficulty === "medium" ? handDeadwood <= 10 : handDeadwood <= 5 || (state.stock.length <= 10 && handDeadwood <= 8));
    if (shouldKnock) roundResult(1, hand);
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
    const selectedIsForbidden = state.selected !== null && state.hands[state.active][state.selected]?.id === state.drawnDiscardId;
    const selectedHand = state.selected === null || selectedIsForbidden ? null : state.hands[state.active].slice();
    if (selectedHand) selectedHand.splice(state.selected, 1);
    const canKnock = Boolean(selectedHand && deadwood(selectedHand) <= 10);
    els.draw.disabled = !canAct() || state.drawn || !state.stock.length;
    els.drawDiscard.disabled = !canAct() || state.drawn || !state.discard.length;
    els.discardCard.disabled = !canAct() || !state.drawn || state.selected === null || selectedIsForbidden;
    els.knock.disabled = !canAct() || !canKnock;
    els.passPanel.hidden = state.computer || state.result !== null || handVisible(state.active);
    els.passTitle.textContent = "Pass the device to Player " + (state.active + 1) + ".";
    els.showHand.textContent = "Player " + (state.active + 1) + ": show cards";
    els.note.textContent = state.result ? "Start a new deal for another hand." : "Knock is allowed after discarding with 10 or fewer deadwood points. Opponents may lay off after a knock, but not after gin.";
  }

  els.mode.addEventListener("change", () => { applyDifficulty(); newGame(); });
  els.difficulty.addEventListener("change", saveDifficulty);
  els.playerCount.addEventListener("change", () => { if (!els.mode.checked) newGame(); });
  els.showHand.addEventListener("click", showActiveHand);
  document.getElementById("new-game").addEventListener("click", newGame);
  els.draw.addEventListener("click", drawFromStock); els.drawDiscard.addEventListener("click", drawFromDiscard);
  els.discardCard.addEventListener("click", () => discard(state.selected, false)); els.knock.addEventListener("click", () => discard(state.selected, true));
  try { const theme = localStorage.getItem("leave-me-alone-games-theme"); document.body.dataset.theme = THEMES.has(theme) ? theme : "colorblind"; } catch { document.body.dataset.theme = "colorblind"; }
  applyDifficulty();
  newGame();
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("../../sw.js").catch(() => {}));
})();
