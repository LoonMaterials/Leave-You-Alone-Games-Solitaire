const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

function element() {
  return {
    checked: false,
    classList: { add() {}, remove() {}, toggle() {} },
    className: "",
    dataset: {},
    disabled: false,
    hidden: false,
    innerHTML: "",
    parentElement: null,
    textContent: "",
    value: "2",
    addEventListener() {},
    appendChild(child) { child.parentElement = this; return child; },
    insertBefore(child) { child.parentElement = this; return child; },
    querySelectorAll() { return []; },
    remove() {}
  };
}

function loadGame(game, exportExpression) {
  const file = path.join(root, "games", game, "app.js");
  const source = fs.readFileSync(file, "utf8");
  const nodes = new Map();
  const node = (id) => {
    if (!nodes.has(id)) nodes.set(id, element());
    return nodes.get(id);
  };
  node("difficulty").value = "medium";
  node("player-count").value = "2";
  node("bid-value").value = "30";
  node("target-score").value = ({ rummy: "250", "gin-rummy": "100", hearts: "100", spades: "500", cribbage: "121", "83-maines-card-game": "200" })[game] || "250";
  node("custom-target").value = "250";
  const instrumented = source.replace(
    /\n\}\)\(\);\s*$/,
    `\n  globalThis.__gameRules = ${exportExpression};\n})();`
  );
  if (instrumented === source) throw new Error(`Could not instrument ${game}.`);
  const context = {
    console,
    document: {
      body: element(),
      createElement: element,
      getElementById: node,
      querySelector() { return element(); }
    },
    globalThis: null,
    localStorage: { getItem() { return null; }, setItem() {} },
    navigator: {},
    window: { addEventListener() {}, setTimeout() {} }
  };
  context.globalThis = context;
  vm.runInNewContext(instrumented, context, { filename: file });
  return { rules: context.__gameRules, node, source };
}

function card(rank, suit) { return { id: `${suit}${rank}`, rank, suit }; }
function joker() { return { id: "JOKER", rank: 0, suit: "J", joker: true }; }
function expect(condition, label) { if (!condition) throw new Error(label); }
function ids(cards) { return cards.map((item) => item.id).sort().join(","); }

{
  const { rules, node } = loadGame("rummy", "{ isMeld, bestPartition, handIsMeldable, finishLastCardShowdown, newGame, nextDeal, goOut, drawFromStock, drawFromDiscard, discardSelected, aiTurn, getState: () => state, setState: (value) => { state = value; } }");
  expect(rules.getState().hands.every((hand) => hand.length === 7), "Rummy must deal seven cards.");
  expect(rules.isMeld([card(14, "S"), card(2, "S"), card(3, "S")]), "Rummy must accept A-2-3 as a run.");
  expect(!rules.isMeld([card(12, "S"), card(13, "S"), card(14, "S")]), "Rummy must not accept Q-K-A as a run.");
  const perfect = [card(2, "H"), card(3, "H"), card(4, "H"), card(7, "S"), card(7, "H"), card(7, "D"), card(7, "C")];
  expect(rules.handIsMeldable(perfect), "Rummy must allow an opening perfect seven-card hand to go out.");
  expect(rules.bestPartition(perfect).used === 7, "Rummy meld partition must use every card in a perfect hand.");
  node("player-count").value = "4"; rules.newGame();
  expect(rules.getState().hands.length === 4 && rules.getState().hands.every((hand) => hand.length === 7), "Four-player Rummy must keep seven-card hands.");
  rules.setState({ hands: [[card(10, "S")], [card(4, "D")]], melds: [], winner: null, score: [0, 0], targetScore: 250, phase: "playing", handPoints: 0, aiPending: false });
  expect(rules.finishLastCardShowdown(), "Rummy must end when every player is down to one unusable card.");
  expect(rules.getState().winner === 1, "The lowest last card must win Rummy's last-card showdown.");

  node("player-count").value = "2"; rules.newGame();
  const endingState = rules.getState();
  endingState.computer = false;
  endingState.revealedPlayer = 0;
  endingState.hands[0] = perfect;
  endingState.hands[1] = [card(13, "S"), card(12, "D")];
  endingState.targetScore = 250;
  rules.goOut();
  expect(endingState.phase === "hand-over" && endingState.winner === 0, "Going out must immediately place Rummy in hand-over state.");
  expect(endingState.handPoints === 20 && endingState.score[0] === 20, "A finished Rummy hand must score the opponents' unmelded cards exactly once.");
  expect(!node("result-panel").hidden && !node("next-deal").hidden && node("draw-card").disabled, "A completed Rummy hand must show Next Deal while disabling turn actions.");
  const frozenStock = endingState.stock.length;
  const frozenDiscard = ids(endingState.discard);
  const frozenHands = endingState.hands.map(ids).join("|");
  endingState.drawn = true;
  endingState.selected = endingState.hands[1].length ? [endingState.hands[1][0].id] : [];
  endingState.active = 1;
  endingState.computer = true;
  rules.drawFromStock(); rules.drawFromDiscard(); rules.discardSelected(); rules.aiTurn();
  expect(endingState.stock.length === frozenStock && ids(endingState.discard) === frozenDiscard && endingState.hands.map(ids).join("|") === frozenHands, "No human or computer action may change cards after a Rummy hand ends.");
  endingState.computer = false;
  expect(rules.nextDeal(), "Next Deal must begin after a completed hand.");
  expect(rules.getState().phase === "playing" && rules.getState().score[0] === 20, "Next Deal must preserve match scores and return to playing state.");
  expect(rules.getState().hands.every((hand) => hand.length === 7), "Every continued Rummy deal must start with seven-card hands.");

  rules.newGame();
  const matchState = rules.getState();
  matchState.computer = false;
  matchState.revealedPlayer = 0;
  matchState.hands[0] = perfect;
  matchState.hands[1] = [card(13, "S")];
  matchState.targetScore = 10;
  rules.goOut();
  expect(matchState.phase === "match-over" && matchState.score[0] === 10, "Reaching the selected Rummy target must end the match.");
  expect(node("next-deal").hidden && !node("result-panel").hidden, "A completed Rummy match must hide Next Deal and keep the result visible.");
  expect(!rules.nextDeal(), "Next Deal must be unavailable after the Rummy match target is reached.");
}

