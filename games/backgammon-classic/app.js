(function () {
  "use strict";
  try {
    localStorage.setItem("leave-me-alone-games-last-game", JSON.stringify({ id: "backgammon-classic", href: "games/backgammon-classic/index.html", title: document.querySelector("h1")?.textContent?.trim() || "backgammon-classic", playedAt: Date.now() }));
  } catch {}
  const STORAGE_KEY = "leave-me-alone-backgammon-classic-current-game";
  const DIFFICULTY_KEY = "leave-me-alone-backgammon-classic-difficulty";
  const MODE_KEY = "leave-me-alone-backgammon-classic-mode";
  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const DIFFICULTIES = new Set(["easy", "medium", "hard"]);
  const MODES = new Set(["computer", "two-player"]);
  const POINTS = 24, TOTAL = 15;
  const els = { track: document.getElementById("track"), status: document.getElementById("status"), roll: document.getElementById("roll"), undo: document.getElementById("undo"), newGame: document.getElementById("new-game"), difficulty: document.getElementById("difficulty"), mode: document.getElementById("game-mode"), playerBar: document.getElementById("player-bar"), computerBar: document.getElementById("computer-bar"), playerOff: document.getElementById("player-off"), computerOff: document.getElementById("computer-off") };
  let state = null, undoSnapshot = null, selected = null, lastTapAt = 0;
  function t(key, values) { return window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key; }
  function storedDifficulty() { try { const difficulty = localStorage.getItem(DIFFICULTY_KEY); return DIFFICULTIES.has(difficulty) ? difficulty : "easy"; } catch { return "easy"; } }
  function storedMode() { try { const mode = localStorage.getItem(MODE_KEY); return MODES.has(mode) ? mode : "computer"; } catch { return "computer"; } }
  function isTwoPlayer() { return storedMode() === "two-player"; }
  function applyDifficulty() { if (els.difficulty) els.difficulty.value = storedDifficulty(); }
  function saveDifficulty() { if (!els.difficulty) return; try { localStorage.setItem(DIFFICULTY_KEY, DIFFICULTIES.has(els.difficulty.value) ? els.difficulty.value : "easy"); } catch {} }
  function applyMode() { if (els.mode) els.mode.value = storedMode(); if (els.difficulty) els.difficulty.disabled = isTwoPlayer(); }
  function saveMode() { if (!els.mode) return; try { localStorage.setItem(MODE_KEY, MODES.has(els.mode.value) ? els.mode.value : "computer"); } catch {} applyMode(); startNewGame(); }
  function applyTheme() { try { const theme = localStorage.getItem(THEME_KEY); document.body.dataset.theme = THEMES.has(theme) ? theme : "colorblind"; } catch { document.body.dataset.theme = "colorblind"; } }
  function freshState() {
    const points = Array.from({ length: POINTS }, () => ({ p: 0, c: 0 }));
    points[23].p = 2; points[12].p = 5; points[7].p = 3; points[5].p = 5;
    points[0].c = 2; points[11].c = 5; points[16].c = 3; points[18].c = 5;
    return { points, playerBar: 0, computerBar: 0, playerOff: 0, computerOff: 0, turn: "p", dice: [], winner: null };
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function loadState() { try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); return saved?.points?.length === POINTS ? saved : null; } catch { return null; } }
  function rollDice() { const a = 1 + Math.floor(Math.random() * 6), b = 1 + Math.floor(Math.random() * 6); state.dice = a === b ? [a, a, a, a] : [a, b]; }
  function ownerCount(point, owner) { return owner === "p" ? point.p : point.c; }
  function opponentCount(point, owner) { return owner === "p" ? point.c : point.p; }
  function barKey(owner) { return owner === "p" ? "playerBar" : "computerBar"; }
  function offKey(owner) { return owner === "p" ? "playerOff" : "computerOff"; }
  function direction(owner) { return owner === "p" ? -1 : 1; }
  function entryPoint(owner, die) { return owner === "p" ? POINTS - die : die - 1; }
  function targetPoint(owner, from, die) { return from + direction(owner) * die; }
  function isOpen(owner, to, s = state) { return to < 0 || to >= POINTS || opponentCount(s.points[to], owner) <= 1; }
  function allInHome(owner, s = state) {
    if (s[barKey(owner)] > 0) return false;
    const low = owner === "p" ? 0 : 18, high = owner === "p" ? 5 : 23;
    return s.points.every((point, index) => ownerCount(point, owner) === 0 || (index >= low && index <= high));
  }
  function canBearOff(owner, from, die, s = state) {
    if (!allInHome(owner, s)) return false;
    const to = targetPoint(owner, from, die);
    if (owner === "p") {
      if (to === -1) return true;
      if (to < -1) return !s.points.some((point, index) => index > from && ownerCount(point, owner) > 0);
    } else {
      if (to === POINTS) return true;
      if (to > POINTS) return !s.points.some((point, index) => index < from && ownerCount(point, owner) > 0);
    }
    return false;
  }
  function legalMovesFor(owner, s = state) {
    if (s.winner || s.turn !== owner || !s.dice.length) return [];
    const moves = [];
    s.dice.forEach((die, dieIndex) => {
      if (s[barKey(owner)] > 0) {
        const to = entryPoint(owner, die);
        if (isOpen(owner, to, s)) moves.push({ from: "bar", to, dieIndex, die });
        return;
      }
      s.points.forEach((point, from) => {
        if (ownerCount(point, owner) <= 0) return;
        const to = targetPoint(owner, from, die);
        if (to >= 0 && to < POINTS && isOpen(owner, to, s)) moves.push({ from, to, dieIndex, die });
        else if ((to < 0 || to >= POINTS) && canBearOff(owner, from, die, s)) moves.push({ from, to: "off", dieIndex, die });
      });
    });
    return moves;
  }
  function applyMove(s, owner, move) {
    const next = clone(s);
    const opp = owner === "p" ? "c" : "p";
    if (move.from === "bar") next[barKey(owner)] -= 1;
    else next.points[move.from][owner] -= 1;
    if (move.to === "off") next[offKey(owner)] += 1;
    else {
      if (next.points[move.to][opp] === 1) { next.points[move.to][opp] = 0; next[barKey(opp)] += 1; }
      next.points[move.to][owner] += 1;
    }
    next.dice.splice(move.dieIndex, 1);
    if (next[offKey(owner)] >= TOTAL) next.winner = owner;
    return next;
  }
  function canMove(owner) { return legalMovesFor(owner).length > 0; }
  function rememberUndo() { undoSnapshot = clone(state); els.undo.disabled = false; }
  function finishPlayerIfNeeded() {
    if (state.winner) return;
    const owner = state.turn;
    if (!state.dice.length || !canMove(owner)) {
      state.turn = owner === "p" ? "c" : "p";
      state.dice = [];
      selected = null;
      render();
      if (!isTwoPlayer() && state.turn === "c") window.setTimeout(computerTurn, 360);
    }
  }
  function movePlayer(move) { state = applyMove(state, state.turn, move); selected = null; render(); finishPlayerIfNeeded(); }
  function legalComputerSequences(s) {
    const moves = legalMovesFor("c", s);
    if (!moves.length || !s.dice.length || s.winner) return [{ state: clone(s), moves: [] }];
    return moves.flatMap((move) => legalComputerSequences(applyMove(s, "c", move)).map((seq) => ({ state: seq.state, moves: [move].concat(seq.moves) })));
  }
  function computerTurn() {
    if (isTwoPlayer() || state.winner) return;
    if (!state.dice.length) rollDice();
    while (state.dice.length && !state.winner) {
      const moves = legalMovesFor("c");
      if (!moves.length) break;
      if (storedDifficulty() === "hard") {
        const sequences = legalComputerSequences(state);
        sequences.sort((a, b) => evaluate(b.state) - evaluate(a.state));
        state = sequences[0].state;
        break;
      }
      const move = chooseComputerMove(moves);
      state = applyMove(state, "c", move);
    }
    state.turn = "p"; state.dice = []; selected = null; render();
  }
  function chooseComputerMove(moves) {
    if (storedDifficulty() === "easy") return moves[Math.floor(Math.random() * moves.length)];
    const scored = moves.map((move) => ({ move, score: moveScore(state, "c", move) + Math.random() * .25 }));
    scored.sort((a, b) => b.score - a.score);
    return scored[0].move;
  }
  function moveScore(s, owner, move) {
    const after = applyMove(s, owner, move);
    let score = evaluate(after) - evaluate(s);
    if (move.to === "off") score += 80;
    if (move.to !== "off" && move.to !== "bar" && opponentCount(s.points[move.to], owner) === 1) score += 55;
    if (move.to !== "off" && after.points[move.to][owner] >= 2) score += 18;
    return score;
  }
  function pipCount(s, owner) {
    let total = s[barKey(owner)] * 25;
    s.points.forEach((point, index) => {
      const distance = owner === "p" ? index + 1 : POINTS - index;
      total += ownerCount(point, owner) * distance;
    });
    return total;
  }
  function blots(s, owner) { return s.points.filter((point) => ownerCount(point, owner) === 1).length; }
  function madePoints(s, owner) { return s.points.filter((point) => ownerCount(point, owner) >= 2).length; }
  function evaluate(s) {
    return (pipCount(s, "p") - pipCount(s, "c")) * 4 +
      (s.computerOff - s.playerOff) * 90 +
      (s.playerBar - s.computerBar) * 120 +
      (madePoints(s, "c") - madePoints(s, "p")) * 18 -
      (blots(s, "c") - blots(s, "p")) * 16;
  }
  function renderPieces(container, owner, count) {
    for (let i = 0; i < Math.min(count, 5); i += 1) { const checker = document.createElement("span"); checker.className = `checker ${owner === "p" ? "player" : "computer"}`; container.appendChild(checker); }
    if (count > 5) container.appendChild(document.createTextNode(`+${count - 5}`));
  }
  function renderSideButton(button, label, owner, count, legal) {
    button.innerHTML = `<span>${label}</span>`;
    renderPieces(button, owner, count);
    button.classList.toggle("legal", Boolean(legal));
  }
  function render() {
    els.track.innerHTML = "";
    const legal = selected == null ? [] : legalMovesFor(state.turn).filter((move) => move.from === selected);
    const legalPointSet = new Set(legal.filter((move) => move.to !== "off").map((move) => String(move.to)));
    const legalOff = legal.some((move) => move.to === "off");
    for (let index = POINTS - 1; index >= 0; index -= 1) {
      const point = document.createElement("button");
      point.type = "button"; point.className = `point ${index < 12 ? "bottom" : "top"}`; point.dataset.index = String(index);
      if (selected === index || legalPointSet.has(String(index))) point.classList.add("legal");
      point.setAttribute("aria-label", t("backgammonPoint", { point: index + 1 }));
      const label = document.createElement("span"); label.className = "point-label"; label.textContent = String(index + 1); point.appendChild(label);
      const p = state.points[index].p, c = state.points[index].c;
      renderPieces(point, p ? "p" : "c", p || c);
      point.addEventListener("click", onPointClick);
      els.track.appendChild(point);
    }
    renderSideButton(els.playerBar, t("backgammonBar", { count: state.playerBar }), "p", state.playerBar, state.turn === "p" && selected === "bar");
    renderSideButton(els.computerBar, t("backgammonComputerBar", { count: state.computerBar }), "c", state.computerBar, state.turn === "c" && selected === "bar");
    renderSideButton(els.playerOff, t("backgammonPlayerOff", { count: state.playerOff }), "p", state.playerOff, state.turn === "p" && legalOff);
    renderSideButton(els.computerOff, t("backgammonComputerOff", { count: state.computerOff }), "c", state.computerOff, state.turn === "c" && legalOff);
    els.roll.disabled = (!isTwoPlayer() && state.turn !== "p") || state.winner || state.dice.length > 0;
    els.status.textContent = state.winner ? isTwoPlayer() ? t(state.winner === "p" ? "player1Won" : "player2Won") : t(state.winner === "p" ? "youWon" : "computerWon") : state.dice.length ? t("diceShowing", { dice: state.dice.join(", ") }) : isTwoPlayer() ? t(state.turn === "p" ? "player1RollPrompt" : "player2RollPrompt") : t("rollDicePrompt");
    saveState();
  }
  function onPointClick(event) {
    if ((!isTwoPlayer() && state.turn !== "p") || state.winner || !state.dice.length) return;
    const index = Number(event.currentTarget.dataset.index);
    if (selected != null) {
      const move = legalMovesFor(state.turn).find((item) => item.from === selected && item.to === index);
      if (move) { rememberUndo(); movePlayer(move); return; }
    }
    if (state[barKey(state.turn)] > 0) { selected = "bar"; render(); return; }
    selected = ownerCount(state.points[index], state.turn) ? index : null;
    render();
  }
  function onOffClick() {
    if (selected == null) return;
    const move = legalMovesFor(state.turn).find((item) => item.from === selected && item.to === "off");
    if (move) { rememberUndo(); movePlayer(move); }
  }
  function onBarClick(owner) { if (state.turn === owner && state[barKey(owner)] > 0 && state.dice.length) { selected = "bar"; render(); } }
  function roll() { if ((!isTwoPlayer() && state.turn !== "p") || state.winner || state.dice.length) return; rememberUndo(); rollDice(); if (!canMove(state.turn)) { state.turn = state.turn === "p" ? "c" : "p"; state.dice = []; if (!isTwoPlayer() && state.turn === "c") window.setTimeout(computerTurn, 360); } render(); }
  function startNewGame() { state = freshState(); selected = null; undoSnapshot = null; els.undo.disabled = true; render(); }
  function undo() { if (!undoSnapshot) return; state = clone(undoSnapshot); selected = null; undoSnapshot = null; els.undo.disabled = true; render(); }
  function preventBrowserDoubleClick(event) { const now = Date.now(); if (now - lastTapAt < 420) event.preventDefault(); lastTapAt = now; }
  function preventViewportMove(event) { event.preventDefault(); }
  function preventGestureZoom(event) { event.preventDefault(); }
  function applyLanguage() { if (window.LMAG_I18N) window.LMAG_I18N.apply(document); render(); }
  function registerServiceWorker() { if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("../../sw.js").catch(() => {})); }
  els.roll.addEventListener("click", roll); els.newGame.addEventListener("click", startNewGame); els.undo.addEventListener("click", undo); els.playerOff.addEventListener("click", onOffClick); els.computerOff.addEventListener("click", onOffClick); els.playerBar.addEventListener("click", () => onBarClick("p")); els.computerBar.addEventListener("click", () => onBarClick("c")); if (els.difficulty) els.difficulty.addEventListener("change", saveDifficulty); if (els.mode) els.mode.addEventListener("change", saveMode);
  document.addEventListener("contextmenu", e => e.preventDefault()); document.addEventListener("dblclick", preventBrowserDoubleClick, { capture: true }); document.addEventListener("dragstart", e => e.preventDefault()); document.addEventListener("touchmove", preventViewportMove, { passive: false }); document.addEventListener("gesturestart", preventGestureZoom); document.addEventListener("gesturechange", preventGestureZoom); document.addEventListener("gestureend", preventGestureZoom); document.addEventListener("lmag:languagechange", applyLanguage);
  applyTheme(); applyDifficulty(); applyMode(); state = loadState() || freshState(); render(); registerServiceWorker();
})();
