# Leave Me Alone Games

A quiet offline game collection built with plain HTML, CSS, and JavaScript.

The app is designed for mobile-first play with no ads, accounts, tracking, analytics, or network calls.

## Games

### Card Games

- Klondike Solitaire: `games/klondike/`
- FreeCell: `games/freecell/`
- Spider Solitaire: `games/spider/`
- Pyramid Solitaire: `games/pyramid/`
- Tri-Peaks Solitaire: `games/tripeaks/`
- Golf Solitaire: `games/golf/`
- Yukon Solitaire: `games/yukon/`
- Rummy: `games/rummy/` (basic local build)
- Gin Rummy: `games/gin-rummy/` (basic local build)
- Hearts: `games/hearts/` (basic local build)
- Spades: `games/spades/` (basic local build)
- 83-Maine's Card Game: `games/83-maines-card-game/` (local rule build)

### Board Games

- Chess: `games/chess/`
- Checkers: `games/checkers/`
- Mahjong: `games/mahjong/`
- Dominoes: `games/dominoes/`
- Reversi: `games/reversi/`
- Backgammon: `games/backgammon-classic/`
- Connect 4: `games/connect4/`
- Tic-Tac-Toe: `games/tic-tac-toe/`
- Cribbage: `games/cribbage/` (basic local build)

### Dice and Puzzle Games

The remaining game folders contain the dice and puzzle games listed on the launcher.

## Structure

- `index.html` - app launcher
- `launcher.css` - launcher layout and visual style
- `launcher.js` - app-level service worker registration
- `i18n.js` - shared language layer
- `games/klondike/` - Klondike HTML, CSS, and JS
- `games/freecell/` - FreeCell HTML, CSS, and JS
- `games/spider/` - Spider Solitaire HTML, CSS, and JS
- `games/pyramid/` - Pyramid Solitaire HTML, CSS, and JS
- `games/tripeaks/` - Tri-Peaks Solitaire HTML, CSS, and JS
- `games/golf/` - Golf Solitaire HTML, CSS, and JS
- `games/yukon/` - Yukon Solitaire HTML, CSS, and JS
- `games/rummy/` - Rummy HTML, CSS, and JS
- `games/gin-rummy/` - Gin Rummy HTML, CSS, and JS
- `games/hearts/` - Hearts HTML, CSS, and JS
- `games/spades/` - Spades HTML, CSS, and JS
- `games/83-maines-card-game/` - 83-Maine's Card Game HTML, CSS, and JS
- `games/cribbage/` - Cribbage HTML, CSS, and JS
- `scripts/build-www.js` - builds the Capacitor app bundle
- `manifest.webmanifest` - installable app metadata
- `sw.js` - offline cache service worker
- `icons/` - home-screen and app icons
- `ios/` - Capacitor iOS wrapper for Xcode
- `android/` - Capacitor Android wrapper for Android Studio

Each game folder owns its own page, styles, and game logic. The five newest games are intentionally standalone basic builds with no shared game source files. New games should be added as separate folders under `games/`.

## Privacy

This app does not collect data.

It uses browser storage only for local game state and local settings.

There are no external requests, ads, accounts, analytics, or tracking scripts.

See [PRIVACY.md](PRIVACY.md) for the full privacy statement.

## Run Locally

Open `index.html` in a browser.

For phone testing, serve the folder with a static web server and open the served site from the phone.

## Build For iOS

The iOS wrapper loads the generated `www/` folder. That folder is not committed because it is rebuilt from the source files.

On a Mac after cloning:

1. Install Node.js.
2. Run `npm install`.
3. Run `npm run open:ios`.

`npm install` automatically creates a complete `www/` bundle. `npm run open:ios`
clears and rebuilds `www/`, removes Capacitor's previous iOS web copy, syncs the fresh files into the
Capacitor iOS project, and opens Xcode. After changing any game or launcher file,
run the same command again.

To prepare and sync without opening Xcode, run `npm run sync:ios`. To rebuild
and verify only the `www/` bundle, run `npm run prepare:ios`.

Do not move web files into `www/` or `ios/App/App/public/` manually. Both are
generated copies. The source of truth is `index.html`, the root launcher files,
`games/`, and `icons/`. Capacitor copies `www/` into `ios/App/App/public/` during
`npm run sync:ios` or `npm run open:ios`.

## Build For Android

The Android wrapper is kept separately from the iOS wrapper in `android/`.
The same standalone game folders are rebuilt into `www/`, then copied into the
Android project by Capacitor.

On a Windows or Linux development machine:

1. Install Node.js and Android Studio.
2. Run `npm install`.
3. Run `npm run open:android` to rebuild, sync, and open Android Studio.

To prepare and sync without opening Android Studio, run `npm run sync:android`.
To rebuild only the generated web bundle, run `npm run prepare:android`.

Do not manually copy files into `www/` or `android/app/src/main/assets/public/`;
both are generated copies. The source of truth remains the root launcher files,
`games/`, and `icons/`.

## Install As An App

When hosted over HTTPS, the app can be installed from supported mobile browsers.

On iPhone:

1. Open the hosted app in Safari.
2. Tap Share.
3. Tap Add to Home Screen.

## App Store Notes

This repository is currently focused on the iPhone/iOS version of the app. To submit it to the App Store, use the included Capacitor iOS wrapper and generated local app files.

See [STORE_PREP.md](STORE_PREP.md) for iOS packaging notes.
