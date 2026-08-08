(function () {
  "use strict";

  const SUITS = ["S", "H", "D", "C"];
  const SUIT_NAMES = { S: "Spades", H: "Hearts", D: "Diamonds", C: "Clubs" };
  const SUIT_SYMBOLS = { S: "♠", H: "♥", D: "♦", C: "♣" };
  const RANK_NAMES = { 14: "A", 13: "K", 12: "Q", 11: "J", 10: "10", 9: "9", 8: "8", 7: "7", 6: "6", 5: "5", 4: "4", 3: "3", 2: "2" };
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
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
    result: document.getElementById("result-panel"),
    resultTitle: document.getElementById("result-title"),
    roundResult: document.getElementById("round-result"),
    nextDeal: document.getElementById("next-deal"),
    newMatch: document.getElementById("new-match"),
    newRound: document.getElementById("new-round"),
    mode: document.getElementById("computer-mode")
  };
  let state = null;

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
      lastTrick: null,
      roundResult: null,
      error: "",
      computer: els.mode.checked,
      aiPending: false,
      finishPending: false
    };
    render();
    scheduleAI();
  }

  function startMatch() {
    newDeal([0, 0], 0);
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
    if (state.phase !== "auction") return;
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
    if (state.phase !== "auction") return;
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
    if (state.phase !== "auction" || !state.highest || state.highest.value !== 83 || state.highest.doubled) return;
    state.highest = { value: 83, bidder: state.active, doubled: true };
    state.history.push(playerName(state.active) + " bid 83 Double.");
    state.active = nextBiddingPlayer(state.active);
    state.error = "";
    render();
  }

  function chooseTrump(suit) {
    if (state.phase !== "trump") return;
    state.trump = suit;
    state.hands[state.highest.bidder].push(...state.kitty);
    state.kitty = [];
    state.phase = "discard";
    state.active = 0;
    state.selected = [];
    state.error = "";
    render();
  }

  function discardNeed(player) {
    return Math.max(0, state.hands[player].length - 6);
  }

  function safeDiscardAvailable(hand) {
    return hand.filter((card) => !isScoringTrump(card)).length >= discardNeed(state.active);
  }

  function isDiscardable(card, hand) {
    return !safeDiscardAvailable(hand) || !isScoringTrump(card);
  }

  function toggleDiscard(card) {
    if (state.phase !== "discard" || card.player !== state.active || !discardNeed(state.active)) return;
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
    if (state.phase !== "discard") return;
    const need = discardNeed(state.active);
    if (state.selected.length !== need) {
      state.error = "Select exactly " + need + " card" + (need === 1 ? "" : "s") + " to discard.";
      render();
      return;
    }
    if (safeDiscardAvailable(state.hands[state.active]) && selectedCards().some((card) => isScoringTrump(card))) {
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
    if (state.phase !== "discard" || !canPassTrumps()) return;
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
    if (ledSuit.length) return ledSuit;
    return hand;
  }

  function playCard(card) {
    if (state.phase !== "play" || card.player !== state.active) return;
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

  function aiBidEstimate(hand) {
    let best = 30;
    SUITS.forEach((suit) => {
      const trumps = hand.filter((card) => isTrump(card, suit));
      const strength = trumps.reduce((total, card) => total + (trumpWeight(card, suit) >= 12 ? 4 : trumpWeight(card, suit) >= 9 ? 2 : 0) + pointValue(card, suit) / 8, 0);
      best = Math.max(best, Math.min(83, 30 + Math.floor(strength)));
    });
    return best;
  }

  function aiAuction() {
    if (state.phase !== "auction" || isHuman(state.active)) return;
    const estimate = aiBidEstimate(state.hands[state.active]);
    if (state.highest && state.highest.bidder === state.active) passBid();
    else if (!state.highest || estimate > state.highest.value) {
      els.bidValue.value = String(Math.max(30, Math.min(83, state.highest ? state.highest.value + 1 : estimate)));
      submitBid();
    } else passBid();
  }

  function aiTrump() {
    if (state.phase !== "trump" || isHuman(state.active)) return;
    let choice = SUITS[0];
    let best = -1;
    SUITS.forEach((suit) => {
      const value = state.hands[state.highest.bidder].filter((card) => isTrump(card, suit)).reduce((total, card) => total + trumpWeight(card, suit) + pointValue(card, suit), 0);
      if (value > best) { best = value; choice = suit; }
    });
    chooseTrump(choice);
  }

  function aiDiscard() {
    if (state.phase !== "discard" || isHuman(state.active)) return;
    const player = state.active;
    const need = discardNeed(player);
    if (!need) { advanceDiscard(); render(); return; }
    const hand = state.hands[player];
    if (!safeDiscardAvailable(hand)) {
      const trumps = hand.filter((card) => isTrump(card, state.trump)).sort((a, b) => pointValue(a, state.trump) - pointValue(b, state.trump) || trumpWeight(a, state.trump) - trumpWeight(b, state.trump));
      state.selected = trumps.slice(0, need).map((card) => card.id);
      if (canPassTrumps()) { passTrumps(); return; }
    }
    const discardable = safeDiscardAvailable(hand) ? hand.filter((card) => !isScoringTrump(card)) : hand.slice();
    state.selected = discardable.sort((a, b) => pointValue(a, state.trump) - pointValue(b, state.trump) || trumpWeight(a, state.trump) - trumpWeight(b, state.trump) || plainWeight(a) - plainWeight(b)).slice(0, need).map((card) => card.id);
    confirmDiscard();
  }

  function aiPlay() {
    if (state.phase !== "play" || isHuman(state.active)) return;
    const player = state.active;
    const legal = legalCards(player).slice();
    const partner = state.trick.length ? trickWinner(state.trick).player : -1;
    legal.sort((a, b) => {
      const aValue = pointValue(a, state.trump) * 10 + trumpWeight(a, state.trump);
      const bValue = pointValue(b, state.trump) * 10 + trumpWeight(b, state.trump);
      return (partner === teamOf(player) ? aValue - bValue : aValue - bValue) || plainWeight(a) - plainWeight(b);
    });
    if (legal.length) playCard({ id: legal[0].id, player });
  }

  function scheduleFinish() {
    if (state.finishPending) return;
    state.finishPending = true;
    window.setTimeout(() => { state.finishPending = false; finishTrick(); }, 550);
  }

  function scheduleAI() {
    if (!state || !state.computer || state.aiPending || isHuman(state.active) || state.phase === "round-over" || state.phase === "game-over") return;
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
    els.hands.textContent = "";
    state.hands.forEach((hand, player) => {
      const box = document.createElement("div");
      box.className = "player-box";
      const heading = document.createElement("h3");
      heading.textContent = playerName(player) + " · " + hand.length + " cards" + (state.active === player && (state.phase === "discard" || state.phase === "play") ? " · active" : "");
      box.appendChild(heading);
      const row = document.createElement("div");
      row.className = "card-row";
      const discardSafe = state.phase === "discard" && safeDiscardAvailable(hand);
      const legal = state.phase === "play" && state.active === player ? new Set(legalCards(player).map((card) => card.id)) : new Set();
      hand.forEach((card) => {
        const discardEnabled = state.phase === "discard" && state.active === player && isHuman(player) && discardNeed(player) > 0;
        const playEnabled = state.phase === "play" && state.active === player && isHuman(player) && legal.has(card.id);
        const enabled = discardEnabled || playEnabled;
        const handler = state.phase === "discard" ? () => toggleDiscard({ id: card.id, player }) : () => playCard({ id: card.id, player });
        const button = cardButton(card, enabled, state.selected.includes(card.id), enabled ? handler : null, state.computer && player !== 0);
        if (state.phase === "discard" && discardSafe && isScoringTrump(card)) button.classList.add("protected");
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
    const humanTurn = state.phase === "auction" && isHuman(state.active);
    els.bidButton.disabled = !humanTurn;
    els.passButton.disabled = !humanTurn;
    els.bidValue.disabled = !humanTurn;
    els.doubleButton.disabled = !humanTurn || !state.highest || state.highest.value !== 83 || state.highest.doubled;
  }

  function renderTrump() {
    els.suitChoices.textContent = "";
    SUITS.forEach((suit) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "suit-button " + suit;
      button.textContent = SUIT_SYMBOLS[suit] + " " + SUIT_NAMES[suit];
      button.disabled = !isHuman(state.highest.bidder);
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
    els.discardButton.disabled = state.phase !== "discard" || !isHuman(state.active) || state.selected.length !== need;
    els.passTrumps.disabled = state.phase !== "discard" || !isHuman(state.active) || !canPassTrumps();
    els.discardNote.textContent = state.error || (safeDiscardAvailable(state.hands[state.active]) ? "Scoring trumps are protected. Select non-scoring cards, or pass selected trumps to your partner." : "This hand has more than six scoring trumps; pass excess trumps to your partner before discarding.");
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
    els.status.textContent = state.error || (auction ? playerName(state.active) + " to bid." : trump ? "Choose a trump suit." : discard ? playerName(state.active) + " is discarding." : play ? playerName(state.active) + " to play." : state.phase === "round-over" ? "Deal scored." : "Game complete.");
    renderScorebar();
    renderAuction();
    if (trump) renderTrump();
    if (discard) renderDiscard();
    if (play) renderTrick();
    renderHands();
    renderResult();
    scheduleAI();
  }

  els.mode.addEventListener("change", () => {
    if (!state) return;
    state.computer = els.mode.checked;
    if (!state.computer) state.aiPending = false;
    render();
  });
  els.bidButton.addEventListener("click", submitBid);
  els.doubleButton.addEventListener("click", submitDouble);
  els.passButton.addEventListener("click", passBid);
  els.discardButton.addEventListener("click", confirmDiscard);
  els.passTrumps.addEventListener("click", passTrumps);
  els.finishTrick.addEventListener("click", finishTrick);
  els.newMatch.addEventListener("click", startMatch);
  els.newRound.addEventListener("click", startMatch);
  els.nextDeal.addEventListener("click", nextDeal);
  setTheme();
  startMatch();
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("../../sw.js").catch(() => {}));
})();
