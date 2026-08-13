# Release Verification Report · 3.2.0

Verification date: **August 13, 2026**

This report distinguishes local source/build verification from the account, signing, store-console, and real-device work that still must happen before public release.

## Verified game source

- All **31** launcher entries have a matching self-contained game folder.
- Every game folder contains its own `index.html`, `styles.css`, and `app.js`; no game imports source from another game folder.
- All 31 game scripts passed JavaScript syntax validation and all launcher/offline-cache entries matched their local files.
- All **16** computer-opponent games expose Easy, Medium, and Hard choices and apply the selected difficulty to their own local decision code. Chess retains its additional Grandmaster choice.
- Rummy, Gin Rummy, Hearts, Spades, Cribbage, and 83-Maine's Card Game passed focused distinct-rule checks.
- Deterministic checks passed for seven-card Rummy, perfect-hand Rummy go-out, separate Gin Rummy deals/deadwood, Ace-low melds, three-player Hearts with 26 points in play, 83 trump/follow rules, protected 83 scoring trumps, Ace-low Cribbage runs, and the 29-point Cribbage hand.
- Regression checks now also cover Rummy's one-card showdown and prevent any fifth card from entering a completed 83 trick.
- All games now use durable local saves rather than temporary tab-only storage. Live reload checks restored an active Rummy turn, a four-entry 83 auction, and an older 2048 board; Continue Last Game reopened the restored Rummy deal.
- All six pass-and-play hand games provide Dealt order, Group by suit, and Group by rank controls. Restored local hands are re-hidden until the active player reveals them.
- A browser load audit covered all 31 games plus the privacy and support pages without page-load failures or console errors.
- Fresh browser flows verified the final three-player Hearts handoff: only Player 1's hand was initially visible, all hands became hidden after Player 1 played 2♣, and only Player 2's hand appeared after Player 2 pressed the reveal button.
- A fresh browser flow verified 83 bidding, computer counterbids, the kitty/trump transition, protected-trump discarding, computer partner processing, and entry into six-card trick play.

These checks are finite automated and browser tests. They do not prove perfect strategy over every possible deal or replace long-play human testing.

## Verified shared and native bundles

- The generated web bundle completed successfully.
- Android and iOS contain byte-for-byte copies of the same **105** generated web files.
- Offline cache identifier: `leave-me-alone-games-v98`, with cache-busted final card-game and launcher files.
- Version and package identity are synchronized as `3.2.0` / Android code `32` / `com.loonmaterials.leavemealonegames`.
- Matching 2♦ launcher icons and launch screens replaced the native Capacitor placeholders.

## Android build result

- Gradle `bundleRelease` completed successfully, including release lint checks.
- Bundle: `android/app/build/outputs/bundle/release/app-release.aab`
- Size: **5,692,824 bytes**
- SHA-256: `DE35C2011DB559FE8035002C94796AA1751403D93950EAB2BDFFFFCD4E4E0559`
- Merged manifest verified version `3.2.0`, code `32`, target API `36`, backups disabled, cleartext traffic disabled, and no `android.permission.INTERNET` request.
- Bundle contents were opened and spot-checked for the current `v98` offline cache plus the final Hearts and 83 game programs.
- Signature inspection result: **unsigned**. This is intentional because no private upload keystore was supplied to the workspace.

The bundle is a verified unsigned release artifact, not the final Play Console upload. It still needs the owner's private upload key, Google Play internal-track acceptance, and installation tests on real or representative Android devices.

## iOS structural result

- Info.plist and PrivacyInfo.xcprivacy parsed as valid property lists.
- Display name, bundle identifier, iPhone/iPad family, version/build, `arm64` capability, no-non-exempt-encryption declaration, and no-tracking/no-collected-data privacy declarations were verified.
- The privacy manifest and opaque App Store icon are referenced by the Xcode project.
- Capacitor Swift Package Manager dependency is pinned to `8.5.0`.

This was a Windows structural audit only. A Mac with the currently required Xcode/iOS SDK must compile, sign, archive, validate, upload, and install the app through TestFlight before App Store submission.

## Prepared store materials

- App Store and Google Play descriptions, keywords, release notes, privacy/data answers, rating guidance, and submission checklist
- Opaque 1024 × 1024 master and iOS icon
- Google Play 512 × 512 icon and 1024 × 500 feature graphic
- Matching native launcher and splash artwork
- Public privacy and support pages ready for hosting

Final store screenshots are intentionally not fabricated. Capture them from the signed release builds. The expected GitHub Pages privacy and support URLs must be deployed and verified as public HTTPS pages before either submission.

## Remaining release gates

1. Create and securely back up the Android upload keystore, then rebuild and verify a signed AAB.
2. Upload to Google Play Internal testing and install the Play-generated build on representative phone and large-screen hardware.
3. Build/archive on a Mac, upload to App Store Connect, and install the processed build through TestFlight on iPhone and iPad.
4. Capture final screenshots from those release builds.
5. Publish and verify the privacy/support URLs.
6. Complete both stores' current privacy, content/age rating, target audience, app access, agreements, and review forms.

Public publishing should remain **no-go** until all six gates are complete.
