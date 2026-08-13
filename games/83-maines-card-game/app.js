(function () {
  "use strict";
  try {
    localStorage.setItem("leave-me-alone-games-last-game", JSON.stringify({ id: "83-maines-card-game", href: "games/83-maines-card-game/index.html", title: document.querySelector("h1")?.textContent?.trim() || "83-maines-card-game", playedAt: Date.now() }));
  } catch {}

  const SUITS = ["S", "H", "D", "C"];
  const SUIT_NAMES = { S: "Spades", H: "Hearts", D: "Diamonds", C: "Clubs" };
  const SUIT_SYMBOLS = { S: "♠", H: "♥", D: "♦", C: "♣" };
  const RANK_NAMES = { 14: "A", 13: "K", 12: "Q", 11: "J", 10: "10", 9: "9", 8: "8", 7: "7", 6: "6", 5: "5", 4: "4", 3: "3", 2: "2" };
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const DIFFICULTY_KEY = "leave-me-alone-83-difficulty";
  const SAVE_KEY = "leave-me-alone-83-save-v1";
  const HAND_ORDER_KEY = "leave-me-alone-83-hand-order";
  const DIFFICULTIES = new Set(["easy", "medium", "hard"]);
  const TEAM_NAMES = ["Team 1 · Players 1 + 3", "Team 2 · Players 2 + 4"];
  const els = {
    status: document.getElementById("status"),
    scorebar: document.getElementById("scorebar"),
    auction: document.getElementById("auction-panel"),
    bidValue: document.getElementById("bid-value"),
    bidButton: document.getElementById("bid-button"),
    doubleButton: document.getElementById("double-button"),
    passButton: document.getElementById("pass-button"),
    bidHistory: document.getElementById("bid-history"),
    trump: document.getElementById("trump-panel"),
    trumpPrompt: document.getElementById("trump-prompt"),
    suitChoices: document.getElementById("suit-choices"),
    kitty: document.getElementById("kitty"),
    kittyNote: document.getElementById("kitty-note"),
    discard: document.getElementById("discard-panel"),
    discardPrompt: document.getElementById("discard-prompt"),
    discardNote: document.getElementById("discard-note"),
    discardButton: document.getElementById("discard-button"),
    passTrumps: document.getElementById("pass-trumps"),
    play: document.getElementById("play-panel"),
    playPrompt: document.getElementById("play-prompt"),
    playNote: document.getElementById("play-note"),
    trick: document.getElementById("trick"),
    finishTrick: document.getElementById("finish-trick"),
    hands: document.getElementById("hands"),
    passPanel: document.getElementById("pass-panel"),
    passTitle: document.getElementById("pass-title"),
    showHand: document.getElementById("show-hand"),
    result: document.getElementById("result-panel"),
    resultTitle: document.getElementById("result-title"),
    roundResult: document.getElementById("round-result"),
    nextDeal: document.getElementById("next-deal"),
    newMatch: document.getElementById("new-match"),
    newRound: document.getElementById("new-round"),
    mode: document.getElementById("computer-mode"),
    difficulty: document.getElementById("difficulty"),
    handOrder: document.getElementById("hand-order")
  };
  let state = null;

  function storedDifficulty() { try { const value = localStorage.getItem(DIFFICULTY_KEY); return DIFFICULTIES.has(value) ? value : "medium"; } catch { return "medium"; } }
  function applyDifficulty() { els.difficulty.value = storedDifficulty(); els.difficulty.disabled = !els.mode.checked; }
  function saveDifficulty() { try { localStorage.setItem(DIFFICULTY_KEY, DIFFICULTIES.has(els.difficulty.value) ? els.difficulty.value : "medium"); } catch {} }
  function storedHandOrder() { try { const value = localStorage.getItem(HAND_ORDER_KEY); return ["dealt", "suit", "rank"].includes(value) ? value : "suit"; } catch { return "suit"; } }
  function saveHandOrder() { try { localStorage.setItem(HAND_ORDER_KEY, els.handOrder.value); } catch {} render(); }
  function orderedHand(hand) {
    const order = els.handOrder.value;
    if (order === "dealt") return hand.slice();
    const suitIndex = (card) => card.joker ? 4 : SUITS.indexOf(card.suit);
    return hand.slice().sort((a, b) => order === "rank" ? (b.rank - a.rank || suitIndex(a) - suitIndex(b)) : (suitIndex(a) - suitIndex(b) || b.rank - a.rank));
  }
  function saveState() {
    if (!state) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, aiPending: false, finishPending: false })); } catch {}
  }
  function repairOverplayedTrick(saved) {
    if (saved?.phase !== "play" || !Array.isArray(saved.trick) || saved.trick.length <= 4 || !Array.isArray(saved.hands)) return saved;
    saved.trick.splice(4).forEach((entry) => {
      if (entry && Number.isInteger(entry.player) && saved.hands[entry.player] && entry.card) saved.hands[entry.player].push(entry.card);
    });
    return saved;
  }
  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!saved || !Array.isArray(saved.hands) || saved.hands.length !== 4 || !Array.isArray(saved.scores) || saved.scores.length !== 2) return null;
      repairOverplayedTrick(saved);
      saved.aiPending = false;
      saved.finishPending = false;
      saved.revealedPlayer = saved.computer ? 0 : -1;
      saved.lastActive = saved.active;
      return saved;
    } catch { return null; }
  }

  function handVisible(player) {
    return state.computer ? player === 0 : state.revealedPlayer === player;
  }

  function actorUnlocked(player = state.active) {
    return state.active === player && (isHuman(player) ? handVisible(player) : state.computer);
  }

  function humanTurn(player = state.active) {
    return actorUnlocked(player) && isHuman(player);
  }

  function resetReveal() {
    if (state.lastActive !== state.active) {
      state.lastActive = state.active;
      state.revealedPlayer = state.computer ? 0 : -1;
    }
  }

  function showActiveHand() {
    if (!state.computer) {
      state.revealedPlayer = state.active;
      render();
    }
  }

  function makeDeck() {
    const deck = [];
    SUITS.forEach((suit) => {
      for (let rank = 2; rank <= 14; rank += 1) deck.push({ id: suit + rank, suit, rank });
    });
    deck.push({ id: "JOKER", suit: "J", rank: 0, joker: true });
    return deck;
  }

  function shuffle(deck) {
    for (let index = deck.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [deck[index], deck[swap]] = [deck[swap], deck[index]];
    }
    return deck;
  }

  function teamOf(player) {
    return player % 2;
  }

  function isHuman(player) {
    return !state.computer || player === 0;
  }

  function playerName(player) {
    return "Player " + (player + 1);
  }

  function suitColor(suit) {
    return suit === "H" || suit === "D" ? "red" : "black";
  }

  function cardText(card) {
    return card.joker ? "Joker" : RANK_NAMES[card.rank] + SUIT_SYMBOLS[card.suit];
  }

  function cardLongText(card) {
    return card.joker ? "Joker" : RANK_NAMES[card.rank] + " of " + SUIT_NAMES[card.suit];
  }

  function isTrump(card, trump) {
    return Boolean(trump) && (card.joker || card.suit === trump || (card.rank === 5 && suitColor(card.suit) === suitColor(trump)));
  }

  function pointValue(card, trump) {
    if (!isTrump(card, trump)) return 0;
    if (card.joker) return 15;
    return ({ 14: 1, 13: 25, 12: 20, 11: 1, 10: 1, 9: 9, 5: 5, 2: 1 })[card.rank] || 0;
  }

  function trumpWeight(card, trump) {
    if (card.joker) return 0;
    if (card.rank === 5 && card.suit !== trump) return 5;
    return ({ 14: 15, 13: 14, 12: 13, 11: 12, 10: 11, 9: 10, 8: 9, 7: 8, 6: 7, 5: 6, 4: 4, 3: 3, 2: 2 })[card.rank] || 0;
  }

  function plainWeight(card) {
    return card.rank === 14 ? 14 : card.rank;
  }

  function isScoringTrump(card) {
    return pointValue(card, state.trump) > 0;
  }

  function newDeal(scores, dealer) {
    const deck = shuffle(makeDeck());
    const computer = els.mode.checked;
    const hands = [[], [], [], []];
    for (let round = 0; round < 12; round += 1) {
      for (let player = 0; player < 4; player += 1) hands[player].push(deck.pop());
    }
    state = {
      scores: scores.slice(),
      dealer,
      hands,
      kitty: deck.splice(0, 5),
      active: (dealer + 1) % 4,
      phase: "auction",
      passed: [false, false, false, false],
      highest: null,
      history: [],
      trump: null,
      selected: [],
      trick: [],
      teamPoints: [0, 0],
      teamTricks: [0, 0],
      playedCards: [],
      lastTrick: null,
      roundResult: null,
      error: "",
      computer,
      aiPending: false,
      finishPending: false,
      revealedPlayer: 0,
      lastActive: (dealer + 1) % 4
    };
    els.difficulty.disabled = !computer;
    render();
    scheduleAI();
  }

  function startMatch() {
    newDeal([0, 0], 3);
  }

  function nextDeal() {
    newDeal(state.scores, (state.dealer + 1) % 4);
  }

  function nextBiddingPlayer(start) {
    for (let offset = 1; offset <= 4; offset += 1) {
      const player = (start + offset) % 4;
      if (!state.passed[player]) return player;
    }
    return start;
  }

  function passedCount() {
    return state.passed.filter(Boolean).length;
  }

  function beginTrumpChoice() {
    state.phase = "trump";
    state.active = state.highest.bidder;
    state.error = "";
    render();
  }

  function passBid() {
    if (state.phase !== "auction" || !actorUnlocked()) return;
    state.passed[state.active] = true;
    state.history.push(playerName(state.active) + " passed.");
    if (passedCount() >= 3) {
      if (!state.highest) {
        state.highest = { value: 30, bidder: state.dealer, doubled: false, forced: true };
        state.history.push("No bid was made, so the dealer is forced to 30.");
      }
      beginTrumpChoice();
      return;
    }
    state.active = nextBiddingPlayer(state.active);
    state.error = "";
    render();
  }

  function submitBid() {
    if (state.phase !== "auction" || !actorUnlocked()) return;
    const value = Math.floor(Number(els.bidValue.value));
    if (!Number.isFinite(value) || value < 30 || value > 83 || (state.highest && value <= state.highest.value)) {
      state.error = state.highest ? "Bid higher than " + state.highest.value + "." : "The minimum bid is 30.";
      render();
      return;
    }
    state.highest = { value, bidder: state.active, doubled: false };
    state.history.push(playerName(state.active) + " bid " + value + ".");
    state.active = nextBiddingPlayer(state.active);
    state.error = "";
    render();
  }

  function submitDouble() {
    if (state.phase !== "auction" || !actorUnlocked() || !state.highest || state.highest.value !== 83 || state.highest.doubled) return;
    state.highest = { value: 83, bidder: state.active, doubled: true };
    state.history.push(playerName(state.active) + " bid 83 Double.");
    state.active = nextBiddingPlayer(state.active);
    state.error = "";
    render();
  }

  function chooseTrump(suit) {
    if (state.phase !== "trump" || state.active !== state.highest.bidder || !actorUnlocked()) return;
    state.trump = suit;
    state.hands[state.highest.bidder].push(...state.kitty);
    state.kitty = [];
    state.phase = "discard";
    state.active = (state.dealer + 1) % 4;
    state.selected = [];
    state.error = "";
    render();
  }

  function discardNeed(player) {
    return Math.max(0, state.hands[player].length - 6);
  }

  function safeDiscardAvailable(hand, need = discardNeed(state.active)) {
    return hand.filter((card) => !isScoringTrump(card)).length >= need;
  }

  function isDiscardable(card) {
    return !isScoringTrump(card);
  }

  function toggleDiscard(card) {
    if (state.phase !== "discard" || !humanTurn() || card.player !== state.active || !discardNeed(state.active)) return;
    const chosen = state.hands[state.active].find((item) => item.id === card.id);
    if (!chosen) return;
    if (state.selected.includes(card.id)) state.selected = state.selected.filter((id) => id !== card.id);
    else if (state.selected.length < discardNeed(state.active)) state.selected.push(card.id);
    state.error = "";
    render();
  }

  function selectedCards() {
    return state.hands[state.active].filter((card) => state.selected.includes(card.id));
  }

  function canPassTrumps() {
    const selected = selectedCards();
    return selected.length > 0 && selected.every((card) => isTrump(card, state.trump)) && state.hands[state.active].length - selected.length >= 6;
  }

  function advanceDiscard() {
    if (state.hands.every((hand) => hand.length === 6)) {
      state.phase = "play";
      state.active = state.highest.bidder;
      return;
    }
    for (let offset = 1; offset <= 4; offset += 1) {
      const player = (state.active + offset) % 4;
      if (state.hands[player].length > 6) {
        state.active = player;
        return;
      }
    }
  }

  function confirmDiscard() {
    if (state.phase !== "discard" || !actorUnlocked()) return;
    const need = discardNeed(state.active);
    if (state.selected.length !== need) {
      state.error = "Select exactly " + need + " card" + (need === 1 ? "" : "s") + " to discard.";
      render();
      return;
    }
    if (selectedCards().some((card) => isScoringTrump(card))) {
      state.error = "Scoring trumps cannot be discarded. Pass those trumps to your partner instead.";
      render();
      return;
    }
    state.hands[state.active] = state.hands[state.active].filter((card) => !state.selected.includes(card.id));
    state.selected = [];
    advanceDiscard();
    state.error = "";
    render();
  }

  function passTrumps() {
    if (state.phase !== "discard" || !actorUnlocked() || !canPassTrumps()) return;
    const partner = (state.active + 2) % 4;
    const moved = selectedCards();
    state.hands[state.active] = state.hands[state.active].filter((card) => !state.selected.includes(card.id));
    state.hands[partner].push(...moved);
    state.selected = [];
    state.error = "";
    advanceDiscard();
    render();
  }

  function legalCards(player) {
    const hand = state.hands[player];
    if (!state.trick.length) return hand;
    const lead = state.trick[0].card;
    if (isTrump(lead, state.trump)) {
      const trumps = hand.filter((card) => isTrump(card, state.trump));
      return trumps.length ? trumps : hand;
    }
    const ledSuit = hand.filter((card) => card.suit === lead.suit && !isTrump(card, state.trump));
    const trumps = hand.filter((card) => isTrump(card, state.trump));
    if (ledSuit.length) return ledSuit.concat(trumps);
    return hand;
  }

  function playCard(card) {
    if (state.phase !== "play" || state.trick.length >= 4 || !actorUnlocked() || card.player !== state.active) return;
    const legal = legalCards(state.active).some((candidate) => candidate.id === card.id);
    if (!legal) return;
    state.trick.push({ player: state.active, card: state.hands[state.active].splice(state.hands[state.active].findIndex((item) => item.id === card.id), 1)[0] });
    if (state.trick.length < 4) state.active = (state.active + 1) % 4;
    state.error = "";
    render();
    if (state.trick.length === 4) scheduleFinish();
  }

  function trickWinner(trick) {
    const trumps = trick.filter((entry) => isTrump(entry.card, state.trump));
    if (trumps.length) return trumps.reduce((best, entry) => trumpWeight(entry.card, state.trump) > trumpWeight(best.card, state.trump) ? entry : best);
    const ledSuit = trick[0].card.suit;
    return trick.filter((entry) => entry.card.suit === ledSuit).reduce((best, entry) => plainWeight(entry.card) > plainWeight(best.card) ? entry : best);
  }

  function finishTrick() {
    if (state.phase !== "play" || state.trick.length !== 4) return;
    const winner = trickWinner(state.trick);
    const points = state.trick.reduce((total, entry) => total + pointValue(entry.card, state.trump), 0);
    const team = teamOf(winner.player);
    state.teamPoints[team] += points;
    state.teamTricks[team] += 1;
    state.lastTrick = { player: winner.player, points };
    state.playedCards.push(...state.trick.map((entry) => entry.card));
    state.trick = [];
    if (state.hands.every((hand) => hand.length === 0)) finishRound();
    else {
      state.active = winner.player;
      render();
    }
  }

  function finishRound() {
    const bidderTeam = teamOf(state.highest.bidder);
    const otherTeam = bidderTeam === 0 ? 1 : 0;
    const made = state.teamPoints[bidderTeam] >= state.highest.value;
    const bidderChange = state.highest.doubled ? (made ? 166 : -166) : (made ? state.teamPoints[bidderTeam] : -state.highest.value);
    state.scores[bidderTeam] += bidderChange;
    state.scores[otherTeam] += state.teamPoints[otherTeam];
    state.roundResult = { bidderTeam, made, bidderChange, otherTeam, otherPoints: state.teamPoints[otherTeam] };
    state.phase = state.scores.some((score) => score >= 200) ? "game-over" : "round-over";
    render();
  }

  function evaluateTrump(hand, suit) {
    const trumps = hand.filter((card) => isTrump(card, suit));
    const points = trumps.reduce((total, card) => total + pointValue(card, suit), 0);
    const controls = trumps.filter((card) => trumpWeight(card, suit) >= 10).length;
    const offSuitAces = hand.filter((card) => card.rank === 14 && !isTrump(card, suit)).length;
    const suitCounts = SUITS.map((candidate) => hand.filter((card) => card.suit === candidate && !isTrump(card, suit)).length);
    const voids = suitCounts.filter((count) => count === 0).length;
    const score = points * 0.55 + trumps.length * 1.8 + controls * 2.2 + offSuitAces * 1.7 + voids * 1.2;
    const bid = Math.max(30, Math.min(83, Math.round(24 + score)));
    return { suit, trumps, points, controls, offSuitAces, voids, score, bid };
  }

  function bestTrumpPlan(hand) {
    return SUITS.map((suit) => evaluateTrump(hand, suit)).sort((a, b) => b.score - a.score)[0];
  }

  function aiBidEstimate(hand) {
    const difficulty = storedDifficulty();
    let bid = bestTrumpPlan(hand).bid;
    if (difficulty === "easy") bid += Math.floor(Math.random() * 13) - 7;
    if (difficulty === "hard") {
      const team = teamOf(state.active);
      const scorePressure = state.scores[team] < state.scores[team === 0 ? 1 : 0] ? 2 : 0;
      bid += scorePressure;
    }
    return Math.max(30, Math.min(83, bid));
  }

  function aiAuction() {
    if (state.phase !== "auction" || isHuman(state.active)) return;
    const estimate = aiBidEstimate(state.hands[state.active]);
    if (storedDifficulty() === "easy" && state.highest && Math.random() < 0.22) { passBid(); return; }
    if (state.highest && state.highest.value === 83 && !state.highest.doubled && teamOf(state.highest.bidder) !== teamOf(state.active) && estimate >= (storedDifficulty() === "hard" ? 76 : 78)) {
      submitDouble();
    } else if (state.highest && teamOf(state.highest.bidder) === teamOf(state.active) && state.highest.value >= estimate - 4) {
      passBid();
    } else if (!state.highest || estimate > state.highest.value) {
      const current = state.highest ? state.highest.value : 29;
      const increment = Math.min(5, Math.max(1, Math.floor((estimate - current) / 2)));
      els.bidValue.value = String(Math.min(83, Math.max(30, current + increment)));
      submitBid();
    } else passBid();
  }

  function aiTrump() {
    if (state.phase !== "trump" || isHuman(state.active)) return;
    chooseTrump(bestTrumpPlan(state.hands[state.highest.bidder]).suit);
  }

  function aiDiscard() {
    if (state.phase !== "discard" || isHuman(state.active)) return;
    const player = state.active;
    const need = discardNeed(player);
    if (!need) { advanceDiscard(); render(); return; }
    const hand = state.hands[player];
    const trumps = hand.filter((card) => isTrump(card, state.trump));
    const excess = Math.max(0, trumps.length - 6);
    if (excess) {
      const passable = trumps.slice().sort((a, b) => Number(isScoringTrump(a)) - Number(isScoringTrump(b)) || trumpWeight(a, state.trump) - trumpWeight(b, state.trump));
      state.selected = passable.slice(0, Math.min(excess, need)).map((card) => card.id);
      if (canPassTrumps()) { passTrumps(); return; }
    }
    const discardable = safeDiscardAvailable(hand, need) ? hand.filter((card) => !isScoringTrump(card)) : hand.slice();
    if (storedDifficulty() === "easy") state.selected = shuffle(discardable.slice()).slice(0, need).map((card) => card.id);
    else {
      const suitCounts = Object.fromEntries(SUITS.map((suit) => [suit, hand.filter((card) => card.suit === suit && !isTrump(card, state.trump)).length]));
      state.selected = discardable.sort((a, b) => pointValue(a, state.trump) - pointValue(b, state.trump) || (isTrump(a, state.trump) ? trumpWeight(a, state.trump) : 0) - (isTrump(b, state.trump) ? trumpWeight(b, state.trump) : 0) || (storedDifficulty() === "hard" ? suitCounts[a.suit] - suitCounts[b.suit] : 0) || plainWeight(a) - plainWeight(b)).slice(0, need).map((card) => card.id);
    }
    confirmDiscard();
  }

  function aiPlay() {
    if (state.phase !== "play" || state.trick.length >= 4 || isHuman(state.active)) return;
    const player = state.active;
    const legal = legalCards(player).slice();
    if (!legal.length) return;
    const difficulty = storedDifficulty();
    if (difficulty === "easy") { const choice = legal[Math.floor(Math.random() * legal.length)]; playCard({ id: choice.id, player }); return; }
    const cost = (card) => pointValue(card, state.trump) * 100 + (isTrump(card, state.trump) ? trumpWeight(card, state.trump) : 0) + plainWeight(card) / 100;
    const currentWinner = state.trick.length ? trickWinner(state.trick) : null;
    const winning = legal.filter((card) => trickWinner(state.trick.concat([{ player, card }])).player === player);
    let choice;
    if (!currentWinner) {
      const bidderTeam = teamOf(state.highest.bidder);
      const pointsNeeded = Math.max(0, state.highest.value - state.teamPoints[bidderTeam]);
      const pressContract = difficulty === "hard" && teamOf(player) === bidderTeam && pointsNeeded > state.hands.reduce((count, hand) => count + hand.length, 0) * 1.8;
      const plan = teamOf(player) === bidderTeam ? legal.filter((card) => isTrump(card, state.trump)) : [];
      const aces = legal.filter((card) => !isTrump(card, state.trump) && card.rank === 14);
      choice = (pressContract && plan.length ? plan.slice().sort((a, b) => trumpWeight(b, state.trump) - trumpWeight(a, state.trump))[0] : aces[0]) || (plan.length ? plan : legal).slice().sort((a, b) => (plan.length ? trumpWeight(b, state.trump) - trumpWeight(a, state.trump) : cost(a) - cost(b)))[0];
    } else if (teamOf(currentWinner.player) === teamOf(player)) {
      choice = legal.slice().sort((a, b) => cost(a) - cost(b))[0];
    } else if (winning.length) {
      choice = winning.slice().sort((a, b) => cost(a) - cost(b))[0];
    } else {
      choice = legal.slice().sort((a, b) => cost(a) - cost(b))[0];
    }
    playCard({ id: choice.id, player });
  }

  function scheduleFinish() {
    if (state.finishPending) return;
    state.finishPending = true;
    window.setTimeout(() => { state.finishPending = false; finishTrick(); }, 550);
  }

  function scheduleAI() {
    if (!state || !state.computer || state.aiPending || (state.phase === "play" && state.trick.length >= 4) || isHuman(state.active) || state.phase === "round-over" || state.phase === "game-over") return;
    state.aiPending = true;
    window.setTimeout(() => {
      state.aiPending = false;
      if (!state || !state.computer || isHuman(state.active)) return;
      if (state.phase === "auction") aiAuction();
      else if (state.phase === "trump") aiTrump();
      else if (state.phase === "discard") aiDiscard();
      else if (state.phase === "play") aiPlay();
    }, 300);
  }

  function setTheme() {
    try {
      const theme = localStorage.getItem("leave-me-alone-games-theme");
      document.body.dataset.theme = THEMES.has(theme) ? theme : "colorblind";
    } catch {
      document.body.dataset.theme = "colorblind";
    }
  }

  function cardButton(card, enabled, selected, onClick, hidden) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "playing-card" + (card.suit === "H" || card.suit === "D" ? " red" : "") + (selected ? " selected" : "");
    button.textContent = hidden ? "🂠" : cardText(card);
    button.title = cardLongText(card);
    button.disabled = !enabled;
    if (onClick) button.addEventListener("click", onClick);
    return button;
  }

  function renderHands() {
    resetReveal();
    els.hands.textContent = "";
    state.hands.forEach((hand, player) => {
      const box = document.createElement("div");
      box.className = "player-box";
      const heading = document.createElement("h3");
      heading.textContent = playerName(player) + " · " + hand.length + " cards" + (state.active === player && (state.phase === "discard" || state.phase === "play") ? " · active" : "");
      box.appendChild(heading);
      const row = document.createElement("div");
      row.className = "card-row";
        const legal = state.phase === "play" && state.active === player ? new Set(legalCards(player).map((card) => card.id)) : new Set();
        orderedHand(hand).forEach((card) => {
        const discardEnabled = state.phase === "discard" && humanTurn(player) && discardNeed(player) > 0;
        const playEnabled = state.phase === "play" && humanTurn(player) && legal.has(card.id);
        const enabled = discardEnabled || playEnabled;
        const handler = state.phase === "discard" ? () => toggleDiscard({ id: card.id, player }) : () => playCard({ id: card.id, player });
        const button = cardButton(card, enabled, state.selected.includes(card.id), enabled ? handler : null, !handVisible(player));
        if (state.phase === "discard" && isScoringTrump(card)) button.classList.add("protected");
        row.appendChild(button);
      });
      box.appendChild(row);
      els.hands.appendChild(box);
    });
  }

  function renderScorebar() {
    els.scorebar.textContent = "";
    state.scores.forEach((score, team) => {
      const item = document.createElement("div");
      item.innerHTML = "<span>" + TEAM_NAMES[team] + "</span><strong>" + score + " / 200</strong><small>" + state.teamPoints[team] + " points this deal · " + state.teamTricks[team] + " tricks</small>";
      els.scorebar.appendChild(item);
    });
    const deal = document.createElement("div");
    deal.innerHTML = "<span>Trump</span><strong>" + (state.trump ? SUIT_SYMBOLS[state.trump] + " " + SUIT_NAMES[state.trump] : "Not chosen") + "</strong><small>" + (state.highest ? "High bid " + state.highest.value + (state.highest.doubled ? " Double" : "") : "Auction open") + "</small>";
    els.scorebar.appendChild(deal);
  }

  function renderAuction() {
    els.bidHistory.textContent = "";
    state.history.forEach((entry) => {
      const line = document.createElement("span");
      line.textContent = entry;
      els.bidHistory.appendChild(line);
    });
    const canBid = state.phase === "auction" && humanTurn();
    els.bidButton.disabled = !canBid;
    els.passButton.disabled = !canBid;
    els.bidValue.disabled = !canBid;
    els.doubleButton.disabled = !canBid || !state.highest || state.highest.value !== 83 || state.highest.doubled;
  }

  function renderTrump() {
    els.suitChoices.textContent = "";
    SUITS.forEach((suit) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "suit-button " + suit;
      button.textContent = SUIT_SYMBOLS[suit] + " " + SUIT_NAMES[suit];
      button.disabled = !humanTurn(state.highest.bidder);
      button.addEventListener("click", () => chooseTrump(suit));
      els.suitChoices.appendChild(button);
    });
    els.trumpPrompt.textContent = playerName(state.highest.bidder) + " won " + (state.highest.doubled ? "83 Double" : state.highest.value) + " and chooses trump.";
    els.kitty.textContent = "";
    state.kitty.forEach((card) => els.kitty.appendChild(cardButton(card, false, false)));
    els.kittyNote.textContent = state.kitty.length ? "The high bidder takes these five cards." : "Kitty taken.";
  }

  function renderDiscard() {
    const need = discardNeed(state.active);
    els.discardPrompt.textContent = playerName(state.active) + " must discard " + need + " card" + (need === 1 ? "" : "s") + ".";
    els.discardButton.disabled = state.phase !== "discard" || !humanTurn() || state.selected.length !== need || selectedCards().some((card) => !isDiscardable(card));
    els.passTrumps.disabled = state.phase !== "discard" || !humanTurn() || !canPassTrumps();
    els.discardNote.textContent = state.error || (safeDiscardAvailable(state.hands[state.active]) ? "After the bidder takes the kitty, every player reduces to six cards. Scoring trumps are protected; selected trumps can be passed to a partner." : "This hand has more than six scoring trumps; pass excess trumps to your partner before discarding.");
  }

  function renderTrick() {
    els.trick.textContent = "";
    state.trick.forEach((entry) => {
      const item = document.createElement("div");
      item.className = "trick-card";
      const owner = document.createElement("strong");
      owner.textContent = playerName(entry.player);
      item.appendChild(owner);
      item.appendChild(cardButton(entry.card, false, false));
      els.trick.appendChild(item);
    });
    if (state.trick.length === 4) {
      const winner = trickWinner(state.trick);
      els.playNote.textContent = "Player " + (winner.player + 1) + " currently wins this trick · " + state.trick.reduce((total, entry) => total + pointValue(entry.card, state.trump), 0) + " points.";
    } else {
      const lead = state.trick.length ? cardText(state.trick[0].card) : "any card";
      els.playNote.textContent = "Lead: " + lead + ". Trump can be played when legal; follow-suit restrictions are enforced.";
    }
    els.finishTrick.disabled = state.phase !== "play" || state.trick.length !== 4;
  }

  function renderResult() {
    const result = state.roundResult;
    const gameOver = state.phase === "game-over";
    els.result.hidden = !["round-over", "game-over"].includes(state.phase);
    if (!result) return;
    els.resultTitle.textContent = gameOver ? "Game complete" : "Round complete";
    const bidder = TEAM_NAMES[result.bidderTeam];
    const other = TEAM_NAMES[result.otherTeam];
    const bidText = state.highest.doubled ? "83 Double" : String(state.highest.value);
    els.roundResult.textContent = bidder + (result.made ? " made " : " was set on ") + bidText + " and " + (result.made ? (result.bidderChange >= 0 ? "scored " + result.bidderChange : "lost " + Math.abs(result.bidderChange)) : "lost " + Math.abs(result.bidderChange)) + ". " + other + " scored " + result.otherPoints + ". Scores: " + state.scores[0] + " to " + state.scores[1] + ".";
    els.nextDeal.hidden = gameOver;
  }

  function render() {
    const auction = state.phase === "auction";
    const trump = state.phase === "trump";
    const discard = state.phase === "discard";
    const play = state.phase === "play";
    els.auction.hidden = !auction;
    els.trump.hidden = !trump;
    els.discard.hidden = !discard;
    els.play.hidden = !play;
    els.hands.hidden = state.phase === "game-over";
    const gatedPhase = auction || trump || discard || play;
    els.status.textContent = state.error || (!state.computer && gatedPhase && !handVisible(state.active) ? "Pass the device to Player " + (state.active + 1) + "." : auction ? playerName(state.active) + " to bid." : trump ? "Choose a trump suit." : discard ? playerName(state.active) + " is discarding." : play ? playerName(state.active) + " to play." : state.phase === "round-over" ? "Deal scored." : "Game complete.");
    els.passPanel.hidden = state.computer || !gatedPhase || handVisible(state.active);
    els.passTitle.textContent = "Pass the device to Player " + (state.active + 1) + ".";
    els.showHand.textContent = "Player " + (state.active + 1) + ": show cards";
    renderScorebar();
    renderAuction();
    if (trump) renderTrump();
    if (discard) renderDiscard();
    if (play) renderTrick();
    renderHands();
    renderResult();
    saveState();
    scheduleAI();
  }

  els.mode.addEventListener("change", () => {
    applyDifficulty();
    if (state) startMatch();
  });
  els.difficulty.addEventListener("change", saveDifficulty);
  els.handOrder.addEventListener("change", saveHandOrder);
  els.bidButton.addEventListener("click", submitBid);
  els.doubleButton.addEventListener("click", submitDouble);
  els.passButton.addEventListener("click", passBid);
  els.discardButton.addEventListener("click", confirmDiscard);
  els.passTrumps.addEventListener("click", passTrumps);
  els.finishTrick.addEventListener("click", finishTrick);
  els.newMatch.addEventListener("click", startMatch);
  els.newRound.addEventListener("click", startMatch);
  els.nextDeal.addEventListener("click", nextDeal);
  els.showHand.addEventListener("click", showActiveHand);
  setTheme();
  applyDifficulty();
  els.handOrder.value = storedHandOrder();
  state = loadState();
  if (state) {
    els.mode.checked = state.computer;
    applyDifficulty();
    render();
    if (state.phase === "play" && state.trick.length === 4) scheduleFinish();
  } else startMatch();
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("../../sw.js").catch(() => {}));
})();
