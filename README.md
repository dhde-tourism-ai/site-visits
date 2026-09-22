# DHDE Field Survey

A phone-first field survey app for the Sakura Science / DHDE tourism fieldwork team (University of Fukui). Covers the Osaka/Kyoto, Fukui-heartland, and Kanazawa fieldwork days ahead of the Fukui suppressed-demand crowd-flow model.

**Live app:** https://dhde-tourism-ai.github.io/site-visits/

Open that link on your phone, add it to your home screen, and pick your name — no install, no account.

## What it does

- **Today** — pick the day (21/23/24 Sep, 2 Oct) to see that day's schedule, why it matters for the DHDE model, and field-conduct notes. No fixed roles — split up by category naturally when you arrive.
- **Survey** — pick a site for the selected day and one of 8 categories: crowd count, bottlenecks & flow, multilingual signage, prayer & rest spaces, food & beverage census, **Intercept Survey**, photo log, spot tracker.
- **Intercept Survey** — pick who you're talking to (Business/Shop Owner, Staff, or Tourist/Visitor) and the right question set appears, in English with Japanese underneath so you can show the screen if that helps:
  - *Business/Shop Owner*: 6 multiple-choice questions (daily traffic, tourist share, busiest times, language support, payment methods, year-over-year trend — every one includes a "Cannot answer" option) plus one open-ended question on their biggest challenge, and an optional photo of the business.
  - *Staff*: 4 open-ended questions about what visitors ask and struggle with.
  - *Tourist/Visitor*: 5 open-ended questions about purpose, confusion points, friction, and what would improve their visit.
  - Any survey can carry an optional 60-second voice note instead of (or alongside) typed notes. Japanese text throughout is sized for readability at a glance, including when showing the screen to someone else.
- **Manual tally** — the crowd-count field has an optional tap counter: point the camera at the crossing line for reference, tap once per person, and it times the gap between each one. (An earlier version tried automatic AI-based counting; it wasn't reliable in real crowds, so this replaced it — a human tap is just correct.)
- **Spot Tracker** — box in a single photo spot and the phone watches it hands-free, logging how long each visitor or pair occupies it and how many people were there at once, until you stop.
- **Photos** — Bottlenecks & Flow, Multilingual Signage, Prayer & Rest, Food & Beverage, Photo Log, and business surveys can all carry an optional photo. Every photo in the Log has a **Save photo** button with a descriptive filename (`dhde_<day>_<site>_<label>.jpg`) for saving to your camera roll.
- **Log** — everyone's entries on this device, filterable by day/site/person, with JSON/CSV export (of whatever's currently filtered) and a paste-to-merge importer.
- **Dashboard** — live coverage stats, entries by category, per-person contribution counts (tap a name to jump to their entries), and automatic gap flags for categories nobody has logged yet at a given site.

## How data moves between phones — and how nothing gets lost

There's no traditional backend to maintain — Firestore (Firebase's document database) handles live sync, and everything also lives in each phone's local storage regardless of connectivity. Login is still just picking your name — no accounts, no passwords.

**Live sync (structured data only).** The dot next to your name in the top bar turns green when connected. While it's green, every count, rating, and survey answer you save syncs to Firestore and appears on everyone else's Dashboard/Log within moments — no export needed. Firestore's client SDK queues writes locally when you're offline and flushes them automatically the moment you're back online, so it degrades gracefully to the same local-first behavior as before whenever there's no signal.

**Photos and voice notes deliberately don't sync live** — Firestore caps documents at 1MB and these can run a few hundred KB each, so syncing them live wasn't worth the complexity or the risk of silent write failures. They stay local until exported, same as before:

1. **Per-person, per-break**: open **Log → Export shown (JSON)**, send the file to whoever is compiling (AirDrop, LINE, email — anything), and have them **Merge in a teammate's export** on their own phone. Merging also re-pushes those entries to Firestore, so data can reach the shared dataset even if it was originally captured fully offline.
2. **Durable, versioned copy in this repo**: whoever is compiling can run the merge script locally (not in the app — this keeps write access off any phone) to fold everyone's exports (including photos/audio) into one file and commit it:

   ```bash
   node scripts/merge-exports.js path/to/export1.json path/to/export2.json ...
   git add data/master-log.json
   git commit -m "Merge fieldwork exports — <date>"
   git push
   ```

   Recommended once a day regardless of Firestore — it's the one place the full dataset (photos and audio included) ends up versioned and off-phone.

## Google Forms for interview survey data (in progress)

