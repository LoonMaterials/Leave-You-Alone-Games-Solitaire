(function () {
  "use strict";

  const SUITS = ["S", "H", "D", "C"];
  const RANKS = ["", "", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const SYMBOLS = { S: "♠", H: "♥", D: "♦", C: "♣" };
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const els = { status: document.getElementById("status"), hands: document.getElementById("hands"), crib: document.getElementById("crib"), note: document.getElementById("note"), scorebar: document.querySelector(".scorebar"), score1: document.getElementById("score-1"), score2: document.getElementById("score-2"), cribCount: document.getElementById("crib-count"), pegCount: document.getElementById("peg-count"), confirm: document.getElementById("confirm-selection"), nextPhase: document.getElementById("next-phase"), go: document.getElementById("go-button"), mode: document.getElementById("computer-mode"), playerCount: document.getElementById("player-count"), passPanel: document.getElementById("pass-panel"), passTitle: document.getElementById("pass-title"), showHand: document.getElementById("show-hand") };
  let state;

  function handVisible(player) { return state.computer ? player === 0 : state.revealedPlayer === player; }
  function turnUnlocked(player = state.active) { return state.phase !== "complete" && state.active === player && (isHuman(player) ? handVisible(player) : state.computer); }
  function canAct(player = state.active) { return turnUnlocked(player) && isHuman(player); }
  function resetReveal() {
    if (state.lastActive !== state.active) { state.lastActive = state.active; state.revealedPlayer = state.computer ? 0 : -1; }
  }
  function showActiveHand() { if (!state.computer) { state.revealedPlayer = state.active; render(); } }

  function makeDeck() { const deck = []; SUITS.forEach((suit) => { for (let rank = 2; rank <= 14; rank += 1) deck.push({ id: suit + rank, rank, suit }); }); return deck; }
  function shuffle(cards) { for (let index = cards.length - 1; index > 0; index -= 1) { const swap = Math.floor(Math.random() * (index + 1)); [cards[index], cards[swap]] = [cards[swap], cards[index]]; } return cards; }
  function text(card) { return RANKS[card.rank] + SYMBOLS[card.suit]; }
  function value(card) { return Math.min(10, card.rank === 14 ? 1 : card.rank); }
  function isHuman(player) { return !state.computer || player === 0; }

  function scorePeg(sequence) {
    if (!sequence.length) return 0;
    const total = sequence.reduce((sum, card) => sum + value(card), 0);
    let points = total === 15 ? 2 : total === 31 ? 2 : 0;
    let same = 1;
    for (let index = sequence.length - 2; index >= 0 && sequence[index].rank === sequence[sequence.length - 1].rank; index -= 1) same += 1;
    if (same >= 2) points += same === 2 ? 2 : same === 3 ? 6 : 12;
    for (let length = Math.min(sequence.length, 7); length >= 3; length -= 1) {
      const tail = sequence.slice(-length).map((card) => card.rank).sort((a, b) => a - b);
      const unique = [...new Set(tail)];
      if (unique.length === length && unique.every((rank, index) => index === 0 || rank === unique[index - 1] + 1)) { points += length; break; }
    }
    return points;
  }

  function scoreHand(hand, starter, crib) {
    const cards = hand.concat(starter ? [starter] : []);
    let points = 0;
    for (let mask = 1; mask < (1 << cards.length); mask += 1) {
      const chosen = cards.filter((_, index) => mask & (1 << index));
      if (chosen.reduce((sum, card) => sum + value(card), 0) === 15) points += 2;
    }
    for (let rank = 2; rank <= 14; rank += 1) { const count = cards.filter((card) => card.rank === rank).length; if (count >= 2) points += count === 2 ? 2 : count === 3 ? 6 : 12; }
    for (let length = 5; length >= 3; length -= 1) {
      let runPoints = 0;
      for (let mask = 1; mask < (1 << cards.length); mask += 1) {
        const chosen = cards.filter((_, index) => mask & (1 << index)); if (chosen.length !== length) continue;
        const ranks = [...new Set(chosen.map((card) => card.rank))].sort((a, b) => a - b);
        if (ranks.length === length && ranks.every((rank, index) => index === 0 || rank === ranks[index - 1] + 1)) runPoints = Math.max(runPoints, length);
      }
      if (runPoints) { points += runPoints; break; }
    }
    const suits = cards.map((card) => card.suit);
    const handSuits = hand.map((card) => card.suit);
    if (!crib && handSuits.every((suit) => suit === handSuits[0])) points += starter && starter.suit === handSuits[0] ? 5 : 4;
    if (crib && suits.every((suit) => suit === suits[0])) points += 5;
    if (starter && hand.some((card) => card.rank === 11 && card.suit === starter.suit)) points += 1;
    return points;
  }

  function newGame() {
    const deck = shuffle(makeDeck());
    const computer = els.mode.checked;
    const playerCount = computer ? 2 : Number(els.playerCount.value);
    state = { deck, hands: Array.from({ length: playerCount }, () => []), playerCount, crib: [], cribTarget: playerCount * 2, starter: null, selected: [], active: 0, phase: "discard", dealer: playerCount - 1, scores: Array(playerCount).fill(0), pegCount: 0, pegSequence: [], passed: Array(playerCount).fill(false), lastPegPlayer: null, computer, aiPending: false, result: "", revealedPlayer: 0, lastActive: 0 };
    for (let index = 0; index < 6; index += 1) for (let player = 0; player < playerCount; player += 1) state.hands[player].push(state.deck.pop());
    els.playerCount.disabled = computer;
    render(); scheduleAI();
  }

  function toggleCard(index) {
    if (state.phase !== "discard" || !canAct()) return;
    if (state.selected.includes(index)) state.selected = state.selected.filter((item) => item !== index);
    else if (state.selected.length < 2) state.selected.push(index);
    render();
  }

  function chooseComputerCrib() {
    const hand = state.hands[1];
    let best = [0, 1]; let bestValue = -Infinity;
    for (let first = 0; first < hand.length; first += 1) for (let second = first + 1; second < hand.length; second += 1) {
      const a = hand[first], b = hand[second];
      const synergy = (a.rank === b.rank ? 8 : 0) + (a.suit === b.suit ? 2 : 0) + (Math.abs(a.rank - b.rank) === 1 ? 3 : 0) + (value(a) + value(b)) / 10;
      const score = state.dealer === 1 ? synergy : -synergy;
      if (score > bestValue) { bestValue = score; best = [first, second]; }
    }
    state.selected = best; confirmSelection();
  }

  function confirmSelection() {
    if (state.phase !== "discard" || state.selected.length !== 2 || !turnUnlocked()) return;
    if (!canAct()) return;
    const moved = state.hands[state.active].filter((_, index) => state.selected.includes(index));
    state.hands[state.active] = state.hands[state.active].filter((_, index) => !state.selected.includes(index));
    state.crib.push(...moved); state.selected = [];
    if (state.crib.length === state.cribTarget) finishDiscard();
    else { state.active = (state.active + 1) % state.playerCount; if (state.computer) scheduleAI(); }
    render();
  }

  function finishDiscard() {
    if (state.crib.length !== state.cribTarget) return;
    state.starter = state.deck.pop(); state.phase = "ready"; state.active = (state.dealer + 1) % state.playerCount; state.pegCount = 0; state.pegSequence = []; state.passed = Array(state.playerCount).fill(false);
  }

  function beginPegging() { if (state.phase !== "ready") return; state.phase = "peg"; state.active = (state.dealer + 1) % state.playerCount; state.pegCount = 0; state.pegSequence = []; state.passed = Array(state.playerCount).fill(false); render(); scheduleAI(); }

  function legalPegCards(player) { return state.hands[player].filter((card) => value(card) + state.pegCount <= 31); }

  function finishRound() {
    state.hands.forEach((hand, player) => { state.scores[player] += scoreHand(hand, state.starter, false); });
    state.scores[state.dealer] += scoreHand(state.crib, state.starter, true);
    state.phase = "complete"; state.result = "Round complete. " + state.scores.map((score, player) => "Player " + (player + 1) + " " + score).join(", ") + ".";
  }

  function playPeg(index) {
    if (state.phase !== "peg" || state.active < 0 || !turnUnlocked()) return;
    const card = state.hands[state.active][index]; if (!card || !legalPegCards(state.active).some((candidate) => candidate.id === card.id)) return;
    state.hands[state.active].splice(index, 1); state.pegSequence.push(card); state.pegCount += value(card); state.scores[state.active] += scorePeg(state.pegSequence); state.lastPegPlayer = state.active; state.passed = Array(state.playerCount).fill(false);
    if (state.hands.every((hand) => !hand.length)) { finishRound(); render(); return; }
    if (state.pegCount === 31) { state.pegCount = 0; state.pegSequence = []; state.active = state.lastPegPlayer; }
    else state.active = (state.active + 1) % state.playerCount;
    render(); scheduleAI();
  }

  function go() {
    if (state.phase !== "peg" || state.active < 0 || !turnUnlocked() || legalPegCards(state.active).length) return;
    state.passed[state.active] = true;
    const next = Array.from({ length: state.playerCount }, (_, offset) => (state.active + offset + 1) % state.playerCount).find((player) => !state.passed[player]);
    if (next === undefined) { if (state.pegCount > 0 && state.lastPegPlayer !== null) state.scores[state.lastPegPlayer] += 1; state.pegCount = 0; state.pegSequence = []; state.passed = Array(state.playerCount).fill(false); state.active = state.lastPegPlayer === null ? 0 : state.lastPegPlayer; }
    else state.active = next;
    render(); scheduleAI();
  }

  function aiPeg() {
    const legal = legalPegCards(1); if (!legal.length) { go(); return; }
    let choice = legal[0]; let best = -1;
    legal.forEach((card) => { const score = scorePeg(state.pegSequence.concat(card)); if (score > best) { best = score; choice = card; } });
    playPeg(state.hands[1].findIndex((card) => card.id === choice.id));
  }

  function scheduleAI() {
    if (!state || !state.computer || state.aiPending || state.phase === "complete" || !isHuman(state.active) && state.active !== 1) return;
    if (state.active !== 1) return;
    state.aiPending = true;
    window.setTimeout(() => { state.aiPending = false; if (!state || !state.computer || state.active !== 1 || state.phase === "complete") return; if (state.phase === "discard") chooseComputerCrib(); else if (state.phase === "peg") aiPeg(); }, 300);
  }

  function cardButton(card, enabled, selected, onClick, hidden) { const button = document.createElement("button"); button.type = "button"; button.className = "playing-card" + (card.suit === "H" || card.suit === "D" ? " red" : "") + (selected ? " selected" : ""); button.textContent = hidden ? "🂠" : text(card); button.disabled = !enabled; if (onClick) button.addEventListener("click", onClick); return button; }

  function render() {
    resetReveal();
    els.hands.textContent = "";
    state.hands.forEach((hand, player) => { const box = document.createElement("div"); box.className = "player-box"; const heading = document.createElement("h3"); heading.textContent = "Player " + (player + 1) + (state.active === player && state.phase !== "complete" ? " · active" : "") + (player === 1 && state.computer ? " · computer" : ""); box.appendChild(heading); const row = document.createElement("div"); row.className = "card-row"; hand.forEach((card, index) => { const enabled = state.phase === "discard" ? canAct(player) : state.phase === "peg" && canAct(player) && legalPegCards(player).some((candidate) => candidate.id === card.id); row.appendChild(cardButton(card, enabled, state.selected.includes(index), () => state.phase === "discard" ? toggleCard(index) : playPeg(index), !handVisible(player))); }); box.appendChild(row); els.hands.appendChild(box); });
    els.crib.textContent = ""; state.crib.forEach((card) => els.crib.appendChild(cardButton(card, false, false, null, false))); if (state.starter) els.crib.appendChild(cardButton(state.starter, false, false, null, false));
    els.score1.textContent = String(state.scores[0]); els.score2.textContent = String(state.scores[1]);
    els.scorebar.querySelectorAll(".dynamic-score").forEach((item) => item.remove());
    state.scores.slice(2).forEach((score, offset) => { const item = document.createElement("div"); item.className = "dynamic-score"; item.innerHTML = "<span>Player " + (offset + 3) + "</span><strong>" + score + "</strong>"; els.scorebar.insertBefore(item, els.cribCount.parentElement); });
    els.cribCount.textContent = state.crib.length + " / " + state.cribTarget; els.pegCount.textContent = state.pegCount + " / 31";
    els.confirm.disabled = state.phase !== "discard" || !canAct() || state.selected.length !== 2; els.nextPhase.hidden = state.phase !== "ready"; els.go.hidden = state.phase !== "peg" || !canAct() || legalPegCards(state.active).length > 0;
    els.passPanel.hidden = state.computer || state.phase === "complete" || handVisible(state.active);
    els.passTitle.textContent = "Pass the device to Player " + (state.active + 1) + ".";
    els.showHand.textContent = "Player " + (state.active + 1) + ": show cards";
    els.status.textContent = state.result || (state.phase === "discard" ? (canAct() ? "Player " + (state.active + 1) + " chooses two cards for the crib." : "Pass the device to Player " + (state.active + 1) + ".") : state.phase === "ready" ? "Starter card is " + text(state.starter) + "." : state.phase === "peg" ? (canAct() ? "Player " + (state.active + 1) + " to peg." : "Pass the device to Player " + (state.active + 1) + ".") : "Round complete.");
    els.note.textContent = state.phase === "discard" ? "Choose two cards for the crib. The computer keeps useful cards and builds its crib." : state.phase === "ready" ? "The non-dealer leads pegging. The starter card counts for hand scoring, not pegging." : state.phase === "peg" ? "Pegging scores 15, 31, pairs, and runs. Press Go when you cannot play without exceeding 31." : "Start a new deal to test another round.";
  }

  els.mode.addEventListener("change", () => { newGame(); });
  els.playerCount.addEventListener("change", () => { if (!els.mode.checked) newGame(); });
  els.showHand.addEventListener("click", showActiveHand);
  document.getElementById("new-game").addEventListener("click", newGame); els.confirm.addEventListener("click", confirmSelection); els.nextPhase.addEventListener("click", beginPegging); els.go.addEventListener("click", go);
  try { const theme = localStorage.getItem("leave-me-alone-games-theme"); document.body.dataset.theme = THEMES.has(theme) ? theme : "colorblind"; } catch { document.body.dataset.theme = "colorblind"; }
  newGame();
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("../../sw.js").catch(() => {}));
})();
