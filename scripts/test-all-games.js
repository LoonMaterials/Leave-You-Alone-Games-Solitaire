const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const gamesRoot = path.join(root, "games");
const launcher = fs.readFileSync(path.join(root, "index.html"), "utf8");
const serviceWorker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const gameFolders = fs.readdirSync(gamesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const launcherGames = [...launcher.matchAll(/href=["']games\/([^/]+)\/index\.html["']/g)]
  .map((match) => match[1])
  .sort();

const computerGames = new Set([
  "83-maines-card-game", "backgammon-classic", "checkers", "chess", "connect4",
  "cribbage", "dominoes", "farkle", "gin-rummy", "hearts", "reversi", "rummy",
  "shut-the-box", "spades", "tic-tac-toe", "yacht",
]);
const privateHandGames = new Set([
  "83-maines-card-game", "cribbage", "gin-rummy", "hearts", "rummy", "spades",
]);

function fail(message) {
  throw new Error(message);
}

function sameList(left, right) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

if (!sameList(gameFolders, launcherGames)) {
  fail(`Launcher/folder mismatch. Folders: ${gameFolders.join(", ")}; launcher: ${launcherGames.join(", ")}`);
}

for (const game of gameFolders) {
  const folder = path.join(gamesRoot, game);
  const required = ["index.html", "app.js", "styles.css"];
  for (const file of required) {
    if (!fs.existsSync(path.join(folder, file))) fail(`${game} is missing ${file}`);
  }

  const html = fs.readFileSync(path.join(folder, "index.html"), "utf8");
  const source = fs.readFileSync(path.join(folder, "app.js"), "utf8");
  const styleMatch = html.match(/href=["'](styles\.css(?:\?[^"']*)?)["']/);
  const scriptMatch = html.match(/src=["'](app\.js(?:\?[^"']*)?)["']/);

  if (!styleMatch) fail(`${game} does not load its own styles.css`);
  if (!scriptMatch) fail(`${game} does not load its own app.js`);
  if (/\bBasic Build\b/i.test(html + source)) fail(`${game} still contains testing-only “Basic Build” copy`);
  if (/\.\.\/\.\.\/games\//.test(html + source)) fail(`${game} reaches into another game folder`);
  if (/\b(?:src|href)=["']https?:\/\//i.test(html)) fail(`${game} loads an external runtime asset`);
  if (/\b(?:fetch|importScripts)\s*\(\s*["']https?:\/\//i.test(source)) fail(`${game} makes an external runtime request`);
  try {
    new Function(source);
  } catch (error) {
    fail(`${game} failed JavaScript syntax validation: ${error.message}`);
  }

  for (const asset of [styleMatch[1], scriptMatch[1]]) {
    if (!serviceWorker.includes(`./games/${game}/${asset}`)) {
      fail(`${game} ${asset} is missing from the offline cache`);
    }
  }
  if (!serviceWorker.includes(`./games/${game}/index.html`)) fail(`${game} index is missing from the offline cache`);

  if (computerGames.has(game)) {
    if (!html.includes('id="difficulty"')) fail(`${game} is missing its computer difficulty control`);
    for (const level of ["easy", "medium", "hard"]) {
      if (!html.includes(`value="${level}"`)) fail(`${game} is missing ${level} difficulty`);
    }
    if (!source.includes("storedDifficulty")) fail(`${game} does not apply difficulty to computer decisions`);
  }

  if (privateHandGames.has(game)) {
    for (const id of ["pass-panel", "show-hand"]) {
      if (!html.includes(`id="${id}"`)) fail(`${game} is missing ${id} pass-and-play privacy control`);
    }
    for (const marker of ["handVisible", "showActiveHand"]) {
      if (!source.includes(`function ${marker}`)) fail(`${game} is missing ${marker}()`);
    }
  }
}

for (const icon of ["apple-touch-icon.png", "icon-192.png", "icon-512.png"]) {
  if (!fs.existsSync(path.join(root, "icons", icon))) fail(`PWA icon is missing: ${icon}`);
}

if (/coming next/i.test(launcher)) fail("Launcher still describes playable games as coming next");

console.log(`All-game audit passed for ${gameFolders.length} self-contained games.`);
