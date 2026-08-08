const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const launcher = fs.readFileSync(path.join(root, "index.html"), "utf8");
const games = {
  "cribbage": ["scoreHand", "scorePeg", "scheduleAI"],
  "rummy": ["bestPartition", "scheduleAI"],
  "gin-rummy": ["bestPartition", "roundResult", "scheduleAI"],
  "hearts": ["legalCards", "trickWinner", "scheduleAI"],
  "spades": ["legalCards", "trickWinner", "scheduleAI"],
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
  if (!html.includes('src="app.js')) fail(`${game} does not load its local app.js`);
  if (!html.includes('id="computer-mode"')) fail(`${game} is missing computer-mode control`);
  if (game === "83-maines-card-game") {
    for (const id of ["pass-panel", "show-hand"]) if (!html.includes(`id="${id}"`)) fail(`${game} is missing ${id} privacy control`);
  }
  if (passAndPlayGames.has(game)) {
    for (const id of ["player-count", "pass-panel", "show-hand"]) if (!html.includes(`id="${id}"`)) fail(`${game} is missing ${id} pass-and-play control`);
    for (const marker of ["handVisible", "showActiveHand"]) if (!source.includes(`function ${marker}`)) fail(`${game} is missing ${marker}()`);
  }
  for (const marker of markers) if (!source.includes(`function ${marker}`)) fail(`${game} is missing ${marker}()`);
  if (/\.\.\/\.\.\/games\//.test(source)) fail(`${game} imports source from another game folder`);
  try { new Function(source); } catch (error) { fail(`${game} failed JavaScript syntax validation: ${error.message}`); }
  if (!launcher.includes(`games/${game}/`)) fail(`${game} is missing from the launcher`);
}

console.log(`New-game smoke checks passed for ${Object.keys(games).length} standalone games.`);
