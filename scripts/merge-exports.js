#!/usr/bin/env node
// Merge one or more exported JSON files from the DHDE Field Survey app into
// a single master log, deduplicated by entry id, and write it to
// data/master-log.json. Run this locally (never in the app itself) and
// commit the result — that gives the team a durable, versioned copy of
// everyone's data that isn't just sitting on one phone.
//
// Usage:
//   node scripts/merge-exports.js path/to/export1.json path/to/export2.json ...
//   git add data/master-log.json
//   git commit -m "Merge fieldwork exports"
//   git push

const fs = require("fs");
const path = require("path");

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: node scripts/merge-exports.js <export1.json> [export2.json ...]");
  process.exit(1);
}

const outPath = path.join(__dirname, "..", "data", "master-log.json");
let master = [];
if (fs.existsSync(outPath)) {
  master = JSON.parse(fs.readFileSync(outPath, "utf8"));
}
const byId = new Map(master.map((e) => [e.id, e]));

let added = 0;
for (const file of files) {
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const entries = Array.isArray(raw) ? raw : [raw];
  for (const e of entries) {
    if (!e || !e.id) continue;
    if (!byId.has(e.id)) added++;
    byId.set(e.id, e); // last file wins on conflict, otherwise just fills gaps
  }
}

const merged = Array.from(byId.values()).sort((a, b) => new Date(a.ts) - new Date(b.ts));
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(merged, null, 2));

console.log(`Merged ${files.length} file(s): ${added} new entries added, ${merged.length} total in data/master-log.json`);
