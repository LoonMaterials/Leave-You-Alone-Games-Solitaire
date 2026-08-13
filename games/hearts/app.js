(function () {
  "use strict";
  try {
    localStorage.setItem("leave-me-alone-games-last-game", JSON.stringify({ id: "hearts", href: "games/hearts/index.html", title: document.querySelector("h1")?.textContent?.trim() || "hearts", playedAt: Date.now() }));
  } catch {}

  const SUITS = ["S", "H", "D", "C"];
  const RANKS = ["", "", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const SYMBOLS = { S: "♠", H: "♥", D: "♦", C: "♣" };
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const DIFFICULTY_KEY = "leave-me-alone-hearts-difficulty";
  const SAVE_KEY = "leave-me-alone-hearts-save-v1";
  const HAND_ORDER_KEY = "leave-me-alone-hearts-hand-order";
  const DIFFICULTIES = new Set(["easy", "medium", "hard"]);
  const els = {
    status: document.getElementById("status"), hands: document.getElementById("hands"), trick: document.getElementById("trick"),
    scorebar: document.getElementById("scorebar"), finish: document.getElementById("finish-trick"), note: document.getElementById("note"),
    mode: document.getElementById("computer-mode"), difficulty: document.getElementById("difficulty"), playerCount: document.getElementById("player-count"),
    passPanel: document.getElementById("pass-panel"), passTitle: document.getElementById("pass-title"), showHand: document.getElementById("show-hand"),
    cardPassPanel: document.getElementById("card-pass-panel"), confirmPass: document.getElementById("confirm-pass"), handOrder: document.getElementById("hand-order")
  };
  let state;

  function storedDifficulty() { try { const value = localStorage.getItem(DIFFICULTY_KEY); return DIFFICULTIES.has(value) ? value : "medium"; } catch { return "medium"; } }
  function applyDifficulty() { els.difficulty.value = storedDifficulty(); els.difficulty.disabled = !els.mode.checked; }
  function saveDifficulty() { try { localStorage.setItem(DIFFICULTY_KEY, DIFFICULTIES.has(els.difficulty.value) ? els.difficulty.value : "medium"); } catch {} }
  function storedHandOrder() { try { const value = localStorage.getItem(HAND_ORDER_KEY); return ["dealt", "suit", "rank"].includes(value) ? value : "suit"; } catch { return "suit"; } }
  function saveHandOrder() { try { localStorage.setItem(HAND_ORDER_KEY, els.handOrder.value); } catch {} render(); }
  function orderedEntries(hand) {
    const entries = hand.map((card, index) => ({ card, index }));
    if (els.handOrder.value === "dealt") return entries;
    return entries.sort((a, b) => els.handOrder.value === "rank" ? (a.card.rank - b.card.rank || SUITS.indexOf(a.card.suit) - SUITS.indexOf(b.card.suit)) : (SUITS.indexOf(a.card.suit) - SUITS.indexOf(b.card.suit) || a.card.rank - b.card.rank));
  }
  function saveState() { if (state) try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, aiPending: false, finishPending: false })); } catch {} }
  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!saved || !Array.isArray(saved.hands) || saved.hands.length < 2 || !Array.isArray(saved.scores)) return null;
      saved.aiPending = false; saved.finishPending = false; saved.selectedPass = [];
      saved.revealedPlayer = saved.computer ? 0 : -1; saved.lastActive = saved.active;
      return saved;
    } catch { return null; }
  }
  function handVisible(player) { return state.computer ? player === 0 : state.revealedPlayer === player; }
  function isHuman(player) { return !state.computer || player === 0; }
  function canAct(player = state.active) { return !state.complete && state.active === player && isHuman(player) && handVisible(player); }
  function resetReveal() { if (state.lastActive !== state.active) { state.lastActive = state.active; state.revealedPlayer = state.computer ? 0 : -1; } }
  function showActiveHand() { if (!state.computer) { state.revealedPlayer = state.active; render(); } }

  function makeDeck() { const deck = []; SUITS.forEach((suit) => { for (let rank = 2; rank <= 14; rank += 1) deck.push({ id: suit + rank, rank, suit }); }); return deck; }
  function shuffle(cards) { for (let index = cards.length - 1; index > 0; index -= 1) { const swap = Math.floor(Math.random() * (index + 1)); [cards[index], cards[swap]] = [cards[swap], cards[index]]; } return cards; }
  function text(card) { return RANKS[card.rank] + SYMBOLS[card.suit]; }
  function isHeart(card) { return card.suit === "H"; }
  function points(card) { return isHeart(card) ? 1 : card.id === "S12" ? 13 : 0; }
  function playerName(player) { return "Player " + (player + 1); }

  function newGame() {
    const computer = els.mode.checked;
    const playerCount = computer ? 4 : Number(els.playerCount.value);
    const deck = shuffle(makeDeck().filter((card) => playerCount !== 3 || card.id !== "D2"));
    const handSize = Math.floor(52 / playerCount);
    const hands = Array.from({ length: playerCount }, () => []);
    for (let round = 0; round < handSize; round += 1) for (let player = 0; player < playerCount; player += 1) hands[player].push(deck.pop());
    const phase = playerCount === 4 ? "pass" : "play";
    if (!computer && phase === "play") {
      const owner = hands.findIndex((hand) => hand.some((card) => card.id === "C2"));
      if (owner > 0) {
        const clubTwoIndex = hands[owner].findIndex((card) => card.id === "C2");
        [hands[0][0], hands[owner][clubTwoIndex]] = [hands[owner][clubTwoIndex], hands[0][0]];
      }
    }
    const opening = hands.findIndex((hand) => hand.some((card) => card.id === "C2"));
    state = {
      hands, playerCount, active: phase === "pass" ? 0 : opening, phase, selectedPass: [], passSelections: Array(playerCount).fill(null),
      trick: [], trickCount: 0, scores: Array(playerCount).fill(0), heartsBroken: false, playedCards: [], complete: false, computer,
      finishPending: false, aiPending: false, revealedPlayer: 0, lastActive: phase === "pass" ? 0 : opening
    };
    els.playerCount.disabled = computer; els.difficulty.disabled = !computer;
    render(); scheduleAI();
  }

  function passDanger(card) {
    if (card.id === "S12") return 130;
    if (card.id === "S14") return 92;
    if (card.id === "S13") return 84;
    if (isHeart(card)) return 30 + card.rank * 2;
    return card.rank * 2 + (card.rank >= 12 ? 10 : 0);
  }

  function choosePassCards(player) {
    const hand = state.hands[player];
    const difficulty = storedDifficulty();
    if (difficulty === "easy") return shuffle(hand.slice()).slice(0, 3);
    let best = null;
    for (let a = 0; a < hand.length - 2; a += 1) for (let b = a + 1; b < hand.length - 1; b += 1) for (let c = b + 1; c < hand.length; c += 1) {
      const cards = [hand[a], hand[b], hand[c]];
      let score = cards.reduce((total, card) => total + passDanger(card), 0);
      if (difficulty === "hard") {
        const remaining = hand.filter((card) => !cards.includes(card));
        score += SUITS.filter((suit) => remaining.every((card) => card.suit !== suit)).length * 18;
        if (remaining.some((card) => card.id === "S12") && remaining.filter((card) => card.suit === "S" && card.rank > 12).length) score -= 45;
      }
      if (!best || score > best.score) best = { cards, score };
    }
    return best.cards;
  }

  function togglePass(cardId) {
    if (state.phase !== "pass" || !canAct()) return;
    if (state.selectedPass.includes(cardId)) state.selectedPass = state.selectedPass.filter((id) => id !== cardId);
    else if (state.selectedPass.length < 3) state.selectedPass.push(cardId);
    render();
  }

  function submitPass(cards) {
    if (state.phase !== "pass" || cards.length !== 3) return;
    state.passSelections[state.active] = cards.map((card) => card.id);
    state.selectedPass = [];
    if (state.passSelections.every(Boolean)) { completePass(); return; }
    state.active = (state.active + 1) % state.playerCount;
    render(); scheduleAI();
  }

  function confirmPass() {
    if (!canAct() || state.selectedPass.length !== 3) return;
    submitPass(state.hands[state.active].filter((card) => state.selectedPass.includes(card.id)));
  }

  function completePass() {
    const outgoing = state.passSelections.map((ids, player) => state.hands[player].filter((card) => ids.includes(card.id)));
    state.hands = state.hands.map((hand, player) => hand.filter((card) => !state.passSelections[player].includes(card.id)));
    outgoing.forEach((cards, player) => state.hands[(player + 1) % state.playerCount].push(...cards));
    state.phase = "play"; state.active = state.hands.findIndex((hand) => hand.some((card) => card.id === "C2"));
    state.lastActive = -1; state.passSelections = Array(state.playerCount).fill(null);
    render(); scheduleAI();
  }

  function legalCards(player) {
    const hand = state.hands[player];
    if (!state.trick.length) {
      let legal = state.heartsBroken ? hand.slice() : hand.filter((card) => !isHeart(card));
      if (state.trickCount === 0) legal = legal.filter((card) => card.id === "C2");
      return legal.length ? legal : hand.slice();
    }
    const ledSuit = state.trick[0].card.suit;
    const suited = hand.filter((card) => card.suit === ledSuit);
    if (suited.length) return suited;
    if (state.trickCount === 0) { const nonPoints = hand.filter((card) => points(card) === 0); if (nonPoints.length) return nonPoints; }
    return hand.slice();
  }

  function trickWinner(trick) {
    const suit = trick[0].card.suit;
    return trick.filter((entry) => entry.card.suit === suit).reduce((best, entry) => entry.card.rank > best.card.rank ? entry : best);
  }

  function playCard(player, index) {
    if (state.phase !== "play" || state.complete || state.active !== player || state.trick.length >= state.playerCount || (isHuman(player) ? !handVisible(player) : !state.computer)) return;
    const card = state.hands[player][index];
    if (!card || !legalCards(player).some((candidate) => candidate.id === card.id)) return;
    state.hands[player].splice(index, 1); state.trick.push({ player, card }); if (isHeart(card)) state.heartsBroken = true;
    if (state.trick.length < state.playerCount) state.active = (player + 1) % state.playerCount;
    render(); if (state.trick.length === state.playerCount) scheduleFinish(); else scheduleAI();
  }

  function wouldWin(player, card) { return trickWinner(state.trick.concat([{ player, card }])).player === player; }
  function aiCard(player) {
    const legal = legalCards(player).slice();
    const difficulty = storedDifficulty();
    if (difficulty === "easy") return legal[Math.floor(Math.random() * legal.length)];
    if (!state.trick.length) {
      const queenGone = state.playedCards.some((card) => card.id === "S12");
      const scored = legal.map((card) => {
        const suitCount = state.hands[player].filter((item) => item.suit === card.suit).length;
        const spadeRisk = !queenGone && card.suit === "S" && card.rank > 12 ? 35 : 0;
        return { card, score: card.rank + (difficulty === "hard" ? suitCount * 3 + spadeRisk : 0) };
      });
      scored.sort((a, b) => a.score - b.score); return scored[0].card;
    }
    const ledSuit = state.trick[0].card.suit;
    const follows = legal.every((card) => card.suit === ledSuit);
    if (!follows) {
      const queen = legal.find((card) => card.id === "S12"); if (queen) return queen;
      return legal.slice().sort((a, b) => points(b) - points(a) || b.rank - a.rank)[0];
    }
    const losing = legal.filter((card) => !wouldWin(player, card)).sort((a, b) => b.rank - a.rank);
    if (losing.length) return losing[0];
    const trickPoints = state.trick.reduce((total, entry) => total + points(entry.card), 0);
    if (difficulty === "hard" && state.trick.length === state.playerCount - 1 && trickPoints === 0) return legal.slice().sort((a, b) => b.rank - a.rank)[0];
    return legal.slice().sort((a, b) => a.rank - b.rank)[0];
  }

  function scheduleAI() {
    if (!state || !state.computer || state.complete || state.aiPending || isHuman(state.active) || state.trick.length >= state.playerCount) return;
    state.aiPending = true;
    window.setTimeout(() => {
      state.aiPending = false;
      if (!state || !state.computer || state.complete || isHuman(state.active)) return;
      if (state.phase === "pass") submitPass(choosePassCards(state.active));
      else { const card = aiCard(state.active); playCard(state.active, state.hands[state.active].findIndex((candidate) => candidate.id === card.id)); }
    }, 300);
  }

  function scheduleFinish() { if (state.finishPending) return; state.finishPending = true; window.setTimeout(() => { state.finishPending = false; finishTrick(); }, 550); }
  function finishTrick() {
    if (state.trick.length !== state.playerCount || state.complete) return;
    const winner = trickWinner(state.trick); const trickPoints = state.trick.reduce((total, entry) => total + points(entry.card), 0);
    state.scores[winner.player] += trickPoints; state.playedCards.push(...state.trick.map((entry) => entry.card)); state.trick = []; state.trickCount += 1;
    if (state.hands.every((hand) => hand.length === 0)) {
      const shooter = state.scores.findIndex((score) => score === 26);
      if (shooter >= 0) state.scores = state.scores.map((score, player) => player === shooter ? 0 : score + 26);
      state.complete = true;
    } else state.active = winner.player;
    render(); scheduleAI();
  }

  function cardButton(card, enabled, onClick, hidden, selected) {
    const button = document.createElement("button"); button.type = "button"; button.className = "playing-card" + (isHeart(card) || card.id === "S12" ? " red" : "") + (selected ? " selected" : "");
    button.textContent = hidden ? "🂠" : text(card); button.disabled = !enabled; if (onClick) button.addEventListener("click", onClick); return button;
  }

  function render() {
    resetReveal(); els.hands.textContent = "";
    state.hands.forEach((hand, player) => {
      const box = document.createElement("div"); box.className = "player-box";
      const heading = document.createElement("h3"); heading.textContent = playerName(player) + " · " + hand.length + " cards" + (state.active === player && !state.complete ? " · active" : "") + (player > 0 && state.computer ? " · computer" : ""); box.appendChild(heading);
      const row = document.createElement("div"); row.className = "card-row";
      orderedEntries(hand).forEach(({ card, index }) => {
        const passEnabled = state.phase === "pass" && canAct(player);
        const playEnabled = state.phase === "play" && canAct(player) && state.trick.length < state.playerCount && legalCards(player).some((candidate) => candidate.id === card.id);
        row.appendChild(cardButton(card, passEnabled || playEnabled, passEnabled ? () => togglePass(card.id) : () => playCard(player, index), !handVisible(player), state.selectedPass.includes(card.id)));
      });
      box.appendChild(row); els.hands.appendChild(box);
    });
    els.trick.textContent = ""; state.trick.forEach((entry) => { const item = document.createElement("div"); item.className = "trick-card"; const owner = document.createElement("strong"); owner.textContent = playerName(entry.player); item.appendChild(owner); item.appendChild(cardButton(entry.card, false, null, false, false)); els.trick.appendChild(item); });
    els.scorebar.textContent = ""; state.scores.forEach((score, player) => { const item = document.createElement("div"); item.innerHTML = "<span>" + playerName(player) + "</span><strong>" + score + " points</strong>"; els.scorebar.appendChild(item); });
    els.cardPassPanel.hidden = state.phase !== "pass"; els.confirmPass.disabled = state.phase !== "pass" || !canAct() || state.selectedPass.length !== 3;
    els.status.textContent = state.complete ? "Deal complete." : state.computer && !isHuman(state.active) ? "Computer is thinking…" : canAct() ? state.phase === "pass" ? playerName(state.active) + " chooses three cards to pass." : playerName(state.active) + " to play." : "Pass the device to Player " + (state.active + 1) + ".";
    els.finish.disabled = state.phase !== "play" || state.trick.length !== state.playerCount || state.complete;
    els.passPanel.hidden = state.computer || state.complete || handVisible(state.active);
    els.passTitle.textContent = "Pass the device to Player " + (state.active + 1) + "."; els.showHand.textContent = "Player " + (state.active + 1) + ": show cards";
    els.note.textContent = state.complete ? "Start a new deal for another hand." : state.phase === "pass" ? "Four-player Hearts begins by passing three cards to the player on the left." : state.heartsBroken ? "Hearts are broken. Follow suit whenever possible." : "Hearts are not broken yet. The 2♣ leads the first trick; point cards are restricted on that trick.";
    saveState();
  }

  els.mode.addEventListener("change", () => { applyDifficulty(); newGame(); });
  els.difficulty.addEventListener("change", saveDifficulty);
  els.handOrder.addEventListener("change", saveHandOrder);
  els.playerCount.addEventListener("change", () => { if (!els.mode.checked) newGame(); });
  els.showHand.addEventListener("click", showActiveHand); els.confirmPass.addEventListener("click", confirmPass);
  document.getElementById("new-game").addEventListener("click", newGame); els.finish.addEventListener("click", finishTrick);
  try { const theme = localStorage.getItem("leave-me-alone-games-theme"); document.body.dataset.theme = THEMES.has(theme) ? theme : "colorblind"; } catch { document.body.dataset.theme = "colorblind"; }
  applyDifficulty(); els.handOrder.value = storedHandOrder(); state = loadState();
  if (state) { els.mode.checked = state.computer; els.playerCount.value = String(state.playerCount); els.playerCount.disabled = state.computer; applyDifficulty(); render(); scheduleAI(); } else newGame();
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("../../sw.js").catch(() => {}));
})();
