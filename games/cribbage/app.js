(function () {
  "use strict";
  try {
    localStorage.setItem("leave-me-alone-games-last-game", JSON.stringify({ id: "cribbage", href: "games/cribbage/index.html", title: document.querySelector("h1")?.textContent?.trim() || "cribbage", playedAt: Date.now() }));
  } catch {}

  const SUITS = ["S", "H", "D", "C"];
  const RANKS = ["", "", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const SYMBOLS = { S: "♠", H: "♥", D: "♦", C: "♣" };
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const DIFFICULTY_KEY = "leave-me-alone-cribbage-difficulty";
  const SAVE_KEY = "leave-me-alone-cribbage-save-v1";
  const HAND_ORDER_KEY = "leave-me-alone-cribbage-hand-order";
  const DIFFICULTIES = new Set(["easy", "medium", "hard"]);
  const els = { status: document.getElementById("status"), hands: document.getElementById("hands"), crib: document.getElementById("crib"), note: document.getElementById("note"), scorebar: document.querySelector(".scorebar"), score1: document.getElementById("score-1"), score2: document.getElementById("score-2"), cribCount: document.getElementById("crib-count"), pegCount: document.getElementById("peg-count"), confirm: document.getElementById("confirm-selection"), nextPhase: document.getElementById("next-phase"), go: document.getElementById("go-button"), mode: document.getElementById("computer-mode"), difficulty: document.getElementById("difficulty"), playerCount: document.getElementById("player-count"), passPanel: document.getElementById("pass-panel"), passTitle: document.getElementById("pass-title"), showHand: document.getElementById("show-hand"), handOrder: document.getElementById("hand-order") };
  let state;

  function storedDifficulty() { try { const value = localStorage.getItem(DIFFICULTY_KEY); return DIFFICULTIES.has(value) ? value : "medium"; } catch { return "medium"; } }
  function applyDifficulty() { els.difficulty.value = storedDifficulty(); els.difficulty.disabled = !els.mode.checked; }
  function saveDifficulty() { try { localStorage.setItem(DIFFICULTY_KEY, DIFFICULTIES.has(els.difficulty.value) ? els.difficulty.value : "medium"); } catch {} }
  function storedHandOrder() { try { const value = localStorage.getItem(HAND_ORDER_KEY); return ["dealt", "suit", "rank"].includes(value) ? value : "suit"; } catch { return "suit"; } }
  function saveHandOrder() { try { localStorage.setItem(HAND_ORDER_KEY, els.handOrder.value); } catch {} render(); }
  function orderedEntries(hand) { const entries = hand.map((card, index) => ({ card, index })); if (els.handOrder.value === "dealt") return entries; return entries.sort((a, b) => els.handOrder.value === "rank" ? runRank(a.card) - runRank(b.card) || SUITS.indexOf(a.card.suit) - SUITS.indexOf(b.card.suit) : SUITS.indexOf(a.card.suit) - SUITS.indexOf(b.card.suit) || runRank(a.card) - runRank(b.card)); }
  function saveState() { if (state) try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, aiPending: false })); } catch {} }
  function loadState() { try { const saved = JSON.parse(localStorage.getItem(SAVE_KEY)); if (!saved || !Array.isArray(saved.hands) || saved.hands.length < 2 || !Array.isArray(saved.deck) || !Array.isArray(saved.scores)) return null; saved.aiPending = false; saved.selected = []; saved.revealedPlayer = saved.computer ? 0 : -1; saved.lastActive = saved.active; return saved; } catch { return null; } }

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
  function runRank(card) { return card.rank === 14 ? 1 : card.rank; }
  function isHuman(player) { return !state.computer || player === 0; }

  function scorePeg(sequence) {
    if (!sequence.length) return 0;
    const total = sequence.reduce((sum, card) => sum + value(card), 0);
    let points = total === 15 ? 2 : total === 31 ? 2 : 0;
    let same = 1;
    for (let index = sequence.length - 2; index >= 0 && sequence[index].rank === sequence[sequence.length - 1].rank; index -= 1) same += 1;
    if (same >= 2) points += same === 2 ? 2 : same === 3 ? 6 : 12;
    for (let length = Math.min(sequence.length, 7); length >= 3; length -= 1) {
      const tail = sequence.slice(-length).map(runRank).sort((a, b) => a - b);
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
    for (let length = cards.length; length >= 3; length -= 1) {
      let runPoints = 0;
      for (let mask = 1; mask < (1 << cards.length); mask += 1) {
        const chosen = cards.filter((_, index) => mask & (1 << index)); if (chosen.length !== length) continue;
        const ranks = [...new Set(chosen.map(runRank))].sort((a, b) => a - b);
        if (ranks.length === length && ranks.every((rank, index) => index === 0 || rank === ranks[index - 1] + 1)) runPoints += length;
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
    const cardsPerHand = playerCount === 2 ? 6 : 5;
    const discardCount = playerCount === 2 ? 2 : 1;
    state = { deck, hands: Array.from({ length: playerCount }, () => []), scoringHands: [], playerCount, crib: [], cribTarget: 4, discardCount, starter: null, selected: [], active: 0, phase: "discard", dealer: playerCount - 1, scores: Array(playerCount).fill(0), pegCount: 0, pegSequence: [], passed: Array(playerCount).fill(false), lastPegPlayer: null, computer, aiPending: false, result: "", revealedPlayer: 0, lastActive: 0 };
    for (let index = 0; index < cardsPerHand; index += 1) for (let player = 0; player < playerCount; player += 1) state.hands[player].push(state.deck.pop());
    if (playerCount === 3) state.crib.push(state.deck.pop());
    els.playerCount.disabled = computer;
    els.difficulty.disabled = !computer;
    render(); scheduleAI();
  }

  function toggleCard(index) {
    if (state.phase !== "discard" || !canAct()) return;
    if (state.selected.includes(index)) state.selected = state.selected.filter((item) => item !== index);
    else if (state.selected.length < state.discardCount) state.selected.push(index);
    render();
  }

  function discardCombinations(hand, count) {
    const result = [];
    function choose(start, selected) {
      if (selected.length === count) { result.push(selected.slice()); return; }
      for (let index = start; index < hand.length; index += 1) { selected.push(index); choose(index + 1, selected); selected.pop(); }
    }
    choose(0, []); return result;
  }

  function cribSeedValue(cards) {
    let score = 0;
    for (let first = 0; first < cards.length; first += 1) for (let second = first + 1; second < cards.length; second += 1) {
      const a = cards[first], b = cards[second];
      if (a.rank === b.rank) score += 2.5;
      if (value(a) + value(b) === 15) score += 2.4;
      if (Math.abs(a.rank - b.rank) === 1) score += 1.5;
      if (a.suit === b.suit) score += 0.5;
    }
    score += cards.filter((card) => card.rank === 5).length * 2.2;
    return score;
  }

  function expectedHandScore(keep, known) {
    const starters = makeDeck().filter((card) => !known.some((held) => held.id === card.id));
    return starters.reduce((total, starter) => total + scoreHand(keep, starter, false), 0) / starters.length;
  }

  function chooseComputerCrib() {
    const hand = state.hands[1];
    const difficulty = storedDifficulty();
    const choices = discardCombinations(hand, state.discardCount);
    if (difficulty === "easy") state.selected = choices[Math.floor(Math.random() * choices.length)];
    else {
      const dealerSign = state.dealer === 1 ? 1 : -1;
      const scored = choices.map((indices) => {
        const discarded = hand.filter((_, index) => indices.includes(index));
        const keep = hand.filter((_, index) => !indices.includes(index));
        const handScore = difficulty === "hard" ? expectedHandScore(keep, hand) : scoreHand(keep, null, false);
        return { indices, score: handScore + dealerSign * cribSeedValue(discarded) * (difficulty === "hard" ? 1.1 : 0.7) };
      });
      scored.sort((a, b) => b.score - a.score); state.selected = scored[0].indices;
    }
    confirmSelection();
  }

  function confirmSelection() {
    if (state.phase !== "discard" || state.selected.length !== state.discardCount || !turnUnlocked()) return;
    const moved = state.hands[state.active].filter((_, index) => state.selected.includes(index));
    state.hands[state.active] = state.hands[state.active].filter((_, index) => !state.selected.includes(index));
    state.crib.push(...moved); state.selected = [];
    if (state.crib.length === state.cribTarget) finishDiscard();
    else { state.active = (state.active + 1) % state.playerCount; if (state.computer) scheduleAI(); }
    render();
  }

  function finishDiscard() {
    if (state.crib.length !== state.cribTarget) return;
    state.starter = state.deck.pop();
    state.scoringHands = state.hands.map((hand) => hand.slice());
    if (state.starter.rank === 11) state.scores[state.dealer] += 2;
    state.phase = "ready"; state.active = (state.dealer + 1) % state.playerCount; state.pegCount = 0; state.pegSequence = []; state.passed = Array(state.playerCount).fill(false);
  }

  function beginPegging() { if (state.phase !== "ready") return; state.phase = "peg"; state.active = (state.dealer + 1) % state.playerCount; state.pegCount = 0; state.pegSequence = []; state.passed = Array(state.playerCount).fill(false); render(); scheduleAI(); }

  function legalPegCards(player) { return state.hands[player].filter((card) => value(card) + state.pegCount <= 31); }
  function nextPlayerWithCards(after) {
    return Array.from({ length: state.playerCount }, (_, offset) => (after + offset + 1) % state.playerCount).find((player) => state.hands[player].length > 0);
  }

  function finishRound() {
    state.scoringHands.forEach((hand, player) => { state.scores[player] += scoreHand(hand, state.starter, false); });
    state.scores[state.dealer] += scoreHand(state.crib, state.starter, true);
    state.phase = "complete"; state.result = "Round complete. " + state.scores.map((score, player) => "Player " + (player + 1) + " " + score).join(", ") + ".";
  }

  function playPeg(index) {
    if (state.phase !== "peg" || state.active < 0 || !turnUnlocked()) return;
    const card = state.hands[state.active][index]; if (!card || !legalPegCards(state.active).some((candidate) => candidate.id === card.id)) return;
    state.hands[state.active].splice(index, 1); state.pegSequence.push(card); state.pegCount += value(card); state.scores[state.active] += scorePeg(state.pegSequence); state.lastPegPlayer = state.active; state.passed = Array(state.playerCount).fill(false);
    if (state.hands.every((hand) => !hand.length)) { if (state.pegCount !== 31) state.scores[state.active] += 1; finishRound(); render(); return; }
    if (state.pegCount === 31) { state.pegCount = 0; state.pegSequence = []; state.active = nextPlayerWithCards(state.lastPegPlayer); }
    else state.active = (state.active + 1) % state.playerCount;
    render(); scheduleAI();
  }

  function go() {
    if (state.phase !== "peg" || state.active < 0 || !turnUnlocked() || legalPegCards(state.active).length) return;
    state.passed[state.active] = true;
    const next = Array.from({ length: state.playerCount }, (_, offset) => (state.active + offset + 1) % state.playerCount).find((player) => !state.passed[player]);
    if (next === undefined) { if (state.pegCount > 0 && state.lastPegPlayer !== null) state.scores[state.lastPegPlayer] += 1; state.pegCount = 0; state.pegSequence = []; state.passed = Array(state.playerCount).fill(false); state.active = state.lastPegPlayer === null ? 0 : nextPlayerWithCards(state.lastPegPlayer); }
    else state.active = next;
    render(); scheduleAI();
  }

  function aiPeg() {
    const legal = legalPegCards(1); if (!legal.length) { go(); return; }
    const difficulty = storedDifficulty();
    let choice;
    if (difficulty === "easy") choice = legal[Math.floor(Math.random() * legal.length)];
    else {
      const ranked = legal.map((card) => {
        const sequence = state.pegSequence.concat(card);
        const count = state.pegCount + value(card);
        const immediate = scorePeg(sequence);
        let replyDanger = 0;
        if (difficulty === "hard") {
          for (let rank = 2; rank <= 14; rank += 1) {
            const possible = { rank, suit: "S" };
            if (count + value(possible) <= 31) replyDanger = Math.max(replyDanger, scorePeg(sequence.concat(possible)));
          }
        }
        const trap = count === 5 || count === 21 ? 5 : count === 10 ? 2 : 0;
        return { card, score: immediate * 25 - replyDanger * 7 - trap + (31 - count) / 100 };
      });
      ranked.sort((a, b) => b.score - a.score || value(a.card) - value(b.card)); choice = ranked[0].card;
    }
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
    state.hands.forEach((hand, player) => { const box = document.createElement("div"); box.className = "player-box"; const heading = document.createElement("h3"); heading.textContent = "Player " + (player + 1) + (state.active === player && state.phase !== "complete" ? " · active" : "") + (player === 1 && state.computer ? " · computer" : ""); box.appendChild(heading); const row = document.createElement("div"); row.className = "card-row"; orderedEntries(hand).forEach(({ card, index }) => { const enabled = state.phase === "discard" ? canAct(player) : state.phase === "peg" && canAct(player) && legalPegCards(player).some((candidate) => candidate.id === card.id); row.appendChild(cardButton(card, enabled, state.selected.includes(index), () => state.phase === "discard" ? toggleCard(index) : playPeg(index), !handVisible(player))); }); box.appendChild(row); els.hands.appendChild(box); });
    els.crib.textContent = ""; state.crib.forEach((card) => els.crib.appendChild(cardButton(card, false, false, null, state.phase !== "complete"))); if (state.starter) els.crib.appendChild(cardButton(state.starter, false, false, null, false));
    els.score1.textContent = String(state.scores[0]); els.score2.textContent = String(state.scores[1]);
    els.scorebar.querySelectorAll(".dynamic-score").forEach((item) => item.remove());
    state.scores.slice(2).forEach((score, offset) => { const item = document.createElement("div"); item.className = "dynamic-score"; item.innerHTML = "<span>Player " + (offset + 3) + "</span><strong>" + score + "</strong>"; els.scorebar.insertBefore(item, els.cribCount.parentElement); });
    els.cribCount.textContent = state.crib.length + " / " + state.cribTarget; els.pegCount.textContent = state.pegCount + " / 31";
    els.confirm.textContent = "Send " + state.discardCount + " to crib"; els.confirm.disabled = state.phase !== "discard" || !canAct() || state.selected.length !== state.discardCount; els.nextPhase.hidden = state.phase !== "ready"; els.go.hidden = state.phase !== "peg" || !canAct() || legalPegCards(state.active).length > 0;
    els.passPanel.hidden = state.computer || state.phase === "complete" || handVisible(state.active);
    els.passTitle.textContent = "Pass the device to Player " + (state.active + 1) + ".";
    els.showHand.textContent = "Player " + (state.active + 1) + ": show cards";
    els.status.textContent = state.result || (state.phase === "discard" ? (canAct() ? "Player " + (state.active + 1) + " chooses " + state.discardCount + " card" + (state.discardCount === 1 ? "" : "s") + " for the crib." : "Pass the device to Player " + (state.active + 1) + ".") : state.phase === "ready" ? "Starter card is " + text(state.starter) + "." : state.phase === "peg" ? (canAct() ? "Player " + (state.active + 1) + " to peg." : "Pass the device to Player " + (state.active + 1) + ".") : "Round complete.");
    els.note.textContent = state.phase === "discard" ? (state.playerCount === 2 ? "Two-player Cribbage deals six cards and each player sends two to the crib." : "Three- and four-player Cribbage deals five cards and each player sends one to the four-card crib.") : state.phase === "ready" ? "The non-dealer leads pegging. The starter card counts for hand scoring, not pegging." : state.phase === "peg" ? "Pegging scores 15, 31, pairs, runs, Go, and the last card. The computer weighs immediate scores against the reply it may allow." : "Start a new deal for another round.";
    saveState();
  }

  els.mode.addEventListener("change", () => { applyDifficulty(); newGame(); });
  els.difficulty.addEventListener("change", saveDifficulty);
  els.handOrder.addEventListener("change", saveHandOrder);
  els.playerCount.addEventListener("change", () => { if (!els.mode.checked) newGame(); });
  els.showHand.addEventListener("click", showActiveHand);
  document.getElementById("new-game").addEventListener("click", newGame); els.confirm.addEventListener("click", confirmSelection); els.nextPhase.addEventListener("click", beginPegging); els.go.addEventListener("click", go);
  try { const theme = localStorage.getItem("leave-me-alone-games-theme"); document.body.dataset.theme = THEMES.has(theme) ? theme : "colorblind"; } catch { document.body.dataset.theme = "colorblind"; }
  applyDifficulty();
  els.handOrder.value = storedHandOrder(); state = loadState();
  if (state) { els.mode.checked = state.computer; els.playerCount.value = String(state.playerCount); els.playerCount.disabled = state.computer; applyDifficulty(); render(); scheduleAI(); } else newGame();
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("../../sw.js").catch(() => {}));
})();
