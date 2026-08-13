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
  const { rules, node } = loadGame("rummy", "{ isMeld, bestPartition, handIsMeldable, finishLastCardShowdown, newGame, getState: () => state, setState: (value) => { state = value; } }");
  expect(rules.getState().hands.every((hand) => hand.length === 7), "Rummy must deal seven cards.");
  expect(rules.isMeld([card(14, "S"), card(2, "S"), card(3, "S")]), "Rummy must accept A-2-3 as a run.");
  expect(!rules.isMeld([card(12, "S"), card(13, "S"), card(14, "S")]), "Rummy must not accept Q-K-A as a run.");
  const perfect = [card(2, "H"), card(3, "H"), card(4, "H"), card(7, "S"), card(7, "H"), card(7, "D"), card(7, "C")];
  expect(rules.handIsMeldable(perfect), "Rummy must allow an opening perfect seven-card hand to go out.");
  expect(rules.bestPartition(perfect).used === 7, "Rummy meld partition must use every card in a perfect hand.");
  node("player-count").value = "4"; rules.newGame();
  expect(rules.getState().hands.length === 4 && rules.getState().hands.every((hand) => hand.length === 7), "Four-player Rummy must keep seven-card hands.");
  rules.setState({ hands: [[card(10, "S")], [card(4, "D")]], melds: [], winner: null, score: [0, 0], aiPending: false });
  expect(rules.finishLastCardShowdown(), "Rummy must end when every player is down to one unusable card.");
  expect(rules.getState().winner === 1, "The lowest last card must win Rummy's last-card showdown.");
}

{
  const { rules, node } = loadGame("gin-rummy", "{ isMeld, bestPartition, newGame, getState: () => state }");
  expect(rules.getState().hands.every((hand) => hand.length === 10), "Two-player Gin Rummy must deal ten cards.");
  expect(rules.isMeld([card(14, "D"), card(2, "D"), card(3, "D")]), "Gin Rummy must accept A-2-3 as a run.");
  expect(!rules.isMeld([card(12, "D"), card(13, "D"), card(14, "D")]), "Gin Rummy must not accept Q-K-A as a run.");
  const hand = [card(14, "S"), card(2, "S"), card(3, "S"), card(4, "S"), card(5, "S"), card(7, "S"), card(7, "H"), card(7, "D"), card(7, "C"), card(13, "H")];
  const partition = rules.bestPartition(hand);
  expect(partition.used === 9 && partition.deadwood === 10, "Gin Rummy must keep melds in hand and calculate deadwood independently.");
  node("player-count").value = "3"; rules.newGame();
  expect(rules.getState().hands.length === 3 && rules.getState().hands.every((cards) => cards.length === 7), "Three-player Gin Rummy must deal seven cards.");
}

{
  const { rules, node } = loadGame("hearts", "{ newGame, legalCards, points, getState: () => state, setState: (value) => { state = value; } }");
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
}

{
  const { rules, source } = loadGame("83-maines-card-game", "{ makeDeck, isTrump, pointValue, trumpWeight, legalCards, trickWinner, playCard, repairOverplayedTrick, getState: () => state, setState: (value) => { state = value; } }");
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
}

console.log("Deterministic Rummy, Gin Rummy, Hearts, and 83 rule checks passed.");
