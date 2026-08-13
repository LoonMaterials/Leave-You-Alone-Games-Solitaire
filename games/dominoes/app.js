(function () {
  "use strict";
  try {
    localStorage.setItem("leave-me-alone-games-last-game", JSON.stringify({ id: "dominoes", href: "games/dominoes/index.html", title: document.querySelector("h1")?.textContent?.trim() || "dominoes", playedAt: Date.now() }));
  } catch {}
  const STORAGE_KEY = "leave-me-alone-dominoes-current-game";
  const SAVE_VERSION = 2;
  const DIFFICULTY_KEY = "leave-me-alone-dominoes-difficulty";
  const MODE_KEY = "leave-me-alone-dominoes-mode";
  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const DIFFICULTIES = new Set(["easy", "medium", "hard"]);
  const MODES = new Set(["computer", "two-player"]);
  const MAX_PIPS = 9;
  const STARTING_HAND = 10;
  const els = { opponent: document.getElementById("opponent"), chain: document.getElementById("chain"), hand: document.getElementById("hand"), handCount: document.getElementById("hand-count"), draw: document.getElementById("draw"), status: document.getElementById("status"), undo: document.getElementById("undo"), newGame: document.getElementById("new-game"), difficulty: document.getElementById("difficulty"), mode: document.getElementById("game-mode") };
  let state = null, undoSnapshot = null, lastTapAt = 0;
  function t(key, values) { return window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key; }
  function storedDifficulty() { try { const difficulty = localStorage.getItem(DIFFICULTY_KEY); return DIFFICULTIES.has(difficulty) ? difficulty : "easy"; } catch { return "easy"; } }
  function storedMode() { try { const mode = localStorage.getItem(MODE_KEY); return MODES.has(mode) ? mode : "computer"; } catch { return "computer"; } }
  function isTwoPlayer() { return storedMode() === "two-player"; }
  function applyDifficulty() { if (els.difficulty) els.difficulty.value = storedDifficulty(); }
  function saveDifficulty() { if (!els.difficulty) return; try { localStorage.setItem(DIFFICULTY_KEY, DIFFICULTIES.has(els.difficulty.value) ? els.difficulty.value : "easy"); } catch {} }
  function applyMode() { if (els.mode) els.mode.value = storedMode(); if (els.difficulty) els.difficulty.disabled = isTwoPlayer(); }
  function saveMode() { if (!els.mode) return; try { localStorage.setItem(MODE_KEY, MODES.has(els.mode.value) ? els.mode.value : "computer"); } catch {} applyMode(); startNewGame(); }
  function applyTheme() { try { const theme = localStorage.getItem(THEME_KEY); document.body.dataset.theme = THEMES.has(theme) ? theme : "colorblind"; } catch { document.body.dataset.theme = "colorblind"; } }
  function makeSet() { const tiles = []; let id = 0; for (let a = 0; a <= MAX_PIPS; a += 1) for (let b = a; b <= MAX_PIPS; b += 1) tiles.push({ id: `d${id++}`, a, b }); return shuffle(tiles); }
  function shuffle(items) { const copy = items.slice(); for (let i = copy.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; }
  function freshState() {
    const boneyard = makeSet(), player = boneyard.splice(0, STARTING_HAND), computer = boneyard.splice(0, STARTING_HAND);
    const starter = boneyard.shift();
    return { version: SAVE_VERSION, player, computer, boneyard, chain: [starter], left: starter.a, right: starter.b, turn: "p", winner: null, message: "" };
  }
  function clone(source) { return JSON.parse(JSON.stringify(source)); }
  function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function loadState() { try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); return saved?.version === SAVE_VERSION && saved?.player && saved?.computer && saved?.chain ? saved : null; } catch { return null; } }
  function canPlay(tile) { return tile.a === state.left || tile.b === state.left || tile.a === state.right || tile.b === state.right; }
  function playableSides(tile) {
    const sides = [];
    if (tile.a === state.left || tile.b === state.left) sides.push("left");
    if (tile.a === state.right || tile.b === state.right) sides.push("right");
    return sides;
  }
  function playableSide(tile) { return playableSides(tile)[0] || null; }
  function orient(tile, side) {
    if (side === "left") return tile.b === state.left ? { ...tile, a: tile.a, b: tile.b } : { ...tile, a: tile.b, b: tile.a };
    return tile.a === state.right ? { ...tile, a: tile.a, b: tile.b } : { ...tile, a: tile.b, b: tile.a };
  }
  function playTile(owner, tileId, forcedSide) {
    const hand = owner === "p" ? state.player : state.computer;
    const index = hand.findIndex((tile) => tile.id === tileId);
    if (index < 0) return false;
    const tile = hand[index];
    const sides = playableSides(tile);
    const side = forcedSide && sides.includes(forcedSide) ? forcedSide : sides[0];
    if (!side) return false;
    const placed = orient(tile, side);
    hand.splice(index, 1);
    if (side === "left") { state.chain.unshift(placed); state.left = placed.a; }
    else { state.chain.push(placed); state.right = placed.b; }
    if (!hand.length) state.winner = owner;
    return true;
  }
  function drawTile(owner) {
    if (!state.boneyard.length) return false;
    const hand = owner === "p" ? state.player : state.computer;
    hand.push(state.boneyard.shift());
    return true;
  }
  function handFor(owner) { return owner === "p" ? state.player : state.computer; }
  function noOneCanPlay() { return !state.player.some(canPlay) && !state.computer.some(canPlay) && !state.boneyard.length; }
  function settleBlockedGame() {
    if (!noOneCanPlay()) return false;
    const playerPips = state.player.reduce((sum, tile) => sum + tile.a + tile.b, 0);
    const computerPips = state.computer.reduce((sum, tile) => sum + tile.a + tile.b, 0);
    state.winner = playerPips <= computerPips ? "p" : "c";
    return true;
  }
  function finishTurn(owner) {
    if (state.winner || settleBlockedGame()) return;
    state.turn = owner === "p" ? "c" : "p";
    if (!isTwoPlayer() && state.turn === "c") window.setTimeout(computerTurn, 340);
  }
  function computerCandidates() {
    return state.computer.flatMap((tile) => playableSides(tile).map((side) => ({ tile, side })));
  }
  function sideAfter(candidate) {
    const placed = orient(candidate.tile, candidate.side);
    return candidate.side === "left" ? placed.a : placed.b;
  }
  function mediumDominoScore(candidate) {
    const exposed = sideAfter(candidate);
    const remainingHand = state.computer.filter((tile) => tile.id !== candidate.tile.id);
    const futureMatches = remainingHand.filter((tile) => tile.a === exposed || tile.b === exposed).length;
    const pipTotal = candidate.tile.a + candidate.tile.b;
    const doubleBonus = candidate.tile.a === candidate.tile.b ? 5 : 0;
    const endMatchBonus = candidate.tile.a === state.left && candidate.tile.b === state.right ? 2 : 0;
    return pipTotal + futureMatches * 3 + doubleBonus + endMatchBonus;
  }
  function hardDominoScore(candidate) {
    const exposed = sideAfter(candidate);
    const remainingHand = state.computer.filter((tile) => tile.id !== candidate.tile.id);
    const futureMatches = remainingHand.filter((tile) => tile.a === exposed || tile.b === exposed).length;
    const playerReplies = state.player.filter((tile) => tile.a === exposed || tile.b === exposed).length;
    const blocksPlayer = playerReplies === 0 ? 10 : 0;
    const keepsComputerOpen = futureMatches * 5;
    const pipTotal = candidate.tile.a + candidate.tile.b;
    const doubleBonus = candidate.tile.a === candidate.tile.b ? 4 : 0;
    const emptyHandBonus = remainingHand.length <= 2 ? pipTotal : 0;
    return pipTotal + keepsComputerOpen - playerReplies * 4 + blocksPlayer + doubleBonus + emptyHandBonus;
  }
  function chooseComputerPlay() {
    const candidates = computerCandidates();
    if (!candidates.length) return null;
    if (storedDifficulty() === "hard") {
      return candidates.slice().sort((a, b) => hardDominoScore(b) - hardDominoScore(a))[0];
    }
    if (storedDifficulty() === "medium") {
      return candidates.slice().sort((a, b) => mediumDominoScore(b) - mediumDominoScore(a))[0];
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
  function computerTurn() {
    if (isTwoPlayer() || state.winner) return;
    let play = chooseComputerPlay();
    while (!play && state.boneyard.length) { drawTile("c"); play = chooseComputerPlay(); }
    if (play) playTile("c", play.tile.id, play.side);
    state.turn = "p";
    settleBlockedGame();
    render();
  }
  function rememberUndo() { undoSnapshot = clone(state); els.undo.disabled = false; }
  function dominoEl(tile, playable) {
    const button = document.createElement("button");
    button.type = "button"; button.className = `domino${playable ? " playable" : ""}`; button.dataset.id = tile.id;
    button.setAttribute("aria-label", t("dominoTile", { left: tile.a, right: tile.b }));
    const left = pipSide(tile.a);
    const right = pipSide(tile.b);
    button.append(left, right);
    return button;
  }
  function pipSide(count) {
    const side = document.createElement("span");
    side.className = `pips pips-${count}`;
    side.setAttribute("aria-label", String(count));
    for (let index = 1; index <= 9; index += 1) {
      const pip = document.createElement("span");
      pip.className = "pip";
      pip.dataset.pos = String(index);
      side.appendChild(pip);
    }
    return side;
  }
  function render() {
    els.chain.innerHTML = ""; els.hand.innerHTML = "";
    const activeOwner = isTwoPlayer() ? state.turn : "p";
    const activeHand = handFor(activeOwner);
    state.chain.forEach((tile) => els.chain.appendChild(dominoEl(tile, false)));
    activeHand.forEach((tile) => { const el = dominoEl(tile, canPlay(tile)); el.disabled = (!isTwoPlayer() && state.turn !== "p") || !canPlay(tile) || Boolean(state.winner); el.addEventListener("click", onTileClick); els.hand.appendChild(el); });
    els.draw.disabled = (!isTwoPlayer() && state.turn !== "p") || Boolean(state.winner) || activeHand.some(canPlay) || (!state.boneyard.length && noOneCanPlay());
    els.opponent.textContent = isTwoPlayer() ? t("dominoesLocalCounts", { player1: state.player.length, player2: state.computer.length, boneyard: state.boneyard.length }) : t("dominoesOpponent", { count: state.computer.length, boneyard: state.boneyard.length });
    if (els.handCount) els.handCount.textContent = isTwoPlayer() ? t(activeOwner === "p" ? "player1Tiles" : "player2Tiles", { count: activeHand.length }) : t("dominoesYourTiles", { count: state.player.length });
    els.status.textContent = state.winner ? isTwoPlayer() ? t(state.winner === "p" ? "player1Won" : "player2Won") : t(state.winner === "p" ? "youWon" : "computerWon") : activeHand.some(canPlay) ? (isTwoPlayer() ? t(activeOwner === "p" ? "player1Turn" : "player2Turn") : t("yourTurn")) : state.boneyard.length ? t("dominoesDrawPrompt") : t("dominoesPassPrompt");
    saveState();
  }
  function onTileClick(event) {
    if ((!isTwoPlayer() && state.turn !== "p") || state.winner) return;
    rememberUndo();
    const owner = isTwoPlayer() ? state.turn : "p";
    if (playTile(owner, event.currentTarget.dataset.id)) { finishTurn(owner); render(); }
    else render();
  }
  function drawForPlayer() {
    if ((!isTwoPlayer() && state.turn !== "p") || state.winner) return;
    const owner = isTwoPlayer() ? state.turn : "p";
    const hand = handFor(owner);
    if (hand.some(canPlay)) return;
    rememberUndo();
    if (state.boneyard.length) drawTile(owner);
    else finishTurn(owner);
    render();
  }
  function startNewGame() { state = freshState(); undoSnapshot = null; els.undo.disabled = true; render(); }
  function undo() { if (!undoSnapshot) return; state = clone(undoSnapshot); undoSnapshot = null; els.undo.disabled = true; render(); }
  function preventBrowserDoubleClick(event) { const now = Date.now(); if (now - lastTapAt < 420) event.preventDefault(); lastTapAt = now; }
  function preventViewportMove(event) { if (!event.target.closest(".hand, .chain")) event.preventDefault(); }
  function preventGestureZoom(event) { event.preventDefault(); }
  function applyLanguage() { if (window.LMAG_I18N) window.LMAG_I18N.apply(document); render(); }
  function registerServiceWorker() { if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("../../sw.js").catch(() => {})); }
  els.newGame.addEventListener("click", startNewGame); els.undo.addEventListener("click", undo); els.draw.addEventListener("click", drawForPlayer); if (els.difficulty) els.difficulty.addEventListener("change", saveDifficulty); if (els.mode) els.mode.addEventListener("change", saveMode);
  document.addEventListener("contextmenu", (event) => event.preventDefault()); document.addEventListener("dblclick", preventBrowserDoubleClick, { capture: true }); document.addEventListener("dragstart", (event) => event.preventDefault()); document.addEventListener("touchmove", preventViewportMove, { passive: false }); document.addEventListener("gesturestart", preventGestureZoom); document.addEventListener("gesturechange", preventGestureZoom); document.addEventListener("gestureend", preventGestureZoom); document.addEventListener("lmag:languagechange", applyLanguage);
  applyTheme(); applyDifficulty(); applyMode(); state = loadState() || freshState(); render(); registerServiceWorker();
})();
