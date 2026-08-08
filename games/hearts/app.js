(function () {
  "use strict";

  const SUITS = ["S", "H", "D", "C"];
  const RANKS = ["", "", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const SYMBOLS = { S: "♠", H: "♥", D: "♦", C: "♣" };
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const els = { status: document.getElementById("status"), hands: document.getElementById("hands"), trick: document.getElementById("trick"), scorebar: document.getElementById("scorebar"), finish: document.getElementById("finish-trick"), note: document.getElementById("note"), mode: document.getElementById("computer-mode") };
  let state;

  function makeDeck() {
    const deck = [];
    SUITS.forEach((suit) => { for (let rank = 2; rank <= 14; rank += 1) deck.push({ id: suit + rank, rank, suit }); });
    return deck;
  }

  function shuffle(cards) {
    for (let index = cards.length - 1; index > 0; index -= 1) { const swap = Math.floor(Math.random() * (index + 1)); [cards[index], cards[swap]] = [cards[swap], cards[index]]; }
    return cards;
  }

  function text(card) { return RANKS[card.rank] + SYMBOLS[card.suit]; }
  function isHeart(card) { return card.suit === "H"; }
  function points(card) { return isHeart(card) ? 1 : (card.id === "S12" ? 13 : 0); }
  function playerName(player) { return "Player " + (player + 1); }

  function newGame() {
    const deck = shuffle(makeDeck());
    state = { hands: [[], [], [], []], active: 0, trick: [], trickCount: 0, scores: [0, 0, 0, 0], heartsBroken: false, complete: false, computer: els.mode.checked, finishPending: false, aiPending: false };
    for (let round = 0; round < 13; round += 1) for (let player = 0; player < 4; player += 1) state.hands[player].push(deck.pop());
    state.active = state.hands.findIndex((hand) => hand.some((card) => card.id === "C2"));
    render();
    scheduleAI();
  }

  function legalCards(player) {
    const hand = state.hands[player];
    if (!state.trick.length) {
      let legal = state.heartsBroken ? hand.slice() : hand.filter((card) => !isHeart(card));
      if (state.trickCount === 0) legal = legal.filter((card) => card.id === "C2");
      if (legal.length) return legal;
      return hand.slice();
    }
    const ledSuit = state.trick[0].card.suit;
    const suited = hand.filter((card) => card.suit === ledSuit);
    return suited.length ? suited : hand.slice();
  }

  function trickWinner(trick) {
    const ledSuit = trick[0].card.suit;
    return trick.filter((entry) => entry.card.suit === ledSuit).reduce((best, entry) => entry.card.rank > best.card.rank ? entry : best);
  }

  function playCard(player, index) {
    if (state.complete || state.active !== player || state.trick.length >= 4) return;
    const card = state.hands[player][index];
    if (!card || !legalCards(player).some((candidate) => candidate.id === card.id)) return;
    state.hands[player].splice(index, 1);
    state.trick.push({ player, card });
    if (isHeart(card)) state.heartsBroken = true;
    if (state.trick.length < 4) state.active = (player + 1) % 4;
    render();
    if (state.trick.length === 4) scheduleFinish(); else scheduleAI();
  }

  function aiCard(player) {
    const legal = legalCards(player);
    if (state.trick.length && !state.trick.some((entry) => points(entry.card))) {
      const queen = legal.find((card) => card.id === "S12");
      if (queen && !state.trick.some((entry) => entry.card.suit === "S" && entry.card.rank > 12)) return queen;
    }
    if (!state.trick.length) return legal.slice().sort((a, b) => a.rank - b.rank)[0];
    if (state.trick.some((entry) => points(entry.card))) return legal.slice().sort((a, b) => points(b) - points(a) || b.rank - a.rank)[0];
    return legal.slice().sort((a, b) => a.rank - b.rank)[0];
  }

  function scheduleAI() {
    if (!state || !state.computer || state.complete || state.active === 0 || state.trick.length >= 4 || state.aiPending) return;
    state.aiPending = true;
    window.setTimeout(() => {
      state.aiPending = false;
      if (!state || !state.computer || state.complete || state.active === 0 || state.trick.length >= 4) return;
      const card = aiCard(state.active);
      playCard(state.active, state.hands[state.active].findIndex((candidate) => candidate.id === card.id));
    }, 300);
  }

  function scheduleFinish() {
    if (state.finishPending) return;
    state.finishPending = true;
    window.setTimeout(() => { state.finishPending = false; finishTrick(); }, 550);
  }

  function finishTrick() {
    if (state.trick.length !== 4 || state.complete) return;
    const winner = trickWinner(state.trick);
    const trickPoints = state.trick.reduce((total, entry) => total + points(entry.card), 0);
    state.scores[winner.player] += trickPoints;
    state.trick = [];
    state.trickCount += 1;
    if (state.hands.every((hand) => hand.length === 0)) {
      if (state.scores[winner.player] === 26) { state.scores = state.scores.map((score, player) => player === winner.player ? 0 : score + 26); }
      state.complete = true;
    } else { state.active = winner.player; }
    render();
    scheduleAI();
  }

  function cardButton(card, enabled, onClick, hidden) {
    const button = document.createElement("button"); button.type = "button"; button.className = "playing-card" + (isHeart(card) || card.id === "S12" ? " red" : ""); button.textContent = hidden ? "🂠" : text(card); button.disabled = !enabled; if (onClick) button.addEventListener("click", onClick); return button;
  }

  function render() {
    els.hands.textContent = "";
    state.hands.forEach((hand, player) => {
      const box = document.createElement("div"); box.className = "player-box";
      const heading = document.createElement("h3"); heading.textContent = playerName(player) + " · " + hand.length + " cards" + (state.active === player && !state.complete ? " · active" : "") + (player > 0 && state.computer ? " · computer" : ""); box.appendChild(heading);
      const row = document.createElement("div"); row.className = "card-row";
      hand.forEach((card, index) => row.appendChild(cardButton(card, player === 0 && state.active === 0 && !state.complete && state.trick.length < 4 && legalCards(0).some((candidate) => candidate.id === card.id), () => playCard(player, index), player > 0 && state.computer)));
      box.appendChild(row); els.hands.appendChild(box);
    });
    els.trick.textContent = "";
    state.trick.forEach((entry) => { const item = document.createElement("div"); item.className = "trick-card"; const owner = document.createElement("strong"); owner.textContent = playerName(entry.player); item.appendChild(owner); item.appendChild(cardButton(entry.card, false, null, false)); els.trick.appendChild(item); });
    els.scorebar.textContent = "";
    state.scores.forEach((score, player) => { const item = document.createElement("div"); item.innerHTML = "<span>" + playerName(player) + "</span><strong>" + score + " points</strong>"; els.scorebar.appendChild(item); });
    els.status.textContent = state.complete ? "Deal complete." : playerName(state.active) + " to play.";
    els.finish.disabled = state.trick.length !== 4 || state.complete;
    els.note.textContent = state.complete ? "Start a new deal to test another hand." : (state.heartsBroken ? "Hearts are broken. Follow suit whenever possible." : "Hearts are not broken yet. The 2♣ leads the first trick; point cards are restricted on that trick.");
  }

  els.mode.addEventListener("change", () => { if (state) { state.computer = els.mode.checked; if (!state.computer) state.aiPending = false; render(); scheduleAI(); } });
  document.getElementById("new-game").addEventListener("click", newGame); els.finish.addEventListener("click", finishTrick);
  try { const theme = localStorage.getItem("leave-me-alone-games-theme"); document.body.dataset.theme = THEMES.has(theme) ? theme : "colorblind"; } catch { document.body.dataset.theme = "colorblind"; }
  newGame();
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("../../sw.js").catch(() => {}));
})();
