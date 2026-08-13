# iOS and Google Play Store Preparation

Version 3.2.0 is organized as one authoritative set of 31 self-contained game folders plus separate Capacitor wrappers for iOS and Android.

## Prepared here

- App name: Leave Me Alone Games
- Bundle/application ID: `com.loonmaterials.leavemealonegames`
- iOS marketing version: 3.2.0, build 1
- Android version name: 3.2.0, version code 32
- Android target and compile SDK: API 36
- Android upload-key configuration that reads a private ignored properties file
- iOS privacy manifest declaring no tracking and no collected data
- No Android Internet permission and no automatic local-data backup
- Privacy policy and support pages ready for public hosting
- Store listing copy, privacy answers, rating guidance, release notes, and a publishing checklist
- Offline bundle and automated checks covering all game folders

Run `npm run release:verify` before creating either native release.

## Current platform requirements

Google Play requires new apps and updates submitted from August 31, 2026 onward to target Android 16 / API 36 or higher. This project already targets API 36. See Google’s [target API level requirements](https://developer.android.com/google/play/requirements/target-sdk).

Apple requires App Store uploads to use Xcode 26 or later and the iOS 26 SDK or later as of April 28, 2026. Apple’s requirements can change, so confirm the [upcoming submission requirements](https://developer.apple.com/news/upcoming-requirements/) again on release day.

## What Windows can and cannot finish

Windows can verify all web game source, build the offline bundle, sync both wrappers, inspect iOS project structure, and build an Android AAB when the matching SDK and Java tools are installed.

Windows cannot create or validate an App Store archive. The iOS release still needs a Mac for Xcode compilation, signing, simulator/real-device testing, archive validation, TestFlight, and upload.

Store-console work also remains account-bound: developer enrollment, application records, agreements, content/age questionnaires, screenshots from release builds, privacy/support URL verification, test tracks, and final submission.

## Android release path

1. Securely create the Google Play upload key.
2. Copy `android/upload-keystore.properties.example` to `android/upload-keystore.properties` and enter the private key path, alias, and passwords.
3. Run `npm run release:verify` and `npm run sync:android`.
4. Build `bundleRelease` in Android Studio or Gradle.
5. Upload the signed AAB to Play Console Internal testing and install the Play-generated artifact on real hardware.
6. Complete Data safety, Content rating, Target audience, App access, Store listing, and production access requirements.

Google Play App Signing keeps the distribution signing key while the developer signs uploads with the upload key. See [Android app signing](https://developer.android.com/studio/publish/app-signing).

## iOS release path

1. Use a Mac with the App Store’s required Xcode/iOS SDK.
2. Run `npm install` and `npm run sync:ios`.
3. Open `ios/App/App.xcodeproj`, select the Apple team, and confirm the bundle ID and version.
4. Test on current iPhone and iPad hardware, including offline launch and pass-and-play hand privacy.
5. Archive and validate in Xcode, upload to App Store Connect, and install the processed build through TestFlight.
6. Complete App Privacy, age rating, export compliance, categories, URLs, screenshots, review notes, and release controls.

## Release materials

- Store copy and console answers: `store-assets/STORE_LISTING.md`
- Full account/device checklist: `store-assets/PUBLISHING_CHECKLIST.md`
- Exact verified results and remaining release gates: `store-assets/VERIFICATION_REPORT.md`
- Privacy page: `privacy.html`
- Support page: `support.html`
- Markdown privacy source: `PRIVACY.md`

The expected GitHub Pages URLs in the listing document are not claimed as live until the updated site is deployed and checked without signing in.
