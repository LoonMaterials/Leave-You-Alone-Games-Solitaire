const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const launcher = fs.readFileSync(path.join(root, "index.html"), "utf8");
const games = {
  "cribbage": ["scoreHand", "scorePeg", "runRank", "expectedHandScore", "finishDiscard", "finishRound", "scheduleAI"],
  "rummy": ["bestPartition", "layMeld", "layOff", "goOut", "scheduleAI"],
  "gin-rummy": ["bestPartition", "bestLayoffDeadwood", "roundResult", "cancelHand", "scheduleAI"],
  "hearts": ["legalCards", "trickWinner", "confirmPass", "scheduleAI"],
  "spades": ["legalCards", "trickWinner", "bidEstimate", "scheduleAI"],
  "83-maines-card-game": ["legalCards", "evaluateTrump", "bestTrumpPlan", "aiAuction", "aiDiscard", "aiPlay", "handVisible", "scheduleAI"]
};
const passAndPlayGames = new Set(["cribbage", "rummy", "gin-rummy", "hearts", "spades"]);

function fail(message) {
  throw new Error(message);
}

for (const [game, markers] of Object.entries(games)) {
  const folder = path.join(root, "games", game);
  for (const file of ["index.html", "app.js", "styles.css"]) {
    if (!fs.existsSync(path.join(folder, file))) fail(`${game} is missing ${file}`);
  }
  const html = fs.readFileSync(path.join(folder, "index.html"), "utf8");
  const source = fs.readFileSync(path.join(folder, "app.js"), "utf8");
  const styles = fs.readFileSync(path.join(folder, "styles.css"), "utf8");
  if (!html.includes('src="app.js')) fail(`${game} does not load its local app.js`);
  if (!html.includes('id="computer-mode"')) fail(`${game} is missing computer-mode control`);
  for (const cardStyle of ["width:clamp(48px,10vw,72px)", "height:clamp(68px,14vw,100px)", "font-size:clamp(1.1rem,3.2vw,1.5rem)", "font-weight:800"]) {
    if (!styles.includes(cardStyle)) fail(`${game} is missing the standard readable card style ${cardStyle}`);
  }
  if (game === "83-maines-card-game") {
    for (const id of ["pass-panel", "show-hand"]) if (!html.includes(`id="${id}"`)) fail(`${game} is missing ${id} privacy control`);
  }
  if (passAndPlayGames.has(game)) {
    for (const id of ["player-count", "pass-panel", "show-hand"]) if (!html.includes(`id="${id}"`)) fail(`${game} is missing ${id} pass-and-play control`);
    for (const marker of ["handVisible", "showActiveHand"]) if (!source.includes(`function ${marker}`)) fail(`${game} is missing ${marker}()`);
  }
  if (game === "rummy") {
    for (const id of ["lay-meld", "go-out", "melds"]) if (!html.includes(`id="${id}"`)) fail(`${game} is missing ${id}`);
    if (!source.includes("round < 7")) fail("rummy must deal seven cards to every player count");
    if (!source.includes("mask ^ groupMask")) fail("rummy meld partition must remove the complete meld mask");
  }
  if (game === "gin-rummy" && (html.includes('id="lay-meld"') || html.includes('id="melds"'))) fail("gin-rummy must keep melds in hand until knock");
  if (game === "spades" && source.includes('card.id === "C2"')) fail("spades must not borrow Hearts' forced 2-clubs opening");
  if (game === "cribbage") {
    for (const marker of ["cardsPerHand", "discardCount", "scoringHands", "cribTarget: 4"]) if (!source.includes(marker)) fail(`cribbage is missing distinct deal/scoring rule ${marker}`);
  }
  if (game === "hearts" && !source.includes("const shooter = state.dealPoints.findIndex")) fail("hearts is missing shoot-the-moon scoring");
  if (game === "hearts" && !source.includes('card.id !== "D2"')) fail("three-player Hearts must remove the non-scoring 2 of diamonds");
  if (game === "83-maines-card-game") {
    if (!source.includes("return ledSuit.concat(trumps)")) fail("83 must allow either following a plain suit or playing trump");
    if (!source.includes("function isDiscardable(card)")) fail("83 must protect scoring trumps during discarding");
  }
  for (const marker of markers) if (!source.includes(`function ${marker}`)) fail(`${game} is missing ${marker}()`);
  if (/\.\.\/\.\.\/games\//.test(source)) fail(`${game} imports source from another game folder`);
  try { new Function(source); } catch (error) { fail(`${game} failed JavaScript syntax validation: ${error.message}`); }
  if (!launcher.includes(`games/${game}/`)) fail(`${game} is missing from the launcher`);
}

console.log(`New-game smoke checks passed for ${Object.keys(games).length} standalone games.`);
