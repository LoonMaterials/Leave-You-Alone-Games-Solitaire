(function () {
  "use strict";

  const THEME_KEY = "leave-me-alone-games-theme";
  const AUTO_FINISH_KEY = "leave-me-alone-games-auto-finish";
  const LAST_GAME_KEY = "leave-me-alone-games-last-game";
  const FAVORITES_KEY = "leave-me-alone-games-favorites";
  const PRESERVED_RESET_KEYS = new Set([THEME_KEY, AUTO_FINISH_KEY, "leave-me-alone-games-language"]);
  const THEME_OPTIONS = [
    ["colorblind", "colorblind", "Color Blind"],
    ["green", "green", "Green"],
    ["blue", "blue", "Blue"],
    ["grey", "grey", "Grey"],
    ["orange", "orange", "Orange"],
    ["purple", "purple", "Purple"],
    ["red", "red", "Red"],
    ["sand", "sand", "Sand"],
    ["midnight", "midnight", "Midnight"],
    ["rose", "rose", "Rose"]
  ];
  const THEMES = new Set(THEME_OPTIONS.map(([value]) => value));
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
  const resetAppData = document.getElementById("reset-app-data");

  const HELP = {
    klondike: ["How to win: build all four foundations from Ace to King.", "Move cards in alternating colors and descending order. Choose Draw 1 or Draw 3 inside the game."],
    freecell: ["How to win: build each suit from Ace to King.", "Use the four free cells as temporary parking spots. Empty columns are powerful."],
    spider: ["How to win: clear every card by making King-to-Ace runs.", "Spider has one, two, and four-suit modes. Same-suit complete runs leave the table."],
    pyramid: ["How to win: clear the pyramid.", "Remove exposed pairs that add to 13. Kings are worth 13 and can be removed alone."],
    tripeaks: ["How to win: clear all three peaks.", "Play visible cards one rank higher or lower than the waste card. Use the stock when stuck."],
    golf: ["How to win: clear the layout before the stock runs out.", "Play a visible card one rank higher or lower than the waste card."],
    yukon: ["How to win: build all four foundations from Ace to King.", "You can move face-up runs even when the run has gaps, which makes Yukon feel more open."],
    chess: ["How to win: checkmate the opponent king.", "Use Mode for computer or same-device play. Difficulty changes the computer search; Grandmaster is chess only."],
    checkers: ["How to win: capture or block all opposing pieces.", "Move diagonally, jump to capture, and reach the far side to crown a king."],
    mahjong: ["How to win: remove every tile by matching pairs.", "A tile is free when it is not covered and has a left or right side open. Layouts and tile sets vary."],
    dominoes: ["How to win: empty your hand or have the lowest pip total when blocked.", "Match pips to an open end of the chain. Draw or pass when no legal play exists."],
    reversi: ["How to win: have the most discs when the board fills or no moves remain.", "Place a disc to trap opponent discs in a straight line."],
    "backgammon-classic": ["How to win: bear off all your checkers first.", "Move by the dice, enter from the bar before other moves, and block points with two or more checkers."],
    connect4: ["How to win: connect four pieces in a row.", "Connections can be vertical, horizontal, or diagonal."],
    "tic-tac-toe": ["How to win: make three in a row.", "Medium is intentionally beatable, so a careful player can still win."],
    yacht: ["How to win: finish the scorecard with more points than the opponent.", "Roll up to three times, hold dice you like, then choose one score category."],
    farkle: ["How to win: be first to reach the target score.", "Keep scoring dice, then roll again or bank. If a roll has no scoring dice, that turn scores zero."],
    "shut-the-box": ["How to win: finish with a lower open-tile total than the opponent.", "Roll the dice, close open tiles that add exactly to the roll, then keep rolling until no move remains."],
    sudoku: ["How to win: fill every row, column, and 3x3 box with 1 to 9.", "No repeats are allowed. Use Easy, Medium, or Hard to control how many starting numbers you get."],
    kakuro: ["How to win: fill every white cell so each clue sum is correct.", "Use 1 to 9. Digits cannot repeat within a clue run."],
    "peg-solitaire": ["How to win: finish with one peg remaining.", "Jump one peg over another into an empty hole. The jumped peg is removed."],
    mastermind: ["How to win: guess the hidden code before your guesses run out.", "Exact means right color and spot. Close means right color, wrong spot."],
    nonograms: ["How to win: match the hidden picture exactly.", "Row and column clues show filled runs. New puzzles vary in size and pattern."],
    "2048": ["How to win: merge tiles until you reach 2048.", "The game can continue after 2048 if you want a higher score."],
    "lights-out": ["How to win: turn every light off.", "Tapping a light flips it and its neighbors. New puzzles vary between small and larger boards."]
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
      continueLabel.dataset.i18n = "noRecentGame";
      continueLabel.textContent = t("noRecentGame");
      return;
    }
    continueCard.classList.remove("disabled");
    continueCard.removeAttribute("aria-disabled");
    continueCard.setAttribute("href", saved.href);
    continueLabel.removeAttribute("data-i18n");
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
    localizedHelp(game.id).forEach((line) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = line;
      helpBody.appendChild(paragraph);
    });
    if (typeof helpDialog.showModal === "function") helpDialog.showModal();
    else helpDialog.setAttribute("open", "");
  }

  function localizedHelp(gameId) {
    const language = window.LMAG_I18N?.getLanguage?.() || "en";
    const lines = window.LMAG_HELP?.[language]?.[gameId] || window.LMAG_HELP?.en?.[gameId] || HELP[gameId] || [t("howToPlayFallback")];
    return Array.isArray(lines) ? lines : [lines];
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

  function themeLabel(key, fallback) {
    return window.LMAG_I18N ? window.LMAG_I18N.t(key) : fallback;
  }

  function ensureThemeOptions() {
    const currentValue = themeSelect.value || storedTheme();
    themeSelect.innerHTML = "";
    document.getElementById("theme-choice-row")?.remove();
    THEME_OPTIONS.forEach(([value, key, fallback]) => {
      const option = document.createElement("option");
      option.value = value;
      option.dataset.i18n = key;
      option.textContent = themeLabel(key, fallback);
      themeSelect.appendChild(option);
    });
    themeSelect.value = THEMES.has(currentValue) ? currentValue : "colorblind";
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

  function resetLocalAppData() {
    if (!window.confirm(t("resetAppDataConfirm"))) return;
    try {
      sessionStorage.clear();
    } catch {}
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("leave-me-alone-") && !PRESERVED_RESET_KEYS.has(key)) localStorage.removeItem(key);
      });
    } catch {}
    refreshContinue();
    refreshFavorites();
    refreshFavoriteButtons();
    window.alert(t("resetAppDataDone"));
  }

  ensureThemeOptions();
  themeSelect.addEventListener("change", () => applyTheme(themeSelect.value));
  document.addEventListener("lmag:languagechange", () => {
    ensureThemeOptions();
    applyTheme(storedTheme());
  });
  autoFinishToggle.addEventListener("change", () => applyAutoFinish(autoFinishToggle.checked));
  resetAppData?.addEventListener("click", resetLocalAppData);
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