{
  const { rules, node } = loadGame("gin-rummy", "{ isMeld, bestPartition, newGame, nextDeal, roundResult, getState: () => state }");
  expect(rules.getState().hands.every((hand) => hand.length === 10), "Two-player Gin Rummy must deal ten cards.");
  expect(rules.isMeld([card(14, "D"), card(2, "D"), card(3, "D")]), "Gin Rummy must accept A-2-3 as a run.");
  expect(!rules.isMeld([card(12, "D"), card(13, "D"), card(14, "D")]), "Gin Rummy must not accept Q-K-A as a run.");
  const hand = [card(14, "S"), card(2, "S"), card(3, "S"), card(4, "S"), card(5, "S"), card(7, "S"), card(7, "H"), card(7, "D"), card(7, "C"), card(13, "H")];
  const partition = rules.bestPartition(hand);
  expect(partition.used === 9 && partition.deadwood === 10, "Gin Rummy must keep melds in hand and calculate deadwood independently.");
  node("player-count").value = "3"; rules.newGame();
  expect(rules.getState().hands.length === 3 && rules.getState().hands.every((cards) => cards.length === 7), "Three-player Gin Rummy must deal seven cards.");
  node("player-count").value = "2"; rules.newGame();
  const ginMatch = rules.getState(); ginMatch.computer = false; ginMatch.targetScore = 50; ginMatch.scores = [49, 0];
  const ginHand = [card(14, "S"), card(2, "S"), card(3, "S"), card(4, "H"), card(5, "H"), card(6, "H"), card(9, "S"), card(9, "H"), card(9, "D"), card(9, "C")];
  ginMatch.hands = [ginHand, [card(13, "D")]]; rules.roundResult(0, ginHand);
  expect(ginMatch.matchOver && ginMatch.scores[0] >= 50, "Gin Rummy must end the match when a hand reaches the selected target.");
  expect(!rules.nextDeal(), "Gin Rummy must not deal again after the match target is reached.");
}

{
  const { rules, node } = loadGame("hearts", "{ newGame, nextDeal, finishTrick, legalCards, points, getState: () => state, setState: (value) => { state = value; } }");
  node("player-count").value = "3"; rules.newGame();
  const dealt = rules.getState().hands.flat();
  expect(dealt.length === 51, "Three-player Hearts must deal 17 cards each.");
  expect(!dealt.some((item) => item.id === "D2"), "Three-player Hearts must remove the 2 of diamonds.");
  expect(dealt.reduce((total, item) => total + rules.points(item), 0) === 26, "Three-player Hearts must keep all 26 penalty points in play.");
  expect(rules.getState().active === 0 && rules.getState().hands[0].some((item) => item.id === "C2"), "Local two- and three-player Hearts must begin with Player 1 holding and leading the 2 of clubs.");
  rules.setState({ hands: [[card(2, "C"), card(3, "C"), card(2, "H")]], trick: [], trickCount: 0, heartsBroken: false });
  expect(ids(rules.legalCards(0)) === "C2", "The 2 of clubs must be the only legal opening lead.");
  rules.setState({ hands: [[card(2, "H"), card(12, "S"), card(5, "D")]], trick: [{ player: 1, card: card(2, "C") }], trickCount: 0, heartsBroken: false });
  expect(ids(rules.legalCards(0)) === "D5", "A player void in clubs must avoid penalty cards on the first trick when possible.");
  rules.setState({ hands: [[card(2, "H"), card(3, "C")]], trick: [], trickCount: 1, heartsBroken: false });
  expect(ids(rules.legalCards(0)) === "C3", "Hearts cannot be led before they are broken while another suit is available.");
  node("player-count").value = "4"; rules.newGame();
  const heartsMatch = rules.getState(); heartsMatch.scores = [49, 10, 20, 30]; heartsMatch.matchScores = heartsMatch.scores.slice(); heartsMatch.targetScore = 50; heartsMatch.dealPoints = [0, 0, 0, 0]; heartsMatch.hands = [[], [], [], []]; heartsMatch.trick = [{ player: 0, card: card(2, "H") }, { player: 1, card: card(2, "C") }, { player: 2, card: card(3, "C") }, { player: 3, card: card(4, "C") }]; heartsMatch.phase = "play"; heartsMatch.complete = false;
  rules.finishTrick();
  expect(heartsMatch.matchOver && heartsMatch.matchWinner === 1, "Hearts must end at the selected limit and award the match to the unique lowest score.");
  expect(!rules.nextDeal(), "Hearts must not deal again after a match winner is determined.");
}

