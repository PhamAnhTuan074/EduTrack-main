const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const scanDirs = [
  path.join(rootDir, "src"),
  path.join(rootDir, "prisma")
];
const blockedPatterns = [
  /\.\$queryRawUnsafe\b/,
  /\.\$executeRawUnsafe\b/
];
const ignoredDirs = new Set(["node_modules", "migrations"]);
const checkedExtensions = new Set([".js", ".cjs", ".mjs"]);
const findings = [];

function walk(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        walk(fullPath);
      }
      continue;
    }

    if (!checkedExtensions.has(path.extname(entry.name))) {
      continue;
    }

    const content = fs.readFileSync(fullPath, "utf8");
    const lines = content.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (blockedPatterns.some((pattern) => pattern.test(line))) {
        findings.push(`${path.relative(rootDir, fullPath)}:${index + 1}: ${line.trim()}`);
      }
    });
  }
}

scanDirs.forEach(walk);

if (findings.length > 0) {
  console.error("Unsafe raw SQL usage found. Use Prisma ORM methods or parameterized tagged templates instead.");
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log("No unsafe raw SQL usage found.");
