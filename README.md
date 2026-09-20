# DHDE Field Survey

A phone-first field survey app for the Sakura Science / DHDE tourism fieldwork team (University of Fukui). Covers the Osaka/Kyoto, Fukui-heartland, and Kanazawa fieldwork days ahead of the Fukui suppressed-demand crowd-flow model.

**Live app:** https://dhde-tourism-ai.github.io/site-visits/ *(see "Going live" below — one setting needs to be flipped by an org owner)*

Open that link on your phone, add it to your home screen, and pick your name — no install, no account.

## What it does

- **Today** — pick the day (21/23/24 Sep, 2 Oct) to see that day's schedule, why it matters for the DHDE model, and field-conduct notes. No fixed roles — split up by category naturally when you arrive.
- **Survey** — pick a site for the selected day and one of 8 categories: crowd count, bottlenecks & flow, multilingual signage, prayer & rest spaces, food & beverage census, **Intercept Survey**, photo log, spot tracker.
- **Intercept Survey** — pick who you're talking to (Business/Shop Owner, Staff, or Tourist/Visitor) and the right question set appears, in English with Japanese underneath so you can show the screen if that helps:
  - *Business/Shop Owner*: 6 multiple-choice questions (daily traffic, tourist share, busiest times, language support, payment methods, year-over-year trend) plus one open-ended question on their biggest challenge.
  - *Staff*: 4 open-ended questions about what visitors ask and struggle with.
  - *Tourist/Visitor*: 5 open-ended questions about purpose, confusion points, friction, and what would improve their visit.
  - Any survey can carry an optional 60-second voice note instead of (or alongside) typed notes.
- **Camera assist** — the crowd-count field has an optional on-device flow counter: draw a line across the path, and it tallies crossings for 60 seconds using a TensorFlow.js object-detection model running entirely in the browser.
- **Spot Tracker** — box in a single photo spot and the phone watches it hands-free, logging how long each visitor or pair occupies it and how many people were there at once, until you stop.
- **Log** — everyone's entries on this device, filterable by day/site/person, with JSON/CSV export (of whatever's currently filtered) and a paste-to-merge importer.
- **Dashboard** — live coverage stats, entries by category, per-person contribution counts (tap a name to jump to their entries), and automatic gap flags for categories nobody has logged yet at a given site.

## How data moves between phones — and how nothing gets lost

There is no backend and no login beyond picking your name — free to host, no API keys, and nobody's photos, voice notes, or camera feed ever leave their phone except when they choose to export. Everything (including embedded photos and audio) is saved to that phone's local storage.

Two layers of backup:

1. **Per-person, per-break**: open **Log → Export shown (JSON)**, send the file to whoever is compiling (AirDrop, LINE, email — anything), and have them **Merge in a teammate's export** on their own phone. Do this after every site. Exports respect whatever filter is active, so you can export just your own entries, just one day, or everything.
2. **Durable, versioned copy in this repo**: whoever is compiling can run the merge script locally (not in the app — this keeps write access off any phone) to fold everyone's exports into one file and commit it:

   ```bash
   node scripts/merge-exports.js path/to/export1.json path/to/export2.json ...
   git add data/master-log.json
   git commit -m "Merge fieldwork exports — <date>"
   git push
   ```

   This is optional per-break but recommended once a day — it means the full dataset lives in git history, not just on one phone, and anyone can `git pull` to get the latest master log.

## Computer vision notes

Both the flow counter and the spot tracker run [TensorFlow.js](https://www.tensorflow.org/js) with the `coco-ssd` object detection model, loaded from a CDN the first time you open the app (needs wifi/data once), then cached by a service worker so it keeps working offline for the rest of the day. Detection happens entirely on-device — no video or image is ever uploaded anywhere.

These are assistive estimates from a general-purpose person detector on a phone camera, not a calibrated sensor. In dense crowds it will undercount overlapping people. Spot-check both features against a manual tally occasionally, and always trust your own eyes over the number if they disagree.

## Going live (one-time setup for an org owner)

This repo was created private. GitHub Pages needs either a public repo, or a paid plan (GitHub Pro/Team/Enterprise) that supports Pages on private repos. To go live at `https://dhde-tourism-ai.github.io/site-visits/`:

```bash
gh repo edit dhde-tourism-ai/site-visits --visibility public --accept-visibility-change-consequences
gh api repos/dhde-tourism-ai/site-visits/pages -X POST --input - <<'EOF'
{"source":{"branch":"main","path":"/"}}
EOF
```

Or via the web UI: **Settings → General → Danger Zone → Change visibility → Public**, then **Settings → Pages → Source: Deploy from a branch → `main` / `(root)`**. Live within a minute or two after that.

If you'd rather keep the repo private, check whether the `dhde-tourism-ai` org is on GitHub Team (some GitHub Education/Campus benefits include this) — if so, Pages can be enabled without changing visibility.

## Editing / redeploying

Single static site (`index.html`, `sw.js`, `manifest.json`, `icon.svg`), no build step. Edit and push to `main` — GitHub Pages redeploys automatically within a minute or two.

If you change the app logic, bump the cache name at the top of `sw.js` (`dhde-field-survey-v2` → `v3`, etc.) so phones that already cached the old version pick up the change.

To add another fieldwork day: add an entry to the `DAYS` array near the top of the script in `index.html` (date, label, `sites`, `schedule`) — everything else (Today/Survey/Log/Dashboard) picks it up automatically, and the app auto-selects whichever day matches the phone's current date.

## Related

- Monday board: [DHDE Build](https://virufy.monday.com/boards/18428212892)