The team decided interview/survey responses (Business, Staff, Tourist tracks) should move to Google Forms instead of the app's own Intercept Survey — Forms enforce required fields (no missing data) and give a cleaner consent trail for the human-subjects side of the research, as opposed to the purely observational data (counts, signage, etc.) which stays in the app.

`scripts/generate-survey-forms.gs` is a Google Apps Script that creates all three forms (with a verbal-consent gate, the same bilingual EN/JA questions the app already asks, and required-field validation), links each to its own response spreadsheet, and files everything into the `Research` folder (inside `Sakura - Team Folder`). Run it once from script.google.com — see the comment block at the top of the file for exact steps. The consent wording is a draft, not yet ethics-reviewed — get it signed off before field use, and have a Japanese speaker check the translations.

Once the three forms are live, their links can be added to the app (a later update) so the team can jump straight from "Intercept Survey" to the right form.

### Firestore setup (done)

Project `dhde-site-visits` is wired into `index.html`, database created (`asia-northeast1`), and rules published. Data is treated as open (same spirit as the FTAS-style datasets already in the DHDE pipeline) — anyone can read it, but only this app's writes get through, and nothing can ever be edited or deleted once written:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /entries/{entryId} {
      allow read: if true;
      allow create: if request.resource.data.teamCode == "dhde-fukui-2026"
                    && request.resource.data.keys().hasAll(['id','catId','site','day','author','ts'])
                    && request.resource.data.size() < 40;
      allow update, delete: if false;
    }
    match /photos/{photoId} {
      allow read: if true;
      allow create: if request.resource.data.teamCode == "dhde-fukui-2026"
                    && request.resource.data.keys().hasAll(['entryId','day','site','catId','author','ts','dataUrl'])
                    && request.resource.data.size() < 900000;
      allow update, delete: if false;
    }
  }
}
```

Photos ride in their own `photos` collection (one doc per photo, `entryId` pointing back at the entry it belongs to) rather than inline in `entries`, because Firestore caps a document at 1MB and a couple of embedded photos would blow past that. Kept under ~900KB each by client-side compression before upload; if a phone somehow produces a larger one, that single photo just stays local (visible and exportable on that device) instead of failing the whole entry.

Document IDs are human-readable on purpose — `{day}_{site}_{category}_{author}_{timestamp}_{random}`, e.g. `sep21_dotonbori_count_mohammed-sohail_20260921-093012_a8f3e` — so browsing the raw data in the [Firebase console](https://console.firebase.google.com/project/dhde-site-visits/firestore/databases/-default-/data) sorts and groups naturally by day, then site, then category, without needing to open each document. Every document also carries `siteName` and `dayLabel` fields spelling out the full names, not just the short ids used internally.

`"dhde-fukui-2026"` is the `TEAM_CODE` constant near the top of the script in `index.html` — it's not a secret (anyone can view it in the page source), it just stops generic bots that don't bother reading a specific site's source. Entries are append-only by design (no update/delete) — matches the "nothing gets lost" goal and keeps the rules simple. If you ever need to change the code, update both places together.

## Computer vision notes

The Spot Tracker runs [TensorFlow.js](https://www.tensorflow.org/js) with the `coco-ssd` object detection model, loaded from a CDN the first time you open the app (needs wifi/data once), then cached by a service worker so it keeps working offline for the rest of the day. Detection happens entirely on-device — no video or image is ever uploaded anywhere.

It's an assistive estimate from a general-purpose person detector on a phone camera, not a calibrated sensor — it can misjudge dense or unusual scenes. Spot-check it against a stopwatch occasionally, and always trust your own eyes over the number if they disagree. (The crowd counter used to run the same kind of detection; it wasn't reliable enough in real crowds, so it's now a manual tap counter instead — see "Manual tally" above.)

## Editing / redeploying

Single static site (`index.html`, `sw.js`, `manifest.json`, `icon.svg`), no build step. Edit and push to `main` — GitHub Pages redeploys automatically within a minute or two.

If you change the app logic, bump the cache name at the top of `sw.js` (`dhde-field-survey-v5` → `v6`, etc.). This matters less than it used to — the service worker fetches `index.html` network-first now — but it's still good hygiene, and GitHub's CDN can take a few minutes to propagate a new deploy to every edge location, so don't panic if a fix doesn't show up instantly everywhere.

To add another fieldwork day: add an entry to the `DAYS` array near the top of the script in `index.html` (date, label, `sites`, `schedule`) — everything else (Today/Survey/Log/Dashboard) picks it up automatically, and the app auto-selects whichever day matches the phone's current date.

## Related

- Monday board: [DHDE Build](https://virufy.monday.com/boards/18428212892)
