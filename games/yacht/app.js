(function () {
  "use strict";
  const STORAGE_KEY = "leave-me-alone-yacht-current-game";
  const MODE_KEY = "leave-me-alone-yacht-mode";
  const DIFFICULTY_KEY = "leave-me-alone-yacht-difficulty";
  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange"]);
  const MODES = new Set(["computer", "two-player"]);
  const DIFFICULTIES = new Set(["easy", "medium", "hard"]);
  const CATEGORIES = [
    ["ones", "yachtOnes"], ["twos", "yachtTwos"], ["threes", "yachtThrees"], ["fours", "yachtFours"], ["fives", "yachtFives"], ["sixes", "yachtSixes"],
    ["threeKind", "yachtThreeKind"], ["fourKind", "yachtFourKind"], ["fullHouse", "yachtFullHouse"], ["smallStraight", "yachtSmallStraight"], ["largeStraight", "yachtLargeStraight"], ["yacht", "yachtYacht"], ["chance", "yachtChance"]
  ];
  const els = { dice: document.getElementById("dice"), scoreCard: document.getElementById("score-card"), scoreline: document.getElementById("scoreline"), roll: document.getElementById("roll"), rollsLeft: document.getElementById("rolls-left"), status: document.getElementById("status"), undo: document.getElementById("undo"), newGame: document.getElementById("new-game"), mode: document.getElementById("game-mode"), difficulty: document.getElementById("difficulty") };
  let state = null, undoSnapshot = null, lastTapAt = 0;
  function t(key, values) { return window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key; }
  function storedMode() { try { const mode = localStorage.getItem(MODE_KEY); return MODES.has(mode) ? mode : "computer"; } catch { return "computer"; } }
  function storedDifficulty() { try { const difficulty = localStorage.getItem(DIFFICULTY_KEY); return DIFFICULTIES.has(difficulty) ? difficulty : "easy"; } catch { return "easy"; } }
  function isTwoPlayer() { return storedMode() === "two-player"; }
  function playerLabel(owner) { return owner === "p1" ? t("player1") : isTwoPlayer() ? t("player2") : t("computer"); }
  function applyTheme() { try { const theme = localStorage.getItem(THEME_KEY); document.body.dataset.theme = THEMES.has(theme) ? theme : "colorblind"; } catch { document.body.dataset.theme = "colorblind"; } }
  function applyControls() { if (els.mode) els.mode.value = storedMode(); if (els.difficulty) { els.difficulty.value = storedDifficulty(); els.difficulty.disabled = isTwoPlayer(); } }
  function freshScores() { return Object.fromEntries(CATEGORIES.map(([id]) => [id, null])); }
  function freshState() { return { players: { p1: freshScores(), p2: freshScores() }, turn: "p1", dice: [1,1,1,1,1], held: [false,false,false,false,false], rolls: 0, winner: null }; }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function saveState() { try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {} }
  function loadState() { try { const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY)); return saved?.players?.p1 && saved?.players?.p2 ? saved : null; } catch { return null; } }
  function remember() { undoSnapshot = clone(state); els.undo.disabled = false; }
  function rollDie() { return 1 + Math.floor(Math.random() * 6); }
  function counts(dice) { return dice.reduce((map, die) => (map[die] = (map[die] || 0) + 1, map), {}); }
  function total(dice) { return dice.reduce((sum, die) => sum + die, 0); }
  function upperValue(category) { return { ones: 1, twos: 2, threes: 3, fours: 4, fives: 5, sixes: 6 }[category] || 0; }
  function scoreCategory(category, dice) {
    const c = counts(dice), values = new Set(dice), sum = total(dice), upper = upperValue(category);
    if (upper) return dice.filter((die) => die === upper).reduce((a, b) => a + b, 0);
    if (category === "threeKind") return Object.values(c).some((n) => n >= 3) ? sum : 0;
    if (category === "fourKind") return Object.values(c).some((n) => n >= 4) ? sum : 0;
    if (category === "fullHouse") return Object.values(c).sort().join(",") === "2,3" ? 25 : 0;
    if (category === "smallStraight") return [[1,2,3,4], [2,3,4,5], [3,4,5,6]].some((run) => run.every((n) => values.has(n))) ? 30 : 0;
    if (category === "largeStraight") return (values.size === 5 && (!values.has(1) || !values.has(6))) ? 40 : 0;
    if (category === "yacht") return Object.values(c).some((n) => n === 5) ? 50 : 0;
    return sum;
  }
  function scoreTotal(scores) { return Object.values(scores).reduce((sum, value) => sum + (Number(value) || 0), 0); }
  function openCategories(owner) { return CATEGORIES.map(([id]) => id).filter((id) => state.players[owner][id] == null); }
  function isGameOver() { return !openCategories("p1").length && !openCategories("p2").length; }
  function nextOwner(owner) { return owner === "p1" ? "p2" : "p1"; }
  function categoryBias(id) { return ({ yacht: 18, largeStraight: 9, fullHouse: 6, fourKind: 5, smallStraight: 4, sixes: 3, fives: 2, chance: -2 })[id] || 0; }
  function bestCategory(owner, dice = state.dice) {
    return openCategories(owner).map((id) => ({ id, score: scoreCategory(id, dice) + categoryBias(id) })).sort((a, b) => b.score - a.score)[0]?.id;
  }
  function finishTurn(category) {
    if (state.rolls <= 0 || state.players[state.turn][category] != null || state.winner) return;
    remember();
    state.players[state.turn][category] = scoreCategory(category, state.dice);
    if (isGameOver()) {
      const p1 = scoreTotal(state.players.p1), p2 = scoreTotal(state.players.p2);
      state.winner = p1 === p2 ? "draw" : p1 > p2 ? "p1" : "p2";
    } else {
      state.turn = nextOwner(state.turn);
      state.dice = [1,1,1,1,1];
      state.held = [false,false,false,false,false];
      state.rolls = 0;
    }
    render();
    if (!isTwoPlayer() && state.turn === "p2" && !state.winner) window.setTimeout(computerTurn, 420);
  }
  function chooseHolds(owner) {
    const difficulty = storedDifficulty(), c = counts(state.dice);
    if (difficulty === "easy") return state.dice.map(() => Math.random() < .35);
    if (difficulty === "hard" && openCategories(owner).includes("largeStraight")) {
      const unique = new Set(state.dice);
      const low = [1,2,3,4,5].filter((n) => unique.has(n)).length;
      const high = [2,3,4,5,6].filter((n) => unique.has(n)).length;
      if (Math.max(low, high) >= 4) return state.dice.map((die) => (low >= high ? die <= 5 : die >= 2));
    }
    const bestNumber = Number(Object.keys(c).sort((a, b) => c[b] - c[a] || b - a)[0]);
    return state.dice.map((die) => die === bestNumber && c[bestNumber] >= 2);
  }
  function computerTurn() {
    if (isTwoPlayer() || state.turn !== "p2" || state.winner) return;
    while (state.rolls < 3) {
      state.held = state.rolls ? chooseHolds("p2") : [false,false,false,false,false];
      state.dice = state.dice.map((die, index) => state.held[index] ? die : rollDie());
      state.rolls += 1;
    }
    finishTurn(bestCategory("p2"));
  }
  function roll() {
    if (state.winner || (!isTwoPlayer() && state.turn === "p2") || state.rolls >= 3) return;
    remember();
    state.dice = state.dice.map((die, index) => state.held[index] ? die : rollDie());
    state.rolls += 1;
    render();
  }
  function toggleHold(index) { if (state.rolls <= 0 || state.winner || (!isTwoPlayer() && state.turn === "p2")) return; state.held[index] = !state.held[index]; render(); }
  function winnerText() { if (state.winner === "draw") return t("draw"); return t("playerWon", { player: playerLabel(state.winner) }); }
  function render() {
    els.status.textContent = state.winner ? winnerText() : t("diceTurn", { player: playerLabel(state.turn) });
    els.roll.disabled = state.winner || state.rolls >= 3 || (!isTwoPlayer() && state.turn === "p2");
    els.rollsLeft.textContent = t("rollsLeft", { count: 3 - state.rolls });
    els.scoreline.innerHTML = ["p1", "p2"].map((owner) => `<div class="scorebox"><span>${playerLabel(owner)}</span>${scoreTotal(state.players[owner])}</div>`).join("") + `<div class="scorebox"><span>${t("round")}</span>${14 - openCategories("p1").length}/13</div>`;
    els.dice.innerHTML = "";
    state.dice.forEach((die, index) => {
      const button = document.createElement("button");
      button.type = "button"; button.className = `die ${state.held[index] ? "held" : ""}`; button.textContent = String(die);
      button.setAttribute("aria-label", t("dieValue", { value: die }));
      button.addEventListener("click", () => toggleHold(index));
      els.dice.appendChild(button);
    });
    const suggested = state.rolls ? bestCategory(state.turn) : null;
    els.scoreCard.innerHTML = `<div class="score-row header"><span>${t("category")}</span><span>${playerLabel("p1")}</span><span>${playerLabel("p2")}</span><span>${t("score")}</span></div>`;
    CATEGORIES.forEach(([id, labelKey]) => {
      const row = document.createElement("div"); row.className = "score-row";
      const name = document.createElement("span"); name.textContent = t(labelKey); row.appendChild(name);
      ["p1", "p2"].forEach((owner) => { const cell = document.createElement("span"); cell.className = "used"; cell.textContent = state.players[owner][id] == null ? "—" : String(state.players[owner][id]); row.appendChild(cell); });
      const action = document.createElement("button"); action.type = "button"; action.textContent = state.rolls ? String(scoreCategory(id, state.dice)) : "—"; action.disabled = state.winner || state.rolls <= 0 || state.players[state.turn][id] != null || (!isTwoPlayer() && state.turn === "p2"); if (id === suggested) action.classList.add("suggested"); action.addEventListener("click", () => finishTurn(id)); row.appendChild(action);
      els.scoreCard.appendChild(row);
    });
    saveState();
  }
  function startNewGame() { state = freshState(); undoSnapshot = null; els.undo.disabled = true; render(); }
  function undo() { if (!undoSnapshot) return; state = clone(undoSnapshot); undoSnapshot = null; els.undo.disabled = true; render(); }
  function saveMode() { try { localStorage.setItem(MODE_KEY, MODES.has(els.mode.value) ? els.mode.value : "computer"); } catch {} applyControls(); startNewGame(); }
  function saveDifficulty() { try { localStorage.setItem(DIFFICULTY_KEY, DIFFICULTIES.has(els.difficulty.value) ? els.difficulty.value : "easy"); } catch {} }
  function applyLanguage() { if (window.LMAG_I18N) window.LMAG_I18N.apply(document); render(); }
  function preventBrowserDoubleClick(event) { const now = Date.now(); if (now - lastTapAt < 420) event.preventDefault(); lastTapAt = now; }
  function registerServiceWorker() { if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("../../sw.js").catch(() => {})); }
  els.roll.addEventListener("click", roll); els.newGame.addEventListener("click", startNewGame); els.undo.addEventListener("click", undo); els.mode.addEventListener("change", saveMode); els.difficulty.addEventListener("change", saveDifficulty);
  document.addEventListener("contextmenu", (event) => event.preventDefault()); document.addEventListener("dblclick", preventBrowserDoubleClick, { capture: true }); document.addEventListener("dragstart", (event) => event.preventDefault()); document.addEventListener("gesturestart", (event) => event.preventDefault()); document.addEventListener("gesturechange", (event) => event.preventDefault()); document.addEventListener("gestureend", (event) => event.preventDefault()); document.addEventListener("lmag:languagechange", applyLanguage);
  applyTheme(); applyControls(); state = loadState() || freshState(); render(); registerServiceWorker();
})();
