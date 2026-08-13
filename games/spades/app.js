(function () {
  "use strict";

  const SUITS = ["S", "H", "D", "C"];
  const RANKS = ["", "", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const SYMBOLS = { S: "♠", H: "♥", D: "♦", C: "♣" };
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const DIFFICULTY_KEY = "leave-me-alone-spades-difficulty";
  const DIFFICULTIES = new Set(["easy", "medium", "hard"]);
  const TEAM_NAMES = ["Team 1 · Players 1 + 3", "Team 2 · Players 2 + 4"];
  const els = { status: document.getElementById("status"), hands: document.getElementById("hands"), trick: document.getElementById("trick"), scorebar: document.getElementById("scorebar"), bids: document.getElementById("bids"), finish: document.getElementById("finish-trick"), submit: document.getElementById("submit-bid"), bid: document.getElementById("bid-value"), phase: document.getElementById("phase-title"), note: document.getElementById("note"), mode: document.getElementById("computer-mode"), difficulty: document.getElementById("difficulty"), playerCount: document.getElementById("player-count"), passPanel: document.getElementById("pass-panel"), passTitle: document.getElementById("pass-title"), showHand: document.getElementById("show-hand") };
  let state;

  function storedDifficulty() { try { const value = localStorage.getItem(DIFFICULTY_KEY); return DIFFICULTIES.has(value) ? value : "medium"; } catch { return "medium"; } }
  function applyDifficulty() { els.difficulty.value = storedDifficulty(); els.difficulty.disabled = !els.mode.checked; }
  function saveDifficulty() { try { localStorage.setItem(DIFFICULTY_KEY, DIFFICULTIES.has(els.difficulty.value) ? els.difficulty.value : "medium"); } catch {} }

  function makeDeck() { const deck = []; SUITS.forEach((suit) => { for (let rank = 2; rank <= 14; rank += 1) deck.push({ id: suit + rank, rank, suit }); }); return deck; }
  function shuffle(cards) { for (let index = cards.length - 1; index > 0; index -= 1) { const swap = Math.floor(Math.random() * (index + 1)); [cards[index], cards[swap]] = [cards[swap], cards[index]]; } return cards; }
  function text(card) { return RANKS[card.rank] + SYMBOLS[card.suit]; }
  function isSpade(card) { return card.suit === "S"; }
  function teamOf(player) { return state.computer ? player % 2 : player; }
  function teamName(team) { return state.computer ? TEAM_NAMES[team] : playerName(team); }
  function playerName(player) { return "Player " + (player + 1); }
  function isHuman(player) { return !state.computer || player === 0; }
  function handVisible(player) { return state.computer ? player === 0 : state.revealedPlayer === player; }
  function canAct(player = state.active) { return !state.complete && state.active === player && isHuman(player) && handVisible(player); }
  function resetReveal() {
    if (state.lastActive !== state.active) { state.lastActive = state.active; state.revealedPlayer = state.computer ? 0 : -1; }
  }
  function showActiveHand() { if (!state.computer) { state.revealedPlayer = state.active; render(); } }

  function bidEstimate(hand, player) {
    const difficulty = storedDifficulty();
    const suits = Object.fromEntries(SUITS.map((suit) => [suit, hand.filter((card) => card.suit === suit)]));
    const nilRisk = hand.reduce((risk, card) => risk + (card.rank === 14 ? 3 : card.rank === 13 ? 2 : card.rank === 12 ? 1 : 0) + (isSpade(card) && card.rank >= 10 ? 2 : 0), 0);
    if (difficulty === "hard" && nilRisk === 0 && suits.S.length <= 3) return 0;
    let estimate = 0;
    SUITS.forEach((suit) => {
      const cards = suits[suit];
      if (cards.some((card) => card.rank === 14)) estimate += 1;
      if (cards.some((card) => card.rank === 13) && cards.length >= 2) estimate += 0.8;
      if (cards.some((card) => card.rank === 12) && cards.length >= 3) estimate += 0.45;
    });
    estimate += suits.S.filter((card) => card.rank >= 11).length * 0.7 + Math.max(0, suits.S.length - 3) * 0.45;
    estimate += SUITS.filter((suit) => suit !== "S" && suits[suit].length === 0).length * Math.min(1.2, suits.S.length * 0.3);
    if (difficulty === "easy") estimate += Math.random() * 3 - 1.5;
    if (difficulty === "hard" && state?.bids && player >= 2) {
      const partnerBid = state.bids[(player + 2) % 4];
      if (partnerBid !== null && partnerBid > 0) estimate = Math.max(1, estimate - Math.max(0, partnerBid - 3) * 0.2);
    }
    return Math.max(1, Math.min(13, Math.round(estimate)));
  }

  function newGame() {
    const deck = shuffle(makeDeck());
    const computer = els.mode.checked;
    const playerCount = computer ? 4 : Number(els.playerCount.value);
    const handSize = Math.floor(52 / playerCount);
    state = { hands: Array.from({ length: playerCount }, () => []), playerCount, active: 0, bids: Array(playerCount).fill(null), trick: [], tricks: Array(playerCount).fill(0), scores: Array(computer ? 2 : playerCount).fill(0), bags: Array(computer ? 2 : playerCount).fill(0), playedCards: [], phase: "bid", spadesBroken: false, complete: false, result: "", computer, finishPending: false, aiPending: false, revealedPlayer: 0, lastActive: 0 };
    for (let round = 0; round < handSize; round += 1) for (let player = 0; player < playerCount; player += 1) state.hands[player].push(deck.pop());
    state.active = 0;
    els.playerCount.disabled = computer;
    els.difficulty.disabled = !computer;
    render(); scheduleAI();
  }

  function submitBid(value) {
    if (state.phase !== "bid" || !isHuman(state.active) || !handVisible(state.active)) return;
    const bid = Math.max(0, Math.min(13, Math.floor(Number(value))));
    if (!Number.isFinite(bid)) return;
    state.bids[state.active] = bid;
    state.active += 1;
    if (state.active === state.playerCount) { state.phase = "play"; state.active = 0; }
    els.bid.value = "0"; render(); scheduleAI();
  }

  function legalCards(player) {
    const hand = state.hands[player];
    if (!state.trick.length) {
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
    if (state.phase !== "play" || state.complete || state.active !== player || state.trick.length >= state.playerCount || (isHuman(player) ? !handVisible(player) : !state.computer)) return;
    const card = state.hands[player][index];
    if (!card || !legalCards(player).some((candidate) => candidate.id === card.id)) return;
    state.hands[player].splice(index, 1); state.trick.push({ player, card }); if (isSpade(card)) state.spadesBroken = true;
    if (state.trick.length < state.playerCount) state.active = (player + 1) % state.playerCount;
    render(); if (state.trick.length === state.playerCount) scheduleFinish(); else scheduleAI();
  }

  function teamNeed(player) {
    let bid = 0, tricks = 0;
    state.bids.forEach((value, bidder) => { if (teamOf(bidder) === teamOf(player) && value > 0) bid += value; });
    state.tricks.forEach((value, taker) => { if (teamOf(taker) === teamOf(player)) tricks += value; });
    return Math.max(0, bid - tricks);
  }

  function aiChoice(player) {
    const legal = legalCards(player).slice();
    const difficulty = storedDifficulty();
    if (difficulty === "easy") return legal[Math.floor(Math.random() * legal.length)];
    const low = legal.slice().sort((a, b) => a.rank - b.rank);
    const need = teamNeed(player);
    if (!state.trick.length) {
      if (state.bids[player] === 0) return low[0];
      if (need > 0) {
        const aces = legal.filter((card) => card.rank === 14).sort((a, b) => (isSpade(b) ? 1 : 0) - (isSpade(a) ? 1 : 0));
        if (aces.length) return aces[0];
        if (difficulty === "hard" && state.spadesBroken) return low[low.length - 1];
      }
      return low[0];
    }
    const winning = legal.filter((card) => trickWinner(state.trick.concat([{ player, card }])).player === player).sort((a, b) => a.rank - b.rank);
    const losing = legal.filter((card) => !winning.some((winner) => winner.id === card.id)).sort((a, b) => b.rank - a.rank);
    if (state.bids[player] === 0) return losing[0] || winning[0];
    const currentWinner = trickWinner(state.trick);
    const partner = state.computer && state.playerCount === 4 ? (player + 2) % 4 : -1;
    if (difficulty === "hard" && currentWinner.player === partner) return losing[0] || winning[0];
    if (need > 0 && winning.length) return winning[0];
    if (losing.length) return losing[0];
    return winning[0] || low[0];
  }

  function aiPlay(player) {
    const choice = aiChoice(player);
    playCard(player, state.hands[player].findIndex((card) => card.id === choice.id));
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
    state.bids[player] = bidEstimate(state.hands[player], player); state.active += 1;
    if (state.active === state.playerCount) { state.phase = "play"; state.active = 0; }
    render(); scheduleAI();
  }

  function scheduleFinish() {
    if (state.finishPending) return; state.finishPending = true; window.setTimeout(() => { state.finishPending = false; finishTrick(); }, 550);
  }

  function finishTrick() {
    if (state.phase !== "play" || state.trick.length !== state.playerCount || state.complete) return;
    const winner = trickWinner(state.trick); state.tricks[winner.player] += 1; state.playedCards.push(...state.trick.map((entry) => entry.card)); state.trick = [];
    if (state.hands.every((hand) => hand.length === 0)) finishDeal(); else { state.active = winner.player; render(); scheduleAI(); }
  }

  function finishDeal() {
    const teamTricks = Array(state.scores.length).fill(0); const teamBids = Array(state.scores.length).fill(0); const nilChanges = Array(state.scores.length).fill(0);
    state.tricks.forEach((tricks, player) => { teamTricks[teamOf(player)] += tricks; });
    state.bids.forEach((bid, player) => {
      if (bid === 0) nilChanges[teamOf(player)] += state.tricks[player] === 0 ? 100 : -100;
      else teamBids[teamOf(player)] += bid;
    });
    state.scores = state.scores.map((score, team) => {
      const made = teamTricks[team] >= teamBids[team];
      const overtricks = made ? teamTricks[team] - teamBids[team] : 0;
      let next = score + nilChanges[team] + (made ? teamBids[team] * 10 + overtricks : -teamBids[team] * 10);
      state.bags[team] += overtricks;
      while (state.bags[team] >= 10) { state.bags[team] -= 10; next -= 100; }
      return next;
    });
    state.result = state.scores.map((score, team) => teamName(team) + ": bid " + teamBids[team] + ", took " + teamTricks[team] + ", " + state.bags[team] + " bags, score " + score + (nilChanges[team] ? ", nil " + (nilChanges[team] > 0 ? "+" : "") + nilChanges[team] : "")).join(" · "); state.complete = true; render();
  }

  function cardButton(card, enabled, onClick, hidden) { const button = document.createElement("button"); button.type = "button"; button.className = "playing-card" + (card.suit === "H" || card.suit === "D" ? " red" : ""); button.textContent = hidden ? "🂠" : text(card); button.disabled = !enabled; if (onClick) button.addEventListener("click", onClick); return button; }

  function render() {
    resetReveal();
    els.hands.textContent = "";
    state.hands.forEach((hand, player) => { const box = document.createElement("div"); box.className = "player-box"; const heading = document.createElement("h3"); heading.textContent = playerName(player) + " · " + hand.length + " cards" + (state.active === player && !state.complete ? " · active" : "") + (player > 0 && state.computer ? " · computer" : ""); box.appendChild(heading); const row = document.createElement("div"); row.className = "card-row"; const legal = state.phase === "play" && state.active === player ? new Set(legalCards(player).map((card) => card.id)) : new Set(); hand.forEach((card, index) => row.appendChild(cardButton(card, canAct(player) && state.phase === "play" && legal.has(card.id), () => playCard(player, index), !handVisible(player)))); box.appendChild(row); els.hands.appendChild(box); });
    els.trick.textContent = ""; state.trick.forEach((entry) => { const item = document.createElement("div"); item.className = "trick-card"; const owner = document.createElement("strong"); owner.textContent = playerName(entry.player); item.appendChild(owner); item.appendChild(cardButton(entry.card, false, null, false)); els.trick.appendChild(item); });
    els.scorebar.textContent = ""; state.scores.forEach((score, team) => { const item = document.createElement("div"); item.innerHTML = "<span>" + teamName(team) + "</span><strong>" + score + " points</strong><small>" + state.bags[team] + " bags" + (state.phase === "bid" ? " · Bidding" : "" ) + "</small>"; els.scorebar.appendChild(item); });
    els.bids.textContent = ""; state.bids.forEach((bid, player) => { const item = document.createElement("div"); item.textContent = playerName(player) + ": " + (bid === null ? "—" : bid); els.bids.appendChild(item); });
    els.phase.textContent = state.phase === "bid" ? "Bidding" : "Trick play"; els.status.textContent = state.complete ? "Deal complete." : state.phase === "bid" ? (state.computer && state.active > 0 ? "Computer is bidding…" : (canAct() ? playerName(state.active) + " to bid." : "Pass the device to Player " + (state.active + 1) + ".")) : (canAct() ? playerName(state.active) + " to play." : "Pass the device to Player " + (state.active + 1) + ".");
    els.submit.disabled = state.phase !== "bid" || !canAct(); els.bid.disabled = els.submit.disabled; els.finish.disabled = state.phase !== "play" || state.trick.length !== state.playerCount || state.complete;
    els.passPanel.hidden = state.computer || state.complete || handVisible(state.active);
    els.passTitle.textContent = "Pass the device to Player " + (state.active + 1) + ".";
    els.showHand.textContent = "Player " + (state.active + 1) + ": show cards";
    els.note.textContent = state.complete ? state.result : state.phase === "bid" ? "Bid expected tricks; a zero bid is nil. Computer partners account for suit length, voids, prior bids, and team needs." : (state.spadesBroken ? "Spades are broken. Follow suit whenever possible; the highest spade wins." : "Spades have not been broken. Lead another suit when possible; follow suit whenever possible.");
  }

  els.mode.addEventListener("change", () => { applyDifficulty(); newGame(); });
  els.difficulty.addEventListener("change", saveDifficulty);
  els.playerCount.addEventListener("change", () => { if (!els.mode.checked) newGame(); });
  els.showHand.addEventListener("click", showActiveHand);
  document.getElementById("new-game").addEventListener("click", newGame); els.submit.addEventListener("click", () => submitBid(els.bid.value)); els.finish.addEventListener("click", finishTrick);
  try { const theme = localStorage.getItem("leave-me-alone-games-theme"); document.body.dataset.theme = THEMES.has(theme) ? theme : "colorblind"; } catch { document.body.dataset.theme = "colorblind"; }
  applyDifficulty();
  newGame();
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("../../sw.js").catch(() => {}));
})();