{
  const { rules } = loadGame("spades", "{ newGame, nextDeal, finishDeal, getState: () => state }");
  const spadesMatch = rules.getState(); spadesMatch.targetScore = 250; spadesMatch.scores = [240, 0]; spadesMatch.bids = [1, 1, 1, 1]; spadesMatch.tricks = [3, 3, 4, 3]; spadesMatch.bags = [0, 0];
  rules.finishDeal();
  expect(spadesMatch.matchOver && spadesMatch.matchWinner === 0, "Spades must end when one partnership reaches the selected target with the high score.");
  expect(!rules.nextDeal(), "Spades must not deal again after the partnership match ends.");
}

{
  const { rules, source } = loadGame("83-maines-card-game", "{ makeDeck, isTrump, pointValue, trumpWeight, legalCards, trickWinner, playCard, repairOverplayedTrick, startMatch, finishRound, nextDeal, getState: () => state, setState: (value) => { state = value; } }");
  const deck = rules.makeDeck();
  expect(deck.length === 53, "83 must use a standard deck plus one joker.");
  expect(deck.reduce((total, item) => total + rules.pointValue(item, "H"), 0) === 83, "83's scoring trumps must total exactly 83 points.");
  expect(rules.isTrump(card(5, "D"), "H"), "The off-five of the same color must be trump.");
  expect(rules.trumpWeight(card(5, "H"), "H") > rules.trumpWeight(card(5, "D"), "H"), "The main trump five must outrank the off-five.");
  expect(rules.trumpWeight(card(5, "D"), "H") > rules.trumpWeight(card(4, "H"), "H"), "The off-five must outrank trump four.");
  expect(rules.trumpWeight(joker(), "H") < rules.trumpWeight(card(2, "H"), "H"), "The joker must be the lowest trump.");
  rules.setState({ trump: "H", trick: [{ player: 3, card: card(10, "D") }], hands: [[card(7, "D"), card(3, "H"), card(7, "C")]] });
  expect(ids(rules.legalCards(0)) === "D7,H3", "After a plain-suit lead, 83 must allow either that suit or trump.");
  rules.setState({ trump: "H", trick: [{ player: 3, card: card(10, "D") }], hands: [[card(7, "S"), card(3, "H"), card(7, "C")]] });
  expect(ids(rules.legalCards(0)) === "C7,H3,S7", "Without the led plain suit, any card must be legal in 83.");
  rules.setState({ trump: "H", trick: [{ player: 3, card: card(10, "H") }], hands: [[card(7, "S"), card(3, "H"), card(5, "D")]] });
  expect(ids(rules.legalCards(0)) === "D5,H3", "A trump lead must be followed with trump when possible.");
  const fullTrick = [{ player: 0, card: card(2, "C") }, { player: 1, card: card(3, "C") }, { player: 2, card: card(4, "C") }, { player: 3, card: card(6, "C") }];
  rules.setState({ phase: "play", active: 2, computer: true, trick: fullTrick, hands: [[], [], [card(14, "C")], []], trump: "H" });
  rules.playCard({ id: "C14", player: 2 });
  expect(rules.getState().hands[2].length === 1 && rules.getState().trick.length === 4, "83 must never let an AI play a fifth card into a completed trick.");
  const corrupted = { phase: "play", trick: fullTrick.concat([{ player: 2, card: card(14, "C") }, { player: 2, card: card(13, "C") }]), hands: [[], [], [], []] };
  rules.repairOverplayedTrick(corrupted);
  expect(corrupted.trick.length === 4 && ids(corrupted.hands[2]) === "C13,C14", "83 must repair a previously saved overplayed trick by returning excess cards to their owner.");
  expect(source.includes("? state.teamPoints[bidderTeam] : -state.highest.value"), "A set bidding team must lose its bid amount.");
  expect(source.includes("made ? 166 : -166"), "83 Double must score plus or minus 166.");
  rules.startMatch(); rules.setState({ ...rules.getState(), scores: [99, 0], targetScore: 100, teamPoints: [30, 0], teamTricks: [1, 0], highest: { bidder: 0, value: 30, doubled: false }, roundResult: null, phase: "play" });
  rules.finishRound();
  expect(rules.getState().phase === "game-over", "83 must end when one partnership reaches the selected target.");
  expect(!rules.nextDeal(), "83 must not deal again after the partnership match ends.");
}

console.log("Deterministic Rummy, Gin Rummy, Hearts, Spades, and 83 rule and match checks passed.");
