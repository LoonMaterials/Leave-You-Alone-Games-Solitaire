(function () {
  "use strict";

  const STORAGE_KEY = "leave-me-alone-mahjong-current-game";
  const SAVE_VERSION = 4;
  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange", "purple", "red", "sand", "midnight", "rose"]);
  const MIN_RANDOM_TILES = 56;

  const TILE_TYPES = [
    { id: "char-1", family: "character", rank: "1", mark: "\u842c", short: "CHAR", name: "Character 1", label: "mahjongCharacter1" },
    { id: "char-2", family: "character", rank: "2", mark: "\u842c", short: "CHAR", name: "Character 2", label: "mahjongCharacter2" },
    { id: "char-3", family: "character", rank: "3", mark: "\u842c", short: "CHAR", name: "Character 3", label: "mahjongCharacter3" },
    { id: "char-4", family: "character", rank: "4", mark: "\u842c", short: "CHAR", name: "Character 4", label: "mahjongCharacter4" },
    { id: "char-5", family: "character", rank: "5", mark: "\u842c", short: "CHAR", name: "Character 5", label: "mahjongCharacter5" },
    { id: "char-6", family: "character", rank: "6", mark: "\u842c", short: "CHAR", name: "Character 6", label: "mahjongCharacter6" },
    { id: "char-7", family: "character", rank: "7", mark: "\u842c", short: "CHAR", name: "Character 7", label: "mahjongCharacter7" },
    { id: "char-8", family: "character", rank: "8", mark: "\u842c", short: "CHAR", name: "Character 8", label: "mahjongCharacter8" },
    { id: "char-9", family: "character", rank: "9", mark: "\u842c", short: "CHAR", name: "Character 9", label: "mahjongCharacter9" },
    { id: "bamboo-1", family: "bamboo", rank: "1", mark: "\u25C6", short: "BAM", name: "Bamboo 1", label: "mahjongBamboo1" },
    { id: "bamboo-2", family: "bamboo", rank: "2", mark: "\u25C6", short: "BAM", name: "Bamboo 2", label: "mahjongBamboo2" },
    { id: "bamboo-3", family: "bamboo", rank: "3", mark: "\u25C6", short: "BAM", name: "Bamboo 3", label: "mahjongBamboo3" },
    { id: "bamboo-4", family: "bamboo", rank: "4", mark: "\u25C6", short: "BAM", name: "Bamboo 4", label: "mahjongBamboo4" },
    { id: "bamboo-5", family: "bamboo", rank: "5", mark: "\u25C6", short: "BAM", name: "Bamboo 5", label: "mahjongBamboo5" },
    { id: "bamboo-6", family: "bamboo", rank: "6", mark: "\u25C6", short: "BAM", name: "Bamboo 6", label: "mahjongBamboo6" },
    { id: "bamboo-7", family: "bamboo", rank: "7", mark: "\u25C6", short: "BAM", name: "Bamboo 7", label: "mahjongBamboo7" },
    { id: "bamboo-8", family: "bamboo", rank: "8", mark: "\u25C6", short: "BAM", name: "Bamboo 8", label: "mahjongBamboo8" },
    { id: "bamboo-9", family: "bamboo", rank: "9", mark: "\u25C6", short: "BAM", name: "Bamboo 9", label: "mahjongBamboo9" },
    { id: "star", family: "shape", rank: "1", mark: "\u2605", short: "STAR", name: "Star" },
    { id: "circle", family: "shape", rank: "2", mark: "\u25CF", short: "DOT", name: "Circle" },
    { id: "triangle", family: "shape", rank: "3", mark: "\u25B2", short: "TRI", name: "Triangle" },
    { id: "square", family: "shape", rank: "4", mark: "\u25A0", short: "SQ", name: "Square" },
    { id: "sun", family: "sky", rank: "5", mark: "\u2600", short: "SUN", name: "Sun" },
    { id: "moon", family: "sky", rank: "6", mark: "\u25D0", short: "MOON", name: "Moon" },
    { id: "leaf", family: "nature", rank: "7", mark: "\u2663", short: "LEAF", name: "Leaf" },
    { id: "flower", family: "nature", rank: "8", mark: "\u273F", short: "FLWR", name: "Flower" },
    { id: "fish", family: "animal", rank: "9", mark: "\u25C9", short: "FISH", name: "Fish" },
    { id: "bird", family: "animal", rank: "10", mark: "\u25C7", short: "BIRD", name: "Bird" },
    { id: "turtle", family: "animal", rank: "11", mark: "\u25D6", short: "TURT", name: "Turtle" },
    { id: "butterfly", family: "animal", rank: "12", mark: "\u2726", short: "BFLY", name: "Butterfly" },
    { id: "coin", family: "coin", rank: "13", mark: "\u25CE", short: "COIN", name: "Coin" },
    { id: "dragon", family: "dragon", rank: "14", mark: "\u25C8", short: "DRGN", name: "Dragon" },
    { id: "heart", family: "bright", rank: "15", mark: "\u2665", short: "HRT", name: "Heart" },
    { id: "diamond", family: "bright", rank: "16", mark: "\u25C6", short: "DIA", name: "Diamond" },
    { id: "spark", family: "bright", rank: "17", mark: "\u2736", short: "SPK", name: "Spark" },
    { id: "bolt", family: "bright", rank: "18", mark: "\u26A1", short: "BOLT", name: "Bolt" },
    { id: "cloud", family: "weather", rank: "19", mark: "\u2601", short: "CLD", name: "Cloud" },
    { id: "snow", family: "weather", rank: "20", mark: "\u2744", short: "SNOW", name: "Snow" },
    { id: "wave", family: "weather", rank: "21", mark: "\u224B", short: "WAVE", name: "Wave" },
    { id: "fire", family: "weather", rank: "22", mark: "\u25B2", short: "FIRE", name: "Fire" },
    { id: "apple", family: "food", rank: "23", mark: "\u25CF", short: "APL", name: "Apple" },
    { id: "cherry", family: "food", rank: "24", mark: "\u25D4", short: "CHRY", name: "Cherry" },
    { id: "pear", family: "food", rank: "25", mark: "\u25D2", short: "PEAR", name: "Pear" },
    { id: "berry", family: "food", rank: "26", mark: "\u25C9", short: "BRY", name: "Berry" },
    { id: "anchor", family: "travel", rank: "27", mark: "\u2693", short: "ANC", name: "Anchor" },
    { id: "compass", family: "travel", rank: "28", mark: "\u25CE", short: "COMP", name: "Compass" },
    { id: "key", family: "travel", rank: "29", mark: "\u26BF", short: "KEY", name: "Key" },
    { id: "kite", family: "travel", rank: "30", mark: "\u25C7", short: "KITE", name: "Kite" },
    { id: "crown", family: "royal", rank: "31", mark: "\u265B", short: "CRWN", name: "Crown" },
    { id: "shield", family: "royal", rank: "32", mark: "\u25D8", short: "SHLD", name: "Shield" },
    { id: "gem", family: "royal", rank: "33", mark: "\u25C8", short: "GEM", name: "Gem" },
    { id: "music", family: "royal", rank: "34", mark: "\u266B", short: "MUS", name: "Music" },
    { id: "paw", family: "critter", rank: "35", mark: "\u25CF", short: "PAW", name: "Paw" },
    { id: "bee", family: "critter", rank: "36", mark: "\u273B", short: "BEE", name: "Bee" },
    { id: "frog", family: "critter", rank: "37", mark: "\u25D5", short: "FRG", name: "Frog" },
    { id: "fox", family: "critter", rank: "38", mark: "\u25B6", short: "FOX", name: "Fox" },
    { id: "shell", family: "sea", rank: "39", mark: "\u25D3", short: "SHL", name: "Shell" },
    { id: "pearl", family: "sea", rank: "40", mark: "\u25CC", short: "PRL", name: "Pearl" },
    { id: "coral", family: "sea", rank: "41", mark: "\u2739", short: "CRL", name: "Coral" },
    { id: "starfish", family: "sea", rank: "42", mark: "\u2726", short: "SEA", name: "Starfish" },
    { id: "pine", family: "forest", rank: "43", mark: "\u25B2", short: "PINE", name: "Pine" },
    { id: "mushroom", family: "forest", rank: "44", mark: "\u25D9", short: "MUSH", name: "Mushroom" },
    { id: "lantern", family: "festival", rank: "45", mark: "\u25C9", short: "LANT", name: "Lantern" },
    { id: "bell", family: "festival", rank: "46", mark: "\u25D2", short: "BELL", name: "Bell" },
    { id: "ribbon", family: "festival", rank: "47", mark: "\u25B6", short: "RIBN", name: "Ribbon" },
    { id: "fan", family: "festival", rank: "48", mark: "\u25D6", short: "FAN", name: "Fan" },
    { id: "planet", family: "space", rank: "49", mark: "\u25CE", short: "PLNT", name: "Planet" },
    { id: "comet", family: "space", rank: "50", mark: "\u2736", short: "COMT", name: "Comet" },
    { id: "rocket", family: "space", rank: "51", mark: "\u25B2", short: "RCKT", name: "Rocket" },
    { id: "orbit", family: "space", rank: "52", mark: "\u25CC", short: "ORBT", name: "Orbit" },
    { id: "book", family: "study", rank: "53", mark: "\u25A0", short: "BOOK", name: "Book" },
    { id: "pen", family: "study", rank: "54", mark: "\u25C7", short: "PEN", name: "Pen" },
    { id: "lamp", family: "study", rank: "55", mark: "\u2600", short: "LAMP", name: "Lamp" },
    { id: "scroll", family: "study", rank: "56", mark: "\u224B", short: "SCRL", name: "Scroll" }
  ];

  const LAYOUTS = [
    {
      id: "bridge",
      cols: 8,
      rows: 4,
      positions: [
        ...range(1, 6).map((col) => ({ col, row: 0, layer: 0 })),
        ...range(0, 7).map((col) => ({ col, row: 1, layer: 0 })),
        ...range(0, 7).map((col) => ({ col, row: 2, layer: 0 })),
        ...range(1, 6).map((col) => ({ col, row: 3, layer: 0 })),
        ...range(2, 5).map((col) => ({ col, row: 0.55, layer: 1 })),
        ...range(2, 5).map((col) => ({ col, row: 2.45, layer: 1 }))
      ]
    },
    {
      id: "diamond",
      cols: 8,
      rows: 5,
      positions: [
        ...range(3, 4).map((col) => ({ col, row: 0, layer: 0 })),
        ...range(2, 5).map((col) => ({ col, row: 1, layer: 0 })),
        ...range(1, 6).map((col) => ({ col, row: 2, layer: 0 })),
        ...range(2, 5).map((col) => ({ col, row: 3, layer: 0 })),
        ...range(3, 4).map((col) => ({ col, row: 4, layer: 0 })),
        ...range(3, 4).map((col) => ({ col, row: 1.2, layer: 1 })),
        ...range(2, 5).map((col) => ({ col, row: 2, layer: 1 })),
        ...range(3, 4).map((col) => ({ col, row: 2.8, layer: 1 })),
        { col: 3.5, row: 2, layer: 2 },
        { col: 3.5, row: 2.55, layer: 2 }
      ]
    },
    {
      id: "turtle",
      cols: 9,
      rows: 4,
      positions: [
        ...range(2, 6).map((col) => ({ col, row: 0, layer: 0 })),
        ...range(1, 7).map((col) => ({ col, row: 1, layer: 0 })),
        ...range(0, 8).map((col) => ({ col, row: 2, layer: 0 })),
        ...range(2, 6).map((col) => ({ col, row: 3, layer: 0 })),
        ...range(3, 5).map((col) => ({ col, row: 0.6, layer: 1 })),
        ...range(2, 6).map((col) => ({ col, row: 1.65, layer: 1 })),
        ...range(3, 5).map((col) => ({ col, row: 2.7, layer: 1 })),
        { col: 4, row: 1.65, layer: 2 },
        { col: 4, row: 2.2, layer: 2 },
        { col: 5, row: 2.2, layer: 2 }
      ]
    },
    {
      id: "steps",
      cols: 8,
      rows: 4,
      positions: [
        ...range(0, 5).map((col) => ({ col, row: 0, layer: 0 })),
        ...range(1, 6).map((col) => ({ col, row: 1, layer: 0 })),
        ...range(2, 7).map((col) => ({ col, row: 2, layer: 0 })),
        ...range(0, 7).map((col) => ({ col, row: 3, layer: 0 })),
        ...range(2, 5).map((col) => ({ col, row: 0.55, layer: 1 })),
        ...range(3, 6).map((col) => ({ col, row: 1.55, layer: 1 })),
        ...range(4, 5).map((col) => ({ col, row: 2.55, layer: 1 }))
      ]
    },
    {
      id: "garden",
      cols: 9,
      rows: 6,
      positions: [
        ...range(2, 6).map((col) => ({ col, row: 0, layer: 0 })),
        ...range(1, 7).map((col) => ({ col, row: 1, layer: 0 })),
        ...range(0, 8).map((col) => ({ col, row: 2, layer: 0 })),
        ...range(0, 8).map((col) => ({ col, row: 3, layer: 0 })),
        ...range(1, 7).map((col) => ({ col, row: 4, layer: 0 })),
        ...range(2, 6).map((col) => ({ col, row: 5, layer: 0 })),
        ...range(3, 5).map((col) => ({ col, row: 1.55, layer: 1 })),
        ...range(2, 6).map((col) => ({ col, row: 2.5, layer: 1 })),
        ...range(2, 6).map((col) => ({ col, row: 3.45, layer: 1 })),
        ...range(3, 5).map((col) => ({ col, row: 4.4, layer: 1 })),
        ...range(3, 4).map((col) => ({ col, row: 2.72, layer: 2 })),
        ...range(4, 5).map((col) => ({ col, row: 3.15, layer: 2 }))
      ]
    },
    {
      id: "tower",
      cols: 10,
      rows: 6,
      positions: [
        ...range(1, 8).map((col) => ({ col, row: 0, layer: 0 })),
        ...range(0, 9).map((col) => ({ col, row: 1, layer: 0 })),
        ...range(0, 9).map((col) => ({ col, row: 2, layer: 0 })),
        ...range(0, 9).map((col) => ({ col, row: 3, layer: 0 })),
        ...range(0, 9).map((col) => ({ col, row: 4, layer: 0 })),
        ...range(1, 8).map((col) => ({ col, row: 5, layer: 0 })),
        ...range(2, 7).map((col) => ({ col, row: 1.48, layer: 1 })),
        ...range(2, 7).map((col) => ({ col, row: 2.48, layer: 1 })),
        ...range(2, 7).map((col) => ({ col, row: 3.48, layer: 1 })),
        ...range(3, 6).map((col) => ({ col, row: 2.02, layer: 2 })),
        ...range(3, 6).map((col) => ({ col, row: 3.02, layer: 2 }))
      ]
    },
    {
      id: "wide-turtle",
      cols: 10,
      rows: 6,
      positions: [
        ...range(2, 7).map((col) => ({ col, row: 0, layer: 0 })),
        ...range(1, 8).map((col) => ({ col, row: 1, layer: 0 })),
        ...range(0, 9).map((col) => ({ col, row: 2, layer: 0 })),
        ...range(0, 9).map((col) => ({ col, row: 3, layer: 0 })),
        ...range(1, 8).map((col) => ({ col, row: 4, layer: 0 })),
        ...range(2, 7).map((col) => ({ col, row: 5, layer: 0 })),
        ...range(3, 6).map((col) => ({ col, row: 0.7, layer: 1 })),
        ...range(2, 7).map((col) => ({ col, row: 1.7, layer: 1 })),
        ...range(2, 7).map((col) => ({ col, row: 3.3, layer: 1 })),
        ...range(3, 6).map((col) => ({ col, row: 4.3, layer: 1 })),
        ...range(4, 5).map((col) => ({ col, row: 2.3, layer: 2 })),
        ...range(4, 5).map((col) => ({ col, row: 3, layer: 2 }))
      ]
    },
    {
      id: "fortress",
      cols: 11,
      rows: 6,
      positions: [
        ...range(2, 8).map((col) => ({ col, row: 0, layer: 0 })),
        ...range(1, 9).map((col) => ({ col, row: 1, layer: 0 })),
        ...range(0, 10).map((col) => ({ col, row: 2, layer: 0 })),
        ...range(0, 10).map((col) => ({ col, row: 3, layer: 0 })),
        ...range(1, 9).map((col) => ({ col, row: 4, layer: 0 })),
        ...range(2, 8).map((col) => ({ col, row: 5, layer: 0 })),
        ...range(3, 7).map((col) => ({ col, row: 1.1, layer: 1 })),
        ...range(2, 8).map((col) => ({ col, row: 2.05, layer: 1 })),
        ...range(2, 8).map((col) => ({ col, row: 3.05, layer: 1 })),
        ...range(3, 7).map((col) => ({ col, row: 4, layer: 1 })),
        ...range(4, 6).map((col) => ({ col, row: 2.55, layer: 2 })),
        ...range(4, 6).map((col) => ({ col, row: 3.15, layer: 2 }))
      ]
    },
    {
      id: "butterfly",
      cols: 11,
      rows: 6,
      positions: [
        ...range(0, 3).map((col) => ({ col, row: 0, layer: 0 })),
        ...range(7, 10).map((col) => ({ col, row: 0, layer: 0 })),
        ...range(0, 4).map((col) => ({ col, row: 1, layer: 0 })),
        ...range(6, 10).map((col) => ({ col, row: 1, layer: 0 })),
        ...range(1, 9).map((col) => ({ col, row: 2, layer: 0 })),
        ...range(1, 9).map((col) => ({ col, row: 3, layer: 0 })),
        ...range(0, 4).map((col) => ({ col, row: 4, layer: 0 })),
        ...range(6, 10).map((col) => ({ col, row: 4, layer: 0 })),
        ...range(0, 3).map((col) => ({ col, row: 5, layer: 0 })),
        ...range(7, 10).map((col) => ({ col, row: 5, layer: 0 })),
        ...range(2, 4).map((col) => ({ col, row: 1.6, layer: 1 })),
        ...range(6, 8).map((col) => ({ col, row: 1.6, layer: 1 })),
        ...range(3, 7).map((col) => ({ col, row: 2.5, layer: 1 })),
        ...range(2, 4).map((col) => ({ col, row: 3.4, layer: 1 })),
        ...range(6, 8).map((col) => ({ col, row: 3.4, layer: 1 })),
        { col: 5, row: 2.5, layer: 2 },
        { col: 5, row: 3.05, layer: 2 },
        { col: 5, row: 1.95, layer: 2 }
      ]
    },
    {
      id: "pagoda",
      cols: 10,
      rows: 7,
      positions: [
        ...range(3, 6).map((col) => ({ col, row: 0, layer: 0 })),
        ...range(2, 7).map((col) => ({ col, row: 1, layer: 0 })),
        ...range(1, 8).map((col) => ({ col, row: 2, layer: 0 })),
        ...range(0, 9).map((col) => ({ col, row: 3, layer: 0 })),
        ...range(1, 8).map((col) => ({ col, row: 4, layer: 0 })),
        ...range(2, 7).map((col) => ({ col, row: 5, layer: 0 })),
        ...range(3, 6).map((col) => ({ col, row: 6, layer: 0 })),
        ...range(3, 6).map((col) => ({ col, row: 1.45, layer: 1 })),
        ...range(2, 7).map((col) => ({ col, row: 2.45, layer: 1 })),
        ...range(2, 7).map((col) => ({ col, row: 3.45, layer: 1 })),
        ...range(3, 6).map((col) => ({ col, row: 4.45, layer: 1 })),
        ...range(4, 5).map((col) => ({ col, row: 2.95, layer: 2 })),
        ...range(4, 5).map((col) => ({ col, row: 3.55, layer: 2 }))
      ]
    },
    {
      id: "river",
      cols: 12,
      rows: 5,
      positions: [
        ...range(1, 9).map((col) => ({ col, row: 0, layer: 0 })),
        ...range(0, 10).map((col) => ({ col, row: 1, layer: 0 })),
        ...range(1, 11).map((col) => ({ col, row: 2, layer: 0 })),
        ...range(0, 10).map((col) => ({ col, row: 3, layer: 0 })),
        ...range(1, 9).map((col) => ({ col, row: 4, layer: 0 })),
        ...range(2, 8).map((col) => ({ col, row: 0.65, layer: 1 })),
        ...range(3, 9).map((col) => ({ col, row: 2, layer: 1 })),
        ...range(2, 8).map((col) => ({ col, row: 3.35, layer: 1 })),
        ...range(4, 7).map((col) => ({ col, row: 2, layer: 2 }))
      ]
    }
  ];

  const els = {
    board: document.getElementById("board"),
    status: document.getElementById("status"),
    undo: document.getElementById("undo"),
    newGame: document.getElementById("new-game"),
    win: document.getElementById("win-message")
  };

  let state = null;
  let selectedId = null;
  let undoSnapshot = null;
  let lastTapAt = 0;

  function range(start, end) {
    const values = [];
    for (let value = start; value <= end; value += 1) values.push(value);
    return values;
  }

  function t(key, values) {
    return window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key;
  }

  function tileType(tile) {
    return TILE_TYPES.find((type) => type.id === tile.type) || TILE_TYPES[0];
  }

  function currentLayout() {
    return LAYOUTS.find((layout) => layout.id === state?.layout) || LAYOUTS[0];
  }

  function freshState() {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const layoutChoices = LAYOUTS.filter((item) =>
        item.positions.length >= MIN_RANDOM_TILES &&
        item.positions.length % 2 === 0 &&
        item.positions.length / 2 <= TILE_TYPES.length
      );
      const layout = shuffle(layoutChoices.length ? layoutChoices : LAYOUTS)[0];
      const positions = layout.positions;
      const pairCount = positions.length / 2;
      const selectedTypes = shuffle(TILE_TYPES).slice(0, pairCount);
      const pool = shuffle(selectedTypes.flatMap((type) => [type.id, type.id]));
      const nextState = {
        version: SAVE_VERSION,
        layout: layout.id,
        tiles: positions.map((position, index) => ({
          id: `tile-${index}`,
          type: pool[index],
          removed: false,
          ...position
        })),
        won: false
      };

      if (availableMatchesFor(nextState.tiles).length) return nextState;
    }

    return freshStateFallback();
  }

  function shuffle(items) {
    const shuffled = items.slice();
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
    }
    return shuffled;
  }

  function cloneState(source) {
    return JSON.parse(JSON.stringify(source));
  }

  function saveState() {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadState() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
      const layout = LAYOUTS.find((item) => item.id === saved?.layout);
      if (!saved || saved.version !== SAVE_VERSION || !layout || !Array.isArray(saved.tiles) || saved.tiles.length !== layout.positions.length) return null;
      return saved;
    } catch {
      return null;
    }
  }

  function getStoredTheme() {
    try {
      const theme = localStorage.getItem(THEME_KEY);
      return THEMES.has(theme) ? theme : "colorblind";
    } catch {
      return "colorblind";
    }
  }

  function applyTheme() {
    document.body.dataset.theme = getStoredTheme();
  }

  function rememberUndo() {
    undoSnapshot = cloneState(state);
    els.undo.disabled = false;
  }

  function activeTiles() {
    return state.tiles.filter((tile) => !tile.removed);
  }

  function activeTilesFor(tiles) {
    return tiles.filter((tile) => !tile.removed);
  }

  function tileById(id) {
    return state.tiles.find((tile) => tile.id === id) || null;
  }

  function hasCoveringTile(tile) {
    return activeTiles().some((other) =>
      other.layer > tile.layer &&
      Math.abs(other.col - tile.col) < 1 &&
      Math.abs(other.row - tile.row) < 1
    );
  }

  function hasCoveringTileFor(tiles, tile) {
    return activeTilesFor(tiles).some((other) =>
      other.layer > tile.layer &&
      Math.abs(other.col - tile.col) < 1 &&
      Math.abs(other.row - tile.row) < 1
    );
  }

  function sideBlocked(tile, direction) {
    return activeTiles().some((other) =>
      other.id !== tile.id &&
      other.layer === tile.layer &&
      Math.abs(other.row - tile.row) < 0.76 &&
      Math.abs(other.col - (tile.col + direction)) < 0.12
    );
  }

  function sideBlockedFor(tiles, tile, direction) {
    return activeTilesFor(tiles).some((other) =>
      other.id !== tile.id &&
      other.layer === tile.layer &&
      Math.abs(other.row - tile.row) < 0.76 &&
      Math.abs(other.col - (tile.col + direction)) < 0.12
    );
  }

  function isFree(tile) {
    if (!tile || tile.removed || hasCoveringTile(tile)) return false;
    return !sideBlocked(tile, -1) || !sideBlocked(tile, 1);
  }

  function isFreeFor(tiles, tile) {
    if (!tile || tile.removed || hasCoveringTileFor(tiles, tile)) return false;
    return !sideBlockedFor(tiles, tile, -1) || !sideBlockedFor(tiles, tile, 1);
  }

  function availableMatches() {
    return availableMatchesFor(state.tiles);
  }

  function availableMatchesFor(tiles) {
    const freeTiles = activeTilesFor(tiles).filter((tile) => isFreeFor(tiles, tile));
    const matches = [];
    for (let firstIndex = 0; firstIndex < freeTiles.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < freeTiles.length; secondIndex += 1) {
        if (freeTiles[firstIndex].type === freeTiles[secondIndex].type) {
          matches.push([freeTiles[firstIndex], freeTiles[secondIndex]]);
        }
      }
    }
    return matches;
  }

  function freshStateFallback() {
    const layout = LAYOUTS[0];
    const positions = layout.positions;
    const pairCount = positions.length / 2;
    const selectedTypes = TILE_TYPES.slice(0, pairCount);
    const pool = selectedTypes.flatMap((type) => [type.id, type.id]);
    return {
      version: SAVE_VERSION,
      layout: layout.id,
      tiles: positions.map((position, index) => ({
        id: `tile-${index}`,
        type: pool[index],
        removed: false,
        ...position
      })),
      won: false
    };
  }

  function clear(element) {
    while (element.firstChild) element.removeChild(element.firstChild);
  }

  function tileElement(tile) {
    const type = tileType(tile);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tile";
    button.dataset.tileId = tile.id;
    button.dataset.family = type.family;
    button.dataset.rank = type.rank;
    button.dataset.pattern = String((TILE_TYPES.findIndex((item) => item.id === type.id) % 6) + 1);
    button.dataset.layer = String(tile.layer);
    button.style.setProperty("--col", String(tile.col));
    button.style.setProperty("--row", String(tile.row));
    button.style.setProperty("--layer", String(tile.layer));
    button.setAttribute("aria-label", type.label ? t(type.label) : type.name);

    const free = isFree(tile);
    button.classList.toggle("free", free);
    button.disabled = !free;
    if (selectedId === tile.id) button.classList.add("selected");
    if (String(type.rank).length > 1) button.classList.add("long-rank");

    const face = document.createElement("span");
    face.className = "tile-face";

    const rank = document.createElement("span");
    rank.className = "tile-rank";
    rank.textContent = type.rank;

    const mark = document.createElement("span");
    mark.className = "tile-mark";
    mark.textContent = type.mark;

    const suit = document.createElement("span");
    suit.className = "tile-suit";
    suit.textContent = type.short;

    face.append(rank, mark, suit);
    button.appendChild(face);
    button.addEventListener("click", onTileClick);
    button.addEventListener("dblclick", (event) => event.preventDefault());
    return button;
  }

  function render() {
    clear(els.board);
    const layout = currentLayout();
    els.board.style.setProperty("--layout-cols", String(layout.cols));
    els.board.style.setProperty("--layout-rows", String(layout.rows));
    state.tiles
      .filter((tile) => !tile.removed)
      .sort((first, second) => first.layer - second.layer || first.row - second.row || first.col - second.col)
      .forEach((tile) => els.board.appendChild(tileElement(tile)));

    const remaining = activeTiles().length / 2;
    const matches = availableMatches();
    els.status.textContent = state.won
      ? t("complete")
      : matches.length
        ? t("mahjongPairsLeft", { count: remaining })
        : t("mahjongNoMoves");
    els.win.hidden = !state.won;
    saveState();
  }

  function onTileClick(event) {
    event.preventDefault();
    const tile = tileById(event.currentTarget.dataset.tileId);
    if (!isFree(tile) || state.won) return;

    if (!selectedId) {
      selectedId = tile.id;
      render();
      return;
    }

    const selected = tileById(selectedId);
    if (selected && selected.id !== tile.id && selected.type === tile.type && isFree(selected)) {
      rememberUndo();
      selected.removed = true;
      tile.removed = true;
      selectedId = null;
      updateWin();
      render();
      return;
    }

    selectedId = selectedId === tile.id ? null : tile.id;
    render();
  }

  function updateWin() {
    state.won = state.tiles.every((tile) => tile.removed);
  }

  function startNewGame() {
    state = freshState();
    selectedId = null;
    undoSnapshot = null;
    els.undo.disabled = true;
    render();
  }

  function undo() {
    if (!undoSnapshot) return;
    state = cloneState(undoSnapshot);
    selectedId = null;
    undoSnapshot = null;
    els.undo.disabled = true;
    render();
  }

  function applyLanguage() {
    if (window.LMAG_I18N) window.LMAG_I18N.apply(document);
    render();
  }

  function preventBrowserDoubleClick(event) {
    const now = Date.now();
    if (now - lastTapAt < 420) event.preventDefault();
    lastTapAt = now;
  }

  function preventViewportMove(event) {
    event.preventDefault();
  }

  function preventGestureZoom(event) {
    event.preventDefault();
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("../../sw.js").catch(() => {});
      });
    }
  }

  els.newGame.addEventListener("click", startNewGame);
  els.undo.addEventListener("click", undo);
  document.addEventListener("contextmenu", (event) => event.preventDefault());
  document.addEventListener("dblclick", preventBrowserDoubleClick, { capture: true });
  document.addEventListener("dragstart", (event) => event.preventDefault());
  document.addEventListener("touchmove", preventViewportMove, { passive: false });
  document.addEventListener("gesturestart", preventGestureZoom);
  document.addEventListener("gesturechange", preventGestureZoom);
  document.addEventListener("gestureend", preventGestureZoom);
  document.addEventListener("lmag:languagechange", applyLanguage);

  applyTheme();
  state = loadState() || freshState();
  updateWin();
  render();
  registerServiceWorker();
})();
