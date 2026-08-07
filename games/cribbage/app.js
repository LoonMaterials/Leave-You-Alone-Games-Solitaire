(function () {
  "use strict";

  const suits = ["S", "H", "D", "C"];
  const ranks = ["", "", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const symbols = { S: "♠", H: "♥", D: "♦", C: "♣" };
  const themes = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const els = {
    status: document.getElementById("status"),
    hands: document.getElementById("hands"),
    crib: document.getElementById("crib"),
    note: document.getElementById("note"),
    score1: document.getElementById("score-1"),
    score2: document.getElementById("score-2"),
    cribCount: document.getElementById("crib-count"),
    confirm: document.getElementById("confirm-selection"),
    nextPhase: document.getElementById("next-phase")
  };
  let state;

  function makeDeck() {
    const cards = [];
    suits.forEach((suit) => {
      for (let rank = 2; rank <= 14; rank += 1) cards.push({ id: suit + rank, rank, suit });
    });
    return cards;
  }

  function shuffle(cards) {
    for (let index = cards.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [cards[index], cards[swap]] = [cards[swap], cards[index]];
    }
    return cards;
  }

  function label(card) {
    return ranks[card.rank] + symbols[card.suit];
  }

  function isRed(card) {
    return card.suit === "H" || card.suit === "D";
  }

  function applyTheme() {
    try {
      const theme = localStorage.getItem("leave-me-alone-games-theme");
      document.body.dataset.theme = themes.has(theme) ? theme : "colorblind";
    } catch {
      document.body.dataset.theme = "colorblind";
    }
  }

  function newGame() {
    const deck = shuffle(makeDeck());
    state = { deck, hands: [[], []], crib: [], starter: null, selected: [], active: 0, phase: "discard", scores: [0, 0] };
    for (let index = 0; index < 6; index += 1) {
      state.hands[0].push(state.deck.pop());
      state.hands[1].push(state.deck.pop());
    }
    render();
  }

  function cardButton(card, selected, enabled, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "playing-card" + (isRed(card) ? " red" : "") + (selected ? " selected" : "");
    button.textContent = label(card);
    button.disabled = !enabled;
    if (onClick) button.addEventListener("click", onClick);
    return button;
  }

  function toggleCard(card) {
    if (state.selected.includes(card.id)) state.selected = state.selected.filter((id) => id !== card.id);
    else if (state.selected.length < 2) state.selected.push(card.id);
    render();
  }

  function confirmSelection() {
    if (state.selected.length !== 2) return;
    const hand = state.hands[state.active];
    const moved = hand.filter((card) => state.selected.includes(card.id));
    state.hands[state.active] = hand.filter((card) => !state.selected.includes(card.id));
    state.crib.push(...moved);
    state.selected = [];
    state.active = 1;
    if (state.crib.length === 4) {
      state.phase = "ready";
      state.starter = state.deck.pop();
    }
    render();
  }

  function beginPegging() {
    if (state.phase !== "ready") return;
    state.phase = "play";
    render();
  }

  function render() {
    els.hands.textContent = "";
    state.hands.forEach((hand, player) => {
      const box = document.createElement("div");
      box.className = "player-box";
      const heading = document.createElement("h3");
      heading.textContent = "Player " + (player + 1) + (state.phase === "discard" && player === state.active ? " · choose 2" : "");
      box.appendChild(heading);
      const row = document.createElement("div");
      row.className = "card-row";
      hand.forEach((card) => {
        const active = state.phase === "discard" && player === state.active;
        row.appendChild(cardButton(card, state.selected.includes(card.id), active, () => toggleCard(card)));
      });
      box.appendChild(row);
      els.hands.appendChild(box);
    });
    els.crib.textContent = "";
    state.crib.forEach((card) => els.crib.appendChild(cardButton(card, false, false)));
    if (state.starter) els.crib.appendChild(cardButton(state.starter, false, false));
    els.score1.textContent = String(state.scores[0]);
    els.score2.textContent = String(state.scores[1]);
    els.cribCount.textContent = state.crib.length + " / 4";
    els.confirm.disabled = state.phase !== "discard" || state.selected.length !== 2;
    els.nextPhase.hidden = state.phase !== "ready";
    if (state.phase === "discard") {
      els.status.textContent = "Player " + (state.active + 1) + " chooses 2 cards.";
      els.note.textContent = "Pass the device after each player sends two cards to the crib.";
    } else if (state.phase === "ready") {
      els.status.textContent = "Crib complete.";
      els.note.textContent = "Starter card: " + label(state.starter) + ". Pegging and scoring are next.";
    } else {
      els.status.textContent = "Basic pegging placeholder.";
      els.note.textContent = "The deal, crib, and starter are ready for the next rules pass.";
    }
  }

  document.getElementById("new-game").addEventListener("click", newGame);
  els.confirm.addEventListener("click", confirmSelection);
  els.nextPhase.addEventListener("click", beginPegging);
  applyTheme();
  newGame();
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("../../sw.js").catch(() => {}));
})();
