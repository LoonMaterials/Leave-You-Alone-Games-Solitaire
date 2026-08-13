const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const file = path.join(root, "games", "cribbage", "app.js");
const source = fs.readFileSync(file, "utf8");

function element() {
  return {
    checked: false,
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

const nodes = new Map();
function node(id) {
  if (!nodes.has(id)) nodes.set(id, element());
  return nodes.get(id);
}
node("difficulty").value = "medium";
node("player-count").value = "2";
const scorebar = element();

const instrumented = source.replace(
  /\n\}\)\(\);\s*$/,
  "\n  globalThis.__cribbageScoring = { scoreHand, scorePeg };\n})();"
);
if (instrumented === source) throw new Error("Could not instrument Cribbage scoring functions.");

const context = {
  console,
  document: {
    body: element(),
    createElement: element,
    getElementById: node,
    querySelector(selector) { return selector === ".scorebar" ? scorebar : element(); }
  },
  globalThis: null,
  localStorage: { getItem() { return null; }, setItem() {} },
  navigator: {},
  window: { addEventListener() {}, setTimeout(callback) { callback(); } }
};
context.globalThis = context;
vm.runInNewContext(instrumented, context, { filename: file });

const { scoreHand, scorePeg } = context.__cribbageScoring;
const card = (rank, suit) => ({ id: `${suit}${rank}`, rank, suit });

function expect(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}`);
}

expect(
  scoreHand([card(14, "S"), card(2, "H"), card(3, "D"), card(7, "C")], null, false),
  3,
  "A-2-3 hand run"
);
expect(
  scoreHand([card(12, "S"), card(13, "H"), card(14, "D"), card(2, "C")], null, false),
  0,
  "Q-K-A must not count as a run"
);
expect(scorePeg([card(14, "S"), card(2, "H"), card(3, "D")]), 3, "A-2-3 pegging run");
expect(scorePeg([card(12, "S"), card(13, "H"), card(14, "D")]), 0, "Q-K-A pegging sequence");
expect(
  scoreHand([card(5, "H"), card(5, "D"), card(5, "C"), card(11, "S")], card(5, "S"), false),
  29,
  "maximum 29 hand"
);

console.log("Cribbage scoring checks passed, including Ace-low runs and the 29 hand.");
