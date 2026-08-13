# Publishing Checklist · Version 3.2.0

This repository prepares one shared set of self-contained game folders and separate native wrappers in `ios/` and `android/`.

## Completed in the repository

- 31 standalone game folders, each with its own HTML, CSS, and JavaScript
- Offline web bundle and Capacitor wrappers
- iOS and Android package ID: `com.loonmaterials.leavemealonegames`
- Release version: `3.2.0`
- Android version code: `32`
- Android target and compile SDK: API 36
- No Android Internet permission
- Android backups disabled for local game state
- iOS privacy manifest declaring no tracking or collected data
- iOS export-compliance declaration for no non-exempt encryption
- Public privacy-policy and support pages ready to host
- Store description, short description, keywords, release notes, and privacy answers
- Matching branded launcher icons and launch screens in both native wrappers
- Automated all-game, standalone-rule, release-metadata, and offline-bundle checks

## One-time account work

- Enroll in the Apple Developer Program and create the App Store Connect app record.
- Create the Google Play Console app record and complete developer verification.
- Confirm that `com.loonmaterials.leavemealonegames` is the final permanent application ID on both stores.
- Publish `privacy.html` and `support.html` at stable HTTPS URLs and verify both pages without signing in.
- Create and securely back up the Android upload keystore. Never commit it or its passwords.

## Android release

1. Copy `android/upload-keystore.properties.example` to `android/upload-keystore.properties` and replace every sample value. Store the `.jks` file in a secure private location.
2. Run the release checks and sync the current web bundle: `npm run release:verify`, `npm run sync:android`, and `npm run test:native-sync`.
3. In `android/`, build `bundleRelease` with Android Studio or Gradle.
4. Confirm the resulting `.aab` is signed with the upload key and install/test an artifact from Play Console internal testing on at least one phone and one tablet or large-screen emulator.
5. Upload the signed AAB, complete App content, Data safety, Content rating, Store listing, App access, and target-audience forms, then submit first to Internal testing.

## iOS release

1. Use a Mac with the App Store’s currently required Xcode and iOS SDK.
2. Run `npm install`, `npm run sync:ios`, `npm run test:native-sync`, and open `ios/App/App.xcodeproj`.
3. Select the Apple development team and confirm the bundle identifier and version/build number.
4. Build and test on a current iPhone and iPad, including launch, offline use, hand privacy, rotation on iPad, Reset App Data, and several complete computer-opponent games.
5. Archive with Xcode, validate the archive, upload to App Store Connect, and test the processed build through TestFlight.
6. Complete App Privacy, the current age-rating questionnaire, export compliance, category, screenshots, support URL, privacy URL, description, keywords, and review notes before submitting for review.

## Screenshot plan

Use real release builds for the final store captures. Suggested screens:

1. Main menu showing the breadth of the collection
2. Hearts showing private four-player card play
3. Spades showing bids and team scores
4. Cribbage showing pegging and the starter card
5. Chess or Backgammon showing adjustable computer difficulty
6. A puzzle screen such as Sudoku or Nonograms

Do not include debugging controls, browser chrome, placeholder copy, or personal notifications in final screenshots.

## Final go/no-go check

- Automated checks pass from a clean checkout.
- Android AAB is signed, accepted by Play Console, and passes internal-track installation.
- Xcode archive validates and the TestFlight build installs on real Apple hardware.
- Privacy and support URLs are live.
- Store screenshots come from the release builds.
- All store declarations match the actual app and bundled SDK behavior.
