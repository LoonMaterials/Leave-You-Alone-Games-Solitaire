const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "www");

const files = [
  "index.html",
  "launcher.css",
  "launcher.js",
  "i18n.js",
  "help-i18n.js",
  "manifest.webmanifest",
  "sw.js",
];

const directories = ["games", "icons"];
const textExtensions = new Set([".css", ".html", ".js", ".webmanifest"]);
const ignoredFileNames = new Set([".DS_Store", "Thumbs.db"]);

function shouldInclude(entryPath) {
  return !ignoredFileNames.has(path.basename(entryPath));
}

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (!shouldInclude(fullPath)) return [];
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

function assertSourcesExist() {
  for (const relativePath of [...files, ...directories]) {
    if (!fs.existsSync(path.join(root, relativePath))) {
      throw new Error(`Missing required source: ${relativePath}`);
    }
  }
}

function assertRelativeAssetPaths() {
  const sourceFiles = [
    ...files.map((relativePath) => path.join(root, relativePath)),
    ...directories.flatMap((relativePath) => listFiles(path.join(root, relativePath))),
  ];

  const absolutePathPatterns = [
    /\b(?:href|src)\s*=\s*["']\//i,
    /url\(\s*["']?\//i,
    /\b(?:fetch|register)\(\s*["']\//i,
  ];

  for (const source of sourceFiles) {
    if (!textExtensions.has(path.extname(source).toLowerCase())) continue;

    const contents = fs.readFileSync(source, "utf8");
    if (absolutePathPatterns.some((pattern) => pattern.test(contents))) {
      throw new Error(
        `Root-absolute asset path found in ${path.relative(root, source)}. Use a relative path instead.`,
      );
    }
  }
}

function copyFile(relativePath) {
  const source = path.join(root, relativePath);
  const target = path.join(outDir, relativePath);

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyDirectory(relativePath) {
  const source = path.join(root, relativePath);
  const target = path.join(outDir, relativePath);

  fs.cpSync(source, target, {
    recursive: true,
    force: true,
    filter: shouldInclude,
  });
}

function verifyBundle() {
  const sourceFiles = [
    ...files.map((relativePath) => path.join(root, relativePath)),
    ...directories.flatMap((relativePath) => listFiles(path.join(root, relativePath))),
  ];

  for (const source of sourceFiles) {
    const relativePath = path.relative(root, source);
    const target = path.join(outDir, relativePath);

    if (!fs.existsSync(target)) {
      throw new Error(`Bundle verification failed; missing: ${relativePath}`);
    }

    if (!fs.readFileSync(source).equals(fs.readFileSync(target))) {
      throw new Error(`Bundle verification failed; copy differs: ${relativePath}`);
    }
  }
}

assertSourcesExist();
assertRelativeAssetPaths();
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

files.forEach(copyFile);
directories.forEach(copyDirectory);
verifyBundle();

console.log("Built and verified the www app bundle.");
