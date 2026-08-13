# Leave Me Alone Games

Leave Me Alone Games 3.2.0 is a quiet, offline-first collection of 31 card, board, dice, solitaire, and puzzle games. It has no ads, accounts, analytics, tracking, subscriptions, or in-app purchases.

## Release status

- Web/PWA source and offline cache are included.
- The Android wrapper is in `android/` and targets Android API 36.
- The iOS wrapper is in `ios/` and targets iPhone and iPad on iOS 15 or later.
- Native wrappers use the package ID `com.loonmaterials.leavemealonegames`.
- Version 3.2.0 store copy and publishing checklists are in `store-assets/`.
- Android can be packaged and checked on Windows; a final signed release needs the private upload key.
- iOS source can be structurally checked on Windows, but archiving, signing, TestFlight, and real-device validation require a Mac and Xcode.

## Games

### Card and solitaire

Klondike, FreeCell, Spider, Pyramid, Tri-Peaks, Golf, Yukon, Rummy, Gin Rummy, Hearts, Spades, and 83-Maine's Card Game.

### Board and table

Chess, Checkers, Mahjong, Dominoes, Reversi, Backgammon, Connect 4, Tic-Tac-Toe, and Cribbage.

### Dice

Yacht, Farkle, and Shut the Box.

### Puzzles

Sudoku, Kakuro, Peg Solitaire, Mastermind, Nonograms, 2048, and Lights Out.

## Computer play and local play

Computer-opponent games provide Easy, Medium, and Hard choices. Chess also includes Grandmaster. The newest strategy pass adds meld and discard evaluation to Rummy and Gin Rummy, passing and trick strategy to Hearts, partnership contract play to Spades and 83, crib/pegging evaluation to Cribbage, and perfect-play minimax to hard Tic-Tac-Toe.

Rummy, Gin Rummy, Hearts, Spades, Cribbage, and 83 keep each player’s hand private during same-device play. When a turn moves to another human, the next hand remains hidden until that player deliberately reveals it.

## Source layout

- `index.html`, `launcher.css`, and `launcher.js`: main game launcher
- `games/<game>/`: self-contained HTML, CSS, and JavaScript for one game
- `icons/`: web and home-screen icons
- `privacy.html` and `support.html`: public store-policy pages
- `scripts/build-www.js`: creates and verifies the Capacitor web bundle
- `scripts/test-all-games.js`: audits every game folder, launcher entry, offline asset, syntax, difficulty control, and private-hand control
- `scripts/test-new-games.js`: focused distinct-rule checks for Rummy, Gin Rummy, Hearts, Spades, Cribbage, and 83
- `scripts/test-release-readiness.js`: checks platform IDs, versions, privacy metadata, and release documents
- `scripts/test-native-sync.js`: proves the generated web bundle is byte-for-byte current in both native wrappers
- `scripts/generate-mobile-artwork.py`: regenerates branded native icons and launch screens from the 1024-pixel master artwork
- `android/`: native Android wrapper
- `ios/`: native iOS wrapper
- `store-assets/`: store copy and the platform publishing checklist

Every game owns its own `index.html`, `styles.css`, and `app.js`. Games do not import logic from another game folder. Generated copies in `www/`, `android/app/src/main/assets/public/`, and `ios/App/App/public/` are not source files and should not be edited by hand.

## Verify the release

Install the locked dependencies, then run:

```text
npm run release:verify
```

That command checks all games, release metadata, and the generated offline bundle. Focused game checks can be run with `npm run test:games`; release metadata can be checked with `npm run test:release`.

## Android

Prepare and sync the current source with:

```text
npm run sync:android
```

For a signed release, copy `android/upload-keystore.properties.example` to the ignored private file `android/upload-keystore.properties`, fill in the upload-key values, and build the `bundleRelease` task in Android Studio or Gradle. Upload the resulting signed AAB to Play Console internal testing before production.

## iOS

On a Mac with the currently required Xcode and iOS SDK:

```text
npm install
npm run sync:ios
```

Open `ios/App/App.xcodeproj`, select the Apple team, test on iPhone and iPad, archive, validate, and upload to App Store Connect. Use TestFlight before App Review.

## Privacy and publishing

The native apps package their game files locally and do not request Android Internet access. Preferences and current-session state stay on the device. See [PRIVACY.md](PRIVACY.md), [privacy.html](privacy.html), [STORE_PREP.md](STORE_PREP.md), [store-assets/PUBLISHING_CHECKLIST.md](store-assets/PUBLISHING_CHECKLIST.md), and [store-assets/VERIFICATION_REPORT.md](store-assets/VERIFICATION_REPORT.md).
