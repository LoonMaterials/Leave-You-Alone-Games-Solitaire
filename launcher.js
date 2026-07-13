(function () {
  "use strict";

  const THEME_KEY = "leave-me-alone-games-theme";
  const AUTO_FINISH_KEY = "leave-me-alone-games-auto-finish";
  const LAST_GAME_KEY = "leave-me-alone-games-last-game";
  const FAVORITES_KEY = "leave-me-alone-games-favorites";
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange"]);
  const themeSelect = document.getElementById("theme-select");
  const autoFinishToggle = document.getElementById("auto-finish-toggle");
  const continueCard = document.getElementById("continue-card");
  const continueLabel = document.getElementById("continue-label");
  const dailyCard = document.getElementById("daily-card");
  const dailyLabel = document.getElementById("daily-label");
  const favoritesSection = document.getElementById("favorites-section");
  const favoritesGrid = document.getElementById("favorites-grid");
  const helpDialog = document.getElementById("help-dialog");
  const helpTitle = document.getElementById("help-title");
  const helpBody = document.getElementById("help-body");
  const helpClose = document.getElementById("help-close");

  const HELP = {
    klondike: ["Build foundations from Ace to King.", "Move cards in alternating colors. Choose Draw 1 or Draw 3 inside the game."],
    freecell: ["Use the four free cells to temporarily hold cards.", "Build each suit from Ace to King."],
    spider: ["Build same-suit runs from King down to Ace.", "Spider has one, two, and four-suit modes."],
    pyramid: ["Remove pairs that add up to 13.", "Kings can be removed by themselves."],
    tripeaks: ["Clear cards one rank higher or lower than the waste card.", "Use the stock when no visible card fits."],
    golf: ["Play a card one rank higher or lower than the waste card.", "Try to clear the layout before the stock runs out."],
    yukon: ["Move face-up runs, even if the sequence has gaps.", "Build foundations from Ace to King."],
    chess: ["Move pieces by standard chess rules.", "Use Mode for computer or same-device play. Grandmaster is chess only."],
    checkers: ["Move diagonally and jump to capture.", "Reach the far side to make a king."],
    mahjong: ["Match two free tiles with the same symbol.", "A tile is free when it is not covered and has a left or right side open."],
    dominoes: ["Match pips to an open end of the domino chain.", "Draw or pass when you have no legal play."],
    reversi: ["Place a disc to trap opponent discs in a line.", "Most discs at the end wins."],
    "backgammon-classic": ["Move checkers by the dice and bear them off.", "Blocked points and bar entry use regular backgammon rules."],
    connect4: ["Drop pieces into columns.", "First to connect four in a row wins."],
    "tic-tac-toe": ["Take turns placing marks.", "Three in a row wins."],
    yacht: ["Roll up to three times, holding dice you want to keep.", "Choose one score category each turn."],
    farkle: ["Keep scoring dice, then roll again or bank your points.", "If a roll has no scoring dice, that turn scores zero."],
    "shut-the-box": ["Roll the dice and close open tiles that add to the roll.", "Lowest open total wins after both players finish."],
    sudoku: ["Fill every row, column, and 3x3 box with 1 to 9.", "No repeats in any row, column, or box."],
    kakuro: ["Fill runs with 1 to 9 so they add to each clue.", "Digits cannot repeat within a run."],
    "peg-solitaire": ["Jump one peg over another into an empty space.", "Try to finish with one peg remaining."],
    mastermind: ["Guess the hidden code.", "Exact means right color and spot. Close means right color, wrong spot."],
    nonograms: ["Use row and column clues to fill the picture.", "Tap cells to cycle fill, X, and blank."],
    "2048": ["Slide tiles to merge matching numbers.", "Try to reach 2048, then keep going if you want."],
    "lights-out": ["Tap a light to flip it and its neighbors.", "Turn every light off to win."]
  };

  function t(key, values) {
    return window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key;
  }

  function gameIdFromHref(href) {
    const match = href.match(/games\/([^/]+)\//);
    return match ? match[1] : href;
  }

  function titleForCard(card) {
    return card.querySelector(".game-title")?.textContent?.trim() || card.textContent.trim();
  }

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }

  function gameCards() {
    return Array.from(document.querySelectorAll(".game-section:not(#favorites-section) .game-card[href]"));
  }

  function gameDataFromCard(card) {
    return {
      id: card.dataset.gameId || gameIdFromHref(card.getAttribute("href")),
      href: card.getAttribute("href"),
      title: titleForCard(card),
      titleKey: card.querySelector(".game-title")?.dataset.i18n || "",
      metaKey: card.querySelector(".game-meta")?.dataset.i18n || "",
      meta: card.querySelector(".game-meta")?.textContent?.trim() || ""
    };
  }

  function allGames() {
    return gameCards().map(gameDataFromCard);
  }

  function favorites() {
    const ids = readJson(FAVORITES_KEY, []);
    return Array.isArray(ids) ? ids : [];
  }

  function isFavorite(id) {
    return favorites().includes(id);
  }

  function setFavorite(id, enabled) {
    const next = favorites().filter((item) => item !== id);
    if (enabled) next.push(id);
    writeJson(FAVORITES_KEY, next);
    refreshFavorites();
    refreshFavoriteButtons();
  }

  function storeLastGame(game) {
    writeJson(LAST_GAME_KEY, {
      id: game.id,
      href: game.href,
      titleKey: game.titleKey,
      title: game.title,
      playedAt: Date.now()
    });
  }

  function localizedTitle(game) {
    return game.titleKey ? t(game.titleKey) : game.title;
  }

  function refreshContinue() {
    const saved = readJson(LAST_GAME_KEY, null);
    if (!saved?.href) {
      continueCard.classList.add("disabled");
      continueCard.setAttribute("aria-disabled", "true");
      continueCard.setAttribute("href", "#");
      continueLabel.textContent = t("noRecentGame");
      return;
    }
    continueCard.classList.remove("disabled");
    continueCard.removeAttribute("aria-disabled");
    continueCard.setAttribute("href", saved.href);
    continueLabel.textContent = saved.titleKey ? t(saved.titleKey) : saved.title;
  }

  function todayStamp() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function dailyIndex(count) {
    const stamp = todayStamp();
    let hash = 0;
    for (let index = 0; index < stamp.length; index += 1) {
      hash = ((hash << 5) - hash) + stamp.charCodeAt(index);
      hash |= 0;
    }
    return Math.abs(hash) % count;
  }

  function refreshDaily() {
    const games = allGames();
    if (!games.length) return;
    const game = games[dailyIndex(games.length)];
    dailyCard.setAttribute("href", game.href);
    dailyCard.dataset.gameId = game.id;
    dailyCard.dataset.titleKey = game.titleKey;
    dailyLabel.textContent = localizedTitle(game);
  }

  function favoriteCard(game) {
    const link = document.createElement("a");
    link.className = "game-card";
    link.href = game.href;
    link.dataset.gameId = game.id;
    link.dataset.titleKey = game.titleKey;
    const title = document.createElement("span");
    title.className = "game-title";
    title.textContent = localizedTitle(game);
    const meta = document.createElement("span");
    meta.className = "game-meta";
    meta.textContent = game.metaKey ? t(game.metaKey) : game.meta;
    link.append(title, meta);
    link.addEventListener("click", () => storeLastGame(game));
    return link;
  }

  function refreshFavorites() {
    const ids = favorites();
    const games = allGames().filter((game) => ids.includes(game.id));
    favoritesGrid.textContent = "";
    games.forEach((game) => favoritesGrid.appendChild(favoriteCard(game)));
    favoritesSection.hidden = games.length === 0;
  }

  function refreshFavoriteButtons() {
    document.querySelectorAll("[data-favorite-for]").forEach((button) => {
      const active = isFavorite(button.dataset.favoriteFor);
      button.setAttribute("aria-pressed", String(active));
      button.textContent = active ? "★" : "☆";
      button.setAttribute("aria-label", active ? t("removeFavorite") : t("addFavorite"));
      button.title = active ? t("removeFavorite") : t("addFavorite");
    });
  }

  function showHelp(game) {
    helpTitle.textContent = localizedTitle(game);
    helpBody.textContent = "";
    (HELP[game.id] || [t("howToPlayFallback")]).forEach((line) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = line;
      helpBody.appendChild(paragraph);
    });
    if (typeof helpDialog.showModal === "function") helpDialog.showModal();
    else helpDialog.setAttribute("open", "");
  }

  function enhanceCards() {
    gameCards().forEach((card) => {
      if (card.closest(".game-card-shell")) return;
      const game = gameDataFromCard(card);
      card.dataset.gameId = game.id;
      const shell = document.createElement("div");
      shell.className = "game-card-shell";
      const actions = document.createElement("div");
      actions.className = "card-mini-actions";
      const favorite = document.createElement("button");
      favorite.type = "button";
      favorite.className = "mini-button";
      favorite.dataset.favoriteFor = game.id;
      const help = document.createElement("button");
      help.type = "button";
      help.className = "mini-button";
      help.textContent = "?";
      help.setAttribute("aria-label", t("howToPlay"));
      help.title = t("howToPlay");
      actions.append(favorite, help);
      card.parentNode.insertBefore(shell, card);
      shell.append(card, actions);
      card.addEventListener("click", () => storeLastGame(gameDataFromCard(card)));
      favorite.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        setFavorite(game.id, !isFavorite(game.id));
      });
      help.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        showHelp(gameDataFromCard(card));
      });
    });
    refreshFavoriteButtons();
  }

  function storedTheme() {
    try {
      const theme = localStorage.getItem(THEME_KEY);
      return THEMES.has(theme) ? theme : "colorblind";
    } catch (error) {
      return "colorblind";
    }
  }

  function applyTheme(theme) {
    const nextTheme = THEMES.has(theme) ? theme : "colorblind";
    document.body.dataset.theme = nextTheme;
    themeSelect.value = nextTheme;
    try {
      localStorage.setItem(THEME_KEY, nextTheme);
    } catch (error) {
      // The selected background still applies to this page.
    }
  }

  function storedAutoFinish() {
    try {
      return localStorage.getItem(AUTO_FINISH_KEY) !== "false";
    } catch (error) {
      return true;
    }
  }

  function applyAutoFinish(enabled) {
    autoFinishToggle.checked = Boolean(enabled);
    try {
      localStorage.setItem(AUTO_FINISH_KEY, String(Boolean(enabled)));
    } catch (error) {
      // The selected setting still applies to this page.
    }
  }

  themeSelect.addEventListener("change", () => applyTheme(themeSelect.value));
  autoFinishToggle.addEventListener("change", () => applyAutoFinish(autoFinishToggle.checked));
  continueCard.addEventListener("click", () => {
    const saved = readJson(LAST_GAME_KEY, null);
    if (saved?.href) storeLastGame(saved);
  });
  dailyCard.addEventListener("click", () => {
    const game = allGames().find((item) => item.id === dailyCard.dataset.gameId);
    if (game) storeLastGame(game);
  });
  helpClose.addEventListener("click", () => {
    if (typeof helpDialog.close === "function") helpDialog.close();
    else helpDialog.removeAttribute("open");
  });
  document.addEventListener("lmag:languagechange", () => {
    refreshContinue();
    refreshDaily();
    refreshFavorites();
    refreshFavoriteButtons();
  });
  applyTheme(storedTheme());
  applyAutoFinish(storedAutoFinish());
  enhanceCards();
  refreshContinue();
  refreshDaily();
  refreshFavorites();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
})();
