(function () {
  "use strict";

  const SUITS = ["S", "H", "D", "C"];
  const RANKS = ["", "", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const SYMBOLS = { S: "♠", H: "♥", D: "♦", C: "♣" };
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const TEAM_NAMES = ["Team 1 · Players 1 + 3", "Team 2 · Players 2 + 4"];
  const els = { status: document.getElementById("status"), hands: document.getElementById("hands"), trick: document.getElementById("trick"), scorebar: document.getElementById("scorebar"), bids: document.getElementById("bids"), finish: document.getElementById("finish-trick"), submit: document.getElementById("submit-bid"), bid: document.getElementById("bid-value"), phase: document.getElementById("phase-title"), note: document.getElementById("note"), mode: document.getElementById("computer-mode") };
  let state;

  function makeDeck() { const deck = []; SUITS.forEach((suit) => { for (let rank = 2; rank <= 14; rank += 1) deck.push({ id: suit + rank, rank, suit }); }); return deck; }
  function shuffle(cards) { for (let index = cards.length - 1; index > 0; index -= 1) { const swap = Math.floor(Math.random() * (index + 1)); [cards[index], cards[swap]] = [cards[swap], cards[index]]; } return cards; }
  function text(card) { return RANKS[card.rank] + SYMBOLS[card.suit]; }
  function isSpade(card) { return card.suit === "S"; }
  function teamOf(player) { return player % 2; }
  function playerName(player) { return "Player " + (player + 1); }
  function isHuman(player) { return !state.computer || player === 0; }

  function bidEstimate(hand) {
    return Math.min(13, hand.reduce((total, card) => total + (isSpade(card) && card.rank >= 11 ? 1 : 0) + (card.rank === 14 ? 1 : 0) + (card.rank === 13 && card.suit !== "S" ? 0.5 : 0), 0) | 0);
  }

  function newGame() {
    const deck = shuffle(makeDeck());
    state = { hands: [[], [], [], []], active: 0, bids: [null, null, null, null], trick: [], tricks: [0, 0, 0, 0], scores: [0, 0], phase: "bid", spadesBroken: false, complete: false, result: "", computer: els.mode.checked, finishPending: false, aiPending: false };
    for (let round = 0; round < 13; round += 1) for (let player = 0; player < 4; player += 1) state.hands[player].push(deck.pop());
    render(); scheduleAI();
  }

  function submitBid(value) {
    if (state.phase !== "bid" || !isHuman(state.active)) return;
    const bid = Math.max(0, Math.min(13, Math.floor(Number(value))));
    if (!Number.isFinite(bid)) return;
    state.bids[state.active] = bid;
    state.active += 1;
    if (state.active === 4) { state.phase = "play"; state.active = state.hands.findIndex((hand) => hand.some((card) => card.id === "C2")); }
    els.bid.value = "0"; render(); scheduleAI();
  }

  function legalCards(player) {
    const hand = state.hands[player];
    if (!state.trick.length) {
      if (state.tricks.every((count) => count === 0)) {
        const twoClubs = hand.filter((card) => card.id === "C2");
        if (twoClubs.length) return twoClubs;
      }
      const nonSpades = hand.filter((card) => !isSpade(card));
      return !state.spadesBroken && nonSpades.length ? nonSpades : hand.slice();
    }
    const ledSuit = state.trick[0].card.suit;
    const suited = hand.filter((card) => card.suit === ledSuit);
    return suited.length ? suited : hand.slice();
  }

  function trickWinner(trick) {
    const spades = trick.filter((entry) => isSpade(entry.card));
    if (spades.length) return spades.reduce((best, entry) => entry.card.rank > best.card.rank ? entry : best);
    const ledSuit = trick[0].card.suit;
    return trick.filter((entry) => entry.card.suit === ledSuit).reduce((best, entry) => entry.card.rank > best.card.rank ? entry : best);
  }

  function playCard(player, index) {
    if (state.phase !== "play" || state.complete || state.active !== player || state.trick.length >= 4 || !isHuman(player)) return;
    const card = state.hands[player][index];
    if (!card || !legalCards(player).some((candidate) => candidate.id === card.id)) return;
    state.hands[player].splice(index, 1); state.trick.push({ player, card }); if (isSpade(card)) state.spadesBroken = true;
    if (state.trick.length < 4) state.active = (player + 1) % 4;
    render(); if (state.trick.length === 4) scheduleFinish(); else scheduleAI();
  }

  function aiPlay(player) {
    const legal = legalCards(player);
    const sorted = legal.slice().sort((a, b) => a.rank - b.rank);
    let choice = sorted[0];
    if (state.trick.length && state.trick.some((entry) => isSpade(entry.card))) choice = sorted[0];
    else if (state.trick.length && state.trick.some((entry) => entry.card.rank === 14)) choice = sorted[sorted.length - 1];
    state.hands[player].splice(state.hands[player].findIndex((card) => card.id === choice.id), 1); state.trick.push({ player, card: choice }); if (isSpade(choice)) state.spadesBroken = true;
    if (state.trick.length < 4) state.active = (player + 1) % 4;
    render(); if (state.trick.length === 4) scheduleFinish(); else scheduleAI();
  }

  function scheduleAI() {
    if (!state || !state.computer || state.complete || state.aiPending || isHuman(state.active)) return;
    state.aiPending = true;
    window.setTimeout(() => {
      state.aiPending = false;
      if (!state || !state.computer || state.complete || isHuman(state.active)) return;
      if (state.phase === "bid") submitAIBid(state.active); else aiPlay(state.active);
    }, 300);
  }

  function submitAIBid(player) {
    state.bids[player] = bidEstimate(state.hands[player]); state.active += 1;
    if (state.active === 4) { state.phase = "play"; state.active = state.hands.findIndex((hand) => hand.some((card) => card.id === "C2")); }
    render(); scheduleAI();
  }

  function scheduleFinish() {
    if (state.finishPending) return; state.finishPending = true; window.setTimeout(() => { state.finishPending = false; finishTrick(); }, 550);
  }

  function finishTrick() {
    if (state.phase !== "play" || state.trick.length !== 4 || state.complete) return;
    const winner = trickWinner(state.trick); state.tricks[winner.player] += 1; state.trick = [];
    if (state.hands.every((hand) => hand.length === 0)) finishDeal(); else { state.active = winner.player; render(); scheduleAI(); }
  }

  function finishDeal() {
    const teamTricks = [state.tricks[0] + state.tricks[2], state.tricks[1] + state.tricks[3]];
    const teamBids = [state.bids[0] + state.bids[2], state.bids[1] + state.bids[3]];
    state.scores = state.scores.map((score, team) => score + (teamTricks[team] >= teamBids[team] ? teamBids[team] * 10 + teamTricks[team] - teamBids[team] : -teamBids[team] * 10));
    state.result = TEAM_NAMES.map((name, team) => name + ": bid " + teamBids[team] + ", took " + teamTricks[team] + ", score " + state.scores[team]).join(" · "); state.complete = true; render();
  }

  function cardButton(card, enabled, onClick, hidden) { const button = document.createElement("button"); button.type = "button"; button.className = "playing-card" + (card.suit === "H" || card.suit === "D" ? " red" : ""); button.textContent = hidden ? "🂠" : text(card); button.disabled = !enabled; if (onClick) button.addEventListener("click", onClick); return button; }

  function render() {
    els.hands.textContent = "";
    state.hands.forEach((hand, player) => { const box = document.createElement("div"); box.className = "player-box"; const heading = document.createElement("h3"); heading.textContent = playerName(player) + " · " + hand.length + " cards" + (state.active === player && !state.complete ? " · active" : "") + (player > 0 && state.computer ? " · computer" : ""); box.appendChild(heading); const row = document.createElement("div"); row.className = "card-row"; const legal = state.phase === "play" && state.active === player ? new Set(legalCards(player).map((card) => card.id)) : new Set(); hand.forEach((card, index) => row.appendChild(cardButton(card, state.phase === "play" && state.active === player && !state.complete && isHuman(player) && legal.has(card.id), () => playCard(player, index), player > 0 && state.computer))); box.appendChild(row); els.hands.appendChild(box); });
    els.trick.textContent = ""; state.trick.forEach((entry) => { const item = document.createElement("div"); item.className = "trick-card"; const owner = document.createElement("strong"); owner.textContent = playerName(entry.player); item.appendChild(owner); item.appendChild(cardButton(entry.card, false, null, false)); els.trick.appendChild(item); });
    els.scorebar.textContent = ""; state.scores.forEach((score, team) => { const item = document.createElement("div"); item.innerHTML = "<span>" + TEAM_NAMES[team] + "</span><strong>" + score + " points</strong><small>" + (state.phase === "bid" ? "Bidding" : "" ) + "</small>"; els.scorebar.appendChild(item); });
    els.bids.textContent = ""; state.bids.forEach((bid, player) => { const item = document.createElement("div"); item.textContent = playerName(player) + ": " + (bid === null ? "—" : bid); els.bids.appendChild(item); });
    els.phase.textContent = state.phase === "bid" ? "Bidding" : "Trick play"; els.status.textContent = state.complete ? "Deal complete." : state.phase === "bid" ? playerName(state.active) + " to bid." : playerName(state.active) + " to play.";
    els.submit.disabled = state.phase !== "bid" || !isHuman(state.active) || state.complete; els.bid.disabled = els.submit.disabled; els.finish.disabled = state.phase !== "play" || state.trick.length !== 4 || state.complete;
    els.note.textContent = state.complete ? state.result : state.phase === "bid" ? "The computer estimates bids from high cards and spades. Submit your bid, then test the trick rules." : (state.spadesBroken ? "Spades are broken. Follow suit whenever possible; the highest spade wins." : "Spades have not been broken. Lead another suit when possible; follow suit whenever possible.");
  }

  els.mode.addEventListener("change", () => { if (state) { state.computer = els.mode.checked; if (!state.computer) state.aiPending = false; render(); scheduleAI(); } });
  document.getElementById("new-game").addEventListener("click", newGame); els.submit.addEventListener("click", () => submitBid(els.bid.value)); els.finish.addEventListener("click", finishTrick);
  try { const theme = localStorage.getItem("leave-me-alone-games-theme"); document.body.dataset.theme = THEMES.has(theme) ? theme : "colorblind"; } catch { document.body.dataset.theme = "colorblind"; }
  newGame();
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("../../sw.js").catch(() => {}));
})();
