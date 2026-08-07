const CACHE_NAME = "leave-me-alone-games-v89";
const APP_SHELL = [
  "./",
  "./index.html",
  "./launcher.css?v=20260713-final-polish-1",
  "./launcher.js?v=20260713-help-i18n-1",
  "./i18n.js?v=20260713-help-i18n-1",
  "./help-i18n.js?v=20260713-help-i18n-1",
  "./manifest.webmanifest?v=20260607-app-1",
  "./games/klondike/",
  "./games/klondike/index.html",
  "./games/klondike/styles.css?v=20260713-themes-1",
  "./games/klondike/app.js?v=20260713-themes-1",
  "./games/freecell/",
  "./games/freecell/index.html",
  "./games/freecell/styles.css?v=20260713-themes-1",
  "./games/freecell/app.js?v=20260713-themes-1",
  "./games/spider/",
  "./games/spider/index.html",
  "./games/spider/styles.css?v=20260713-themes-1",
  "./games/spider/app.js?v=20260713-themes-1",
  "./games/pyramid/",
  "./games/pyramid/index.html",
  "./games/pyramid/styles.css?v=20260713-themes-1",
  "./games/pyramid/app.js?v=20260713-themes-1",
  "./games/tripeaks/",
  "./games/tripeaks/index.html",
  "./games/tripeaks/styles.css?v=20260713-themes-1",
  "./games/tripeaks/app.js?v=20260713-themes-1",
  "./games/golf/",
  "./games/golf/index.html",
  "./games/golf/styles.css?v=20260713-themes-1",
  "./games/golf/app.js?v=20260713-themes-1",
  "./games/yukon/",
  "./games/yukon/index.html",
  "./games/yukon/styles.css?v=20260713-themes-1",
  "./games/yukon/app.js?v=20260713-themes-1",
  "./games/mahjong/",
  "./games/mahjong/index.html",
  "./games/mahjong/styles.css?v=20260713-themes-1",
  "./games/mahjong/app.js?v=20260713-themes-1",
  "./games/chess/",
  "./games/chess/index.html",
  "./games/chess/styles.css?v=20260713-themes-1",
  "./games/chess/app.js?v=20260713-themes-1",
  "./games/checkers/",
  "./games/checkers/index.html",
  "./games/checkers/styles.css?v=20260713-themes-1",
  "./games/checkers/app.js?v=20260713-themes-1",
  "./games/dominoes/",
  "./games/dominoes/index.html",
  "./games/dominoes/styles.css?v=20260713-themes-1",
  "./games/dominoes/app.js?v=20260713-themes-1",
  "./games/reversi/",
  "./games/reversi/index.html",
  "./games/reversi/styles.css?v=20260713-themes-1",
  "./games/reversi/app.js?v=20260713-themes-1",
  "./games/backgammon-classic/",
  "./games/backgammon-classic/index.html",
  "./games/backgammon-classic/styles.css?v=20260713-themes-1",
  "./games/backgammon-classic/app.js?v=20260713-themes-1",
  "./games/connect4/",
  "./games/connect4/index.html",
  "./games/connect4/styles.css?v=20260713-themes-1",
  "./games/connect4/app.js?v=20260713-themes-1",
  "./games/tic-tac-toe/",
  "./games/tic-tac-toe/index.html",
  "./games/tic-tac-toe/styles.css?v=20260713-themes-1",
  "./games/tic-tac-toe/app.js?v=20260713-themes-1",
  "./games/cribbage/",
  "./games/cribbage/index.html",
  "./games/cribbage/styles.css?v=20260804-base-1",
  "./games/cribbage/app.js?v=20260804-base-1",
  "./games/rummy/",
  "./games/rummy/index.html",
  "./games/rummy/styles.css?v=20260804-base-1",
  "./games/rummy/app.js?v=20260804-base-1",
  "./games/gin-rummy/",
  "./games/gin-rummy/index.html",
  "./games/gin-rummy/styles.css?v=20260804-base-1",
  "./games/gin-rummy/app.js?v=20260804-base-1",
  "./games/hearts/",
  "./games/hearts/index.html",
  "./games/hearts/styles.css?v=20260804-base-1",
  "./games/hearts/app.js?v=20260804-base-1",
  "./games/spades/",
  "./games/spades/index.html",
  "./games/spades/styles.css?v=20260804-base-1",
  "./games/spades/app.js?v=20260804-base-1",
  "./games/83-maines-card-game/",
  "./games/83-maines-card-game/index.html",
  "./games/83-maines-card-game/styles.css?v=20260804-83-1",
  "./games/83-maines-card-game/app.js?v=20260804-83-1",
  "./games/yacht/",
  "./games/yacht/index.html",
  "./games/yacht/styles.css?v=20260713-themes-1",
  "./games/yacht/app.js?v=20260713-themes-1",
  "./games/farkle/",
  "./games/farkle/index.html",
  "./games/farkle/styles.css?v=20260713-themes-1",
  "./games/farkle/app.js?v=20260713-farkle-log-1",
  "./games/shut-the-box/",
  "./games/shut-the-box/index.html",
  "./games/shut-the-box/styles.css?v=20260713-final-polish-1",
  "./games/shut-the-box/app.js?v=20260713-final-polish-1",
  "./games/sudoku/",
  "./games/sudoku/index.html",
  "./games/sudoku/styles.css?v=20260713-sudoku-levels-1",
  "./games/sudoku/app.js?v=20260713-sudoku-levels-1",
  "./games/kakuro/",
  "./games/kakuro/index.html",
  "./games/kakuro/styles.css?v=20260713-themes-1",
  "./games/kakuro/app.js?v=20260713-themes-1",
  "./games/peg-solitaire/",
  "./games/peg-solitaire/index.html",
  "./games/peg-solitaire/styles.css?v=20260713-peg-visible-1",
  "./games/peg-solitaire/app.js?v=20260713-peg-visible-1",
  "./games/mastermind/",
  "./games/mastermind/index.html",
  "./games/mastermind/styles.css?v=20260713-themes-1",
  "./games/mastermind/app.js?v=20260713-themes-1",
  "./games/nonograms/",
  "./games/nonograms/index.html",
  "./games/nonograms/styles.css?v=20260713-puzzle-depth-1",
  "./games/nonograms/app.js?v=20260713-puzzle-depth-1",
  "./games/2048/",
  "./games/2048/index.html",
  "./games/2048/styles.css?v=20260713-themes-1",
  "./games/2048/app.js?v=20260713-themes-1",
  "./games/lights-out/",
  "./games/lights-out/index.html",
  "./games/lights-out/styles.css?v=20260713-puzzle-depth-1",
  "./games/lights-out/app.js?v=20260713-puzzle-depth-1",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isAppFile = url.pathname.endsWith("/") ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/launcher.css") ||
    url.pathname.endsWith("/launcher.js") ||
    url.pathname.endsWith("/i18n.js") ||
    url.pathname.endsWith("/styles.css") ||
    url.pathname.endsWith("/app.js") ||
    url.pathname.endsWith("/manifest.webmanifest");

  event.respondWith(isAppFile ? networkFirst(event.request) : cacheFirst(event.request));
});

function networkFirst(request) {
  return fetch(request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
    return response;
  }).catch(() =>
    caches.match(request).then((cached) => cached || caches.match("./index.html"))
  );
}

function cacheFirst(request) {
  return caches.match(request).then((cached) =>
    cached || fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      return response;
    }).catch(() => caches.match("./index.html"))
  );
}
