# Leave Me Alone Games

A quiet offline game collection built with plain HTML, CSS, and JavaScript.

The app is designed for mobile-first play with no ads, accounts, tracking, analytics, or network calls.

## Games

- Klondike Solitaire: `games/klondike/`
- FreeCell: `games/freecell/`
- Spider Solitaire: `games/spider/`
- Pyramid Solitaire: `games/pyramid/`
- Tri-Peaks Solitaire: `games/tripeaks/`
- Golf Solitaire: `games/golf/`
- Yukon Solitaire: `games/yukon/`

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
- `scripts/build-www.js` - builds the Capacitor app bundle
- `manifest.webmanifest` - installable app metadata
- `sw.js` - offline cache service worker
- `icons/` - home-screen and app icons
- `ios/` - Capacitor iOS wrapper for Xcode

Each game folder owns its own page, styles, and game logic. New games should be added as separate folders under `games/`.

## Privacy

This app does not collect data.

It uses browser storage only for local game state and local settings.

There are no external requests, ads, accounts, analytics, or tracking scripts.

See [PRIVACY.md](PRIVACY.md) for the full privacy statement.

## Run Locally

Open `index.html` in a browser.

For phone testing, serve the folder with a static web server and open the served site from the phone.

## Build For Xcode

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

## Install As An App

When hosted over HTTPS, the app can be installed from supported mobile browsers.

On iPhone:

1. Open the hosted app in Safari.
2. Tap Share.
3. Tap Add to Home Screen.

## App Store Notes

This repository is currently focused on the iPhone/iOS version of the app. To submit it to the App Store, use the included Capacitor iOS wrapper and generated local app files.

See [STORE_PREP.md](STORE_PREP.md) for iOS packaging notes.
