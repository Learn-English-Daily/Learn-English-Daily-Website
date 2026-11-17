import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const targets = [join(root, "src"), join(root, "package.json")];
const forbidden = [
  ["MongoDB dependency or access", /mongodb|getMongoDb|MONGODB_URI/i],
  ["Production API route", /(?:fetch\s*\(|axios\.|action=)[^\n]*\/api\//i],
  ["Production authentication cookie", /lead_(?:admin|teacher|finance)_session/i],
  ["External contact or meeting action", /wa\.me|api\.whatsapp|meet\.google\.com/i],
];

function files(path) {
  if (statSync(path).isFile()) return [path];
  return readdirSync(path).flatMap((name) => files(join(path, name)));
}

const findings = [];
for (const file of targets.flatMap(files)) {
  const source = readFileSync(file, "utf8");
  for (const [label, pattern] of forbidden) {
    if (pattern.test(source)) findings.push(`${label}: ${relative(root, file)}`);
  }
}

if (findings.length) {
  console.error("Demo isolation check failed:\n" + findings.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("Demo isolation check passed: no database, production API/auth, or contact integrations found.");
