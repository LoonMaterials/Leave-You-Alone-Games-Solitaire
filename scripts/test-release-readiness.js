const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const expectedVersion = "3.2.0";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function fail(message) {
  throw new Error(message);
}

const packageJson = JSON.parse(read("package.json"));
const androidGradle = read("android/app/build.gradle");
const androidManifest = read("android/app/src/main/AndroidManifest.xml");
const androidVariables = read("android/variables.gradle");
const androidIconBackground = read("android/app/src/main/res/values/ic_launcher_background.xml");
const infoPlist = read("ios/App/App/Info.plist");
const xcodeProject = read("ios/App/App.xcodeproj/project.pbxproj");
const privacyManifest = read("ios/App/App/PrivacyInfo.xcprivacy");
const storeListing = read("store-assets/STORE_LISTING.md");

function pngInfo(relativePath) {
  const contents = fs.readFileSync(path.join(root, relativePath));
  if (contents.toString("hex", 0, 8) !== "89504e470d0a1a0a") fail(`${relativePath} is not a PNG`);
  return {
    width: contents.readUInt32BE(16),
    height: contents.readUInt32BE(20),
    colorType: contents[25],
  };
}

if (packageJson.version !== expectedVersion) fail(`package.json must use ${expectedVersion}`);
for (const name of ["@capacitor/android", "@capacitor/cli", "@capacitor/core", "@capacitor/ios"]) {
  if (packageJson.dependencies[name] !== "8.5.0") fail(`${name} must be pinned to 8.5.0`);
}
if (!androidGradle.includes('versionName "3.2.0"')) fail("Android versionName is not 3.2.0");
if (!/versionCode\s+32\b/.test(androidGradle)) fail("Android versionCode is not 32");
if (!androidVariables.includes("compileSdkVersion = 36") || !androidVariables.includes("targetSdkVersion = 36")) fail("Android must compile and target API 36");
if (/android\.permission\.INTERNET/.test(androidManifest)) fail("Offline release should not request Internet permission");
if (!androidManifest.includes('android:allowBackup="false"')) fail("Android local game data backup must be disabled");
if (!androidIconBackground.includes("#06532A")) fail("Android adaptive icon still has the placeholder background");
if (!infoPlist.includes("Leave Me Alone Games")) fail("iOS display name is incorrect");
if (!infoPlist.includes("ITSAppUsesNonExemptEncryption")) fail("iOS export-compliance declaration is missing");
if (!infoPlist.includes("<string>arm64</string>") || infoPlist.includes("<string>armv7</string>")) fail("iOS required architecture must be arm64");
if (!xcodeProject.includes("MARKETING_VERSION = 3.2.0;")) fail("iOS marketing version is not 3.2.0");
if (!read("ios/App/CapApp-SPM/Package.swift").includes('exact: "8.5.0"')) fail("iOS Capacitor package is not 8.5.0");
if (!xcodeProject.includes("PrivacyInfo.xcprivacy in Resources")) fail("iOS privacy manifest is not packaged");
if (!privacyManifest.includes("NSPrivacyTracking") || !privacyManifest.includes("<false/>")) fail("iOS privacy manifest is incomplete");

for (const file of ["privacy.html", "support.html", "PRIVACY.md", "store-assets/STORE_LISTING.md", "store-assets/PUBLISHING_CHECKLIST.md", "store-assets/VERIFICATION_REPORT.md"]) {
  if (!fs.existsSync(path.join(root, file))) fail(`Release file is missing: ${file}`);
}
for (const image of ["store-assets/app-icon-1024.png", "store-assets/google-play/icon-512.png", "store-assets/google-play/feature-graphic-1024x500.png", "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-Opaque-1024.png"]) {
  if (!fs.existsSync(path.join(root, image))) fail(`Release image is missing: ${image}`);
}
if (!read("ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json").includes("AppIcon-Opaque-1024.png")) fail("iOS is not using the opaque App Store icon");
const icon1024 = pngInfo("store-assets/app-icon-1024.png");
const playIcon = pngInfo("store-assets/google-play/icon-512.png");
const feature = pngInfo("store-assets/google-play/feature-graphic-1024x500.png");
const androidIcon = pngInfo("android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png");
const androidForeground = pngInfo("android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png");
const androidSplash = pngInfo("android/app/src/main/res/drawable-port-xxhdpi/splash.png");
const iosSplash = pngInfo("ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png");
if (icon1024.width !== 1024 || icon1024.height !== 1024 || icon1024.colorType !== 2) fail("Master icon must be opaque 1024 × 1024 RGB");
if (playIcon.width !== 512 || playIcon.height !== 512 || playIcon.colorType !== 2) fail("Play icon must be opaque 512 × 512 RGB");
if (feature.width !== 1024 || feature.height !== 500 || feature.colorType !== 2) fail("Play feature graphic must be opaque 1024 × 500 RGB");
if (androidIcon.width !== 192 || androidIcon.height !== 192 || androidIcon.colorType !== 6 || fs.statSync(path.join(root, "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png")).size < 30000) fail("Android launcher artwork was not generated from the branded icon");
if (androidForeground.width !== 432 || androidForeground.height !== 432 || androidForeground.colorType !== 6) fail("Android adaptive foreground is invalid");
if (androidSplash.width !== 960 || androidSplash.height !== 1600 || androidSplash.colorType !== 2) fail("Android branded splash screen is invalid");
if (iosSplash.width !== 2732 || iosSplash.height !== 2732 || iosSplash.colorType !== 2 || fs.statSync(path.join(root, "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png")).size < 500000) fail("iOS branded splash screen is invalid");
for (const phrase of ["Leave Me Alone Games", "No ads", "No accounts", "No tracking", "83-Maine's Card Game"]) {
  if (!storeListing.includes(phrase)) fail(`Store listing is missing: ${phrase}`);
}

console.log(`Release-readiness metadata checks passed for version ${expectedVersion}.`);
