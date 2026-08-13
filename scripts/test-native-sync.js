const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourceRoot = path.join(root, "www");
const targets = [
  path.join(root, "android", "app", "src", "main", "assets", "public"),
  path.join(root, "ios", "App", "App", "public"),
];

function filesUnder(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(fullPath) : [fullPath];
  });
}

if (!fs.existsSync(sourceRoot)) throw new Error("Run npm run build before checking native sync.");
const sourceFiles = filesUnder(sourceRoot);

for (const targetRoot of targets) {
  if (!fs.existsSync(targetRoot)) throw new Error(`Native web folder is missing: ${targetRoot}`);
  for (const source of sourceFiles) {
    const relativePath = path.relative(sourceRoot, source);
    const target = path.join(targetRoot, relativePath);
    if (!fs.existsSync(target)) throw new Error(`${path.relative(root, targetRoot)} is missing ${relativePath}`);
    if (!fs.readFileSync(source).equals(fs.readFileSync(target))) {
      throw new Error(`${path.relative(root, targetRoot)} differs at ${relativePath}`);
    }
  }
}

console.log(`Native sync audit passed for ${sourceFiles.length} bundled files on Android and iOS.`);
