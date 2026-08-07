# iOS Store Prep

This project is currently a static web/PWA version of the app. It is ready for browser play and home-screen installation, but native store release requires platform packaging.

## Current Build Status

Ready:

- Offline-capable PWA shell
- Web app manifest
- iPhone home-screen metadata
- App icons at 180, 192, and 512 px
- No ads
- No accounts
- No analytics
- No tracking scripts
- No external network calls except service worker requests for same-origin app files
- Mobile portrait and landscape layouts
- Separate game folders under `games/`
- Klondike Solitaire
- FreeCell
- Spider Solitaire
- Pyramid Solitaire
- Tri-Peaks Solitaire
- Golf Solitaire
- Yukon Solitaire
- Rummy (basic local build)
- Gin Rummy (basic local build)
- Hearts (basic local build)
- Spades (basic local build)
- 83-Maine's Card Game (local pass-and-play rule build)
- Cribbage (basic local build)
- Per-game controls and persistence
- Local/session persistence

Rummy, Gin Rummy, Hearts, and Spades are intentionally first-pass builds. Their
folders, launch pages, card/turn scaffolding, and basic local interactions are
present; full rules, scoring, suit-following, and computer or partner AI remain
later development work. 83-Maine's Card Game has the core Maine rule flow for
local pass-and-play, while AI partnerships and deeper rule-variant testing remain.

Needs before store submission:

- Final app icon artwork
- Screenshots
- Store listing copy
- Support URL
- Hosted privacy policy URL
- Age rating answers
- Real-device test pass
- Final native iOS wrapper testing/signing

## iOS Path

Native iOS App Store release requires macOS and Xcode.

Current wrapper:

- Capacitor iOS project in `ios/`
- Source files are copied into a clean generated `www/` folder with `npm run prepare:ios`
- Xcode receives the current app files with `npm run sync:ios`
- Rebuild, sync, and open the Xcode workspace with `npm run open:ios`
- Test on real iPhone and iPad in portrait and landscape
- Distribute through TestFlight before App Review

Fresh Mac clone:

1. Install Node.js.
2. Install Xcode from the Mac App Store.
3. Clone the repository.
4. Run `npm install`. This automatically rebuilds the complete `www/` bundle.
5. Run `npm run open:ios`.
6. In Xcode, choose a team/signing profile and test on a simulator or real device.

The `open:ios` command always clears and rebuilds `www/` before Capacitor syncs,
then removes `ios/App/App/public/` before Capacitor copies the new bundle, so
stale or incomplete web files cannot silently carry into the iPhone build.
Do not manually copy files into `www/` or `ios/App/App/public/`; both folders are
generated from the root web app files.

Apple requirement to account for:

- Check the current Xcode and SDK requirement before uploading to App Store Connect.

## Recommended Next Milestones

1. Confirm the GitHub Pages version is stable.
2. Use Lighthouse or Chrome DevTools to verify PWA installability.
3. Create final app icon artwork.
4. Capture phone screenshots.
5. Keep the Capacitor iOS wrapper synced with `npm run sync:ios`.
6. Create store accounts:
   - Apple Developer Program
7. Run beta testing:
   - TestFlight for iOS
