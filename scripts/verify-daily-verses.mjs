// Compares public/daily-verses.json against bible-api.com's WEB text and
// reports any differences. Run with: node scripts/verify-daily-verses.mjs
import { readFile } from "node:fs/promises";

const file = JSON.parse(await readFile(new URL("../public/daily-verses.json", import.meta.url), "utf8"));
const normalize = (s) => s.replace(/\s+/g, " ").trim();
let mismatches = 0;

for (const verse of file.verses) {
  const url = `https://bible-api.com/${encodeURIComponent(verse.reference)}?translation=${file.translation.toLowerCase()}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || data.error) {
    console.log(`? ${verse.reference}: lookup failed (${data.error ?? response.status})`);
    mismatches++;
    continue;
  }
  if (normalize(data.text) !== normalize(verse.text)) {
    mismatches++;
    console.log(`✗ ${verse.reference}\n  file: ${normalize(verse.text)}\n  api:  ${normalize(data.text)}`);
  }
}
console.log(mismatches ? `${mismatches} of ${file.verses.length} differ.` : `All ${file.verses.length} verses match.`);
process.exitCode = mismatches ? 1 : 0;
