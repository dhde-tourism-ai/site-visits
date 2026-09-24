# DHDE Field Survey

A phone-first field survey app for the Sakura Science / DHDE tourism fieldwork team (University of Fukui). Covers the Osaka/Kyoto, Fukui-heartland, and Kanazawa fieldwork days ahead of the Fukui suppressed-demand crowd-flow model.

**Live app:** https://dhde-tourism-ai.github.io/site-visits/

Open that link on your phone, add it to your home screen, and pick your name — no install, no account.

## What it does

- **Today** — pick the day (21/23/24 Sep, 2 Oct) to see that day's schedule, why it matters for the DHDE model, and field-conduct notes. No fixed roles — split up by category naturally when you arrive.
- **Plan**: one plan per site (or a "Whole day" plan used wherever a site has none). Gabriella, Anugra, Amil or Sohail set a main question, how to record observations, and groups, each with an objective, a list of target objectives, its activities (metrics in this app, visitor surveys on the research form, or both), members, a lead and extra instructions, then publish. Anyone can tap **Join this group** / **Switch** / **Leave**; that is saved as its own `catId: "planjoin"` doc and replayed on top of the published member lists, so it syncs to everyone and survives a republish. Visitor surveys are done only on the committee-approved research Google Form (`VISITOR_FORM_URL` in `index.html`): survey groups get a button to it, and the Intercept Survey's Tourist / Visitor option points there instead of showing in-app questions. Under the form button, the Tourist / Visitor screen also has **Extra travel questions (saved in the app)**, for things the research form doesn't ask: where they're going next, how long they're staying in Kanazawa (day trip / nights), how they found the spot, which app they booked with, and how they got there. These are quick-tap answers saved as `personType: "travel"` survey entries and summarised in the Report. Survey groups in the Plan tab have a button straight to them. Business and staff interviews still use the Intercept Survey. Today shows a "Your group" card for the current site. Plans and joins live in the existing `entries` collection (no Firestore rule change) and are kept out of the Log, Report and Dashboard. Yu Kitagawa, Masaya Iwata and Kaho Shimamura are the Japanese TAs (`TAS` in `index.html`). TAs join groups like anyone else (a group can have more than one), and groups without a TA are flagged. A TA signs off each plan after checking it with the tour guide (they must tick "I checked this plan with the tour guide"), or sends it back with "Needs changes" and a note. Sign-offs are `catId: "plansignoff"` docs tied to the plan version they approved, so if a planner republishes, the plan shows "Waiting for TA sign-off" again and notes who approved the earlier version. The editor has two templates: **Transit space** (airport, station: three groups: Group 1 dedicated surveys, Group 2 multilingual information plus the visitor journey along the route, Group 3 transportation and connectivity) and **Attraction** (museum, garden, market: two groups, dedicated surveys and crowd movement). Each site in `DAYS` has a `kind` so the matching template is marked as suggested. In a target list, a line ending in ":" or starting "A." / "B)" is a section heading rather than an item. Inside a plan there is a tab per group (plus Overview), and inside each group a numbered checklist of its target objectives showing how many observations each has (the group tab shows items covered, e.g. 1/4). Tapping an item opens its log form (What we observed, Why it matters, Opportunity, optional photo) and the list of everything logged against it. When a planner adds an item, it appears as a new tab for everyone. Logs for an item that was later renamed or removed stay visible under "Earlier items". Item logs are ordinary entries (`catId: "target"`, shown as "Group targets") so they sync, appear in the Log, Report and Dashboard, and their photos sync like any other. The publish restriction is only in the app, like the name picker, not a real permission.
- **About today's sites**: on Today, short background notes and "look for" prompts for each site (currently the 24 Sep Komatsu & Kanazawa sites; add a `bg`/`look` pair to any site in `DAYS` to show more).
- **Survey**: pick a site for the selected day and one of 9 categories: crowd count (with optional occupancy, group dwell and queues), bottlenecks & flow, multilingual signage, prayer & rest spaces, food & beverage census, **Intercept Survey**, photo log, spot tracker, field notes.
- **Auto-scheduled site** — the site selector follows the day's actual timetable: as the clock moves into a new site's scheduled window, it switches for you automatically (a small "⏱ Following schedule" toggle next to the site list shows this is on). Pick a site manually at any time and it politely stops auto-switching — tap the toggle again to hand control back to the schedule.
- **Running late / early**: on the Survey tab, a planner or TA picks the site the team is actually at and taps **📍 We're at … now**. The rest of that day's schedule shifts by the same amount for everyone (saved as a `catId: "sitepin"` doc): site times show shifted, the "now" marker and automatic site switching follow the new times, and Today and Survey show "Running 1h 26m behind the printed schedule". **Back to the printed schedule** undoes it.
- **Occupancy & Queues (inside Crowd Count)**: optional fields at the bottom of Crowd Count: a snapshot headcount for the area right now, **Dwell timers** for how long groups or people linger, and a dynamic "+ Add a line" list for counting several queues separately (a reception desk and a ticket counter next to each other are two lines, not one). Dwell timers can run several at once: tap + Group or + Person as each arrives (optionally with group size), Stop each as they leave, then Use average to fill the average dwell time; every individual time is saved with the entry (`dwellTimes`). Timers are kept on the phone, so closing the screen or the phone locking doesn't stop them.
- **Field Notes** — a plain qualitative-observation category with no required numbers, for anything worth recording that doesn't fit a structured field.
- **Intercept Survey** — pick who you're talking to (Business/Shop Owner, Staff, or Tourist/Visitor) and the right question set appears, in English with Japanese underneath so you can show the screen if that helps:
  - *Business/Shop Owner*: 6 multiple-choice questions (daily traffic, tourist share, busiest times, language support, payment methods, year-over-year trend — every one includes a "Cannot answer" option) plus one open-ended question on their biggest challenge, and an optional photo of the business.
  - *Staff*: 4 open-ended questions about what visitors ask and struggle with.
  - *Tourist/Visitor*: 5 open-ended questions about purpose, confusion points, friction, and what would improve their visit.
  - Any survey can carry an optional 60-second voice note instead of (or alongside) typed notes. Japanese text throughout is sized for readability at a glance, including when showing the screen to someone else.
- **Manual tally**: the crowd-count field has a tap counter with **IN ▶** and **◀ OUT** buttons, one tap per person crossing, so you get inflow, outflow and net flow (filled into their own Inflow/Outflow fields). The camera is optional: it stays off unless you tap "Add camera reference line", which shows a draggable line to mark where people cross. (An earlier version tried automatic AI-based counting; it wasn't reliable in real crowds, so this replaced it: a human tap is just correct.)
- **Spot Tracker** — box in a single photo spot and the phone watches it hands-free, logging how long each visitor or pair occupies it and how many people were there at once, until you stop.
- **Photos** — Bottlenecks & Flow, Multilingual Signage, Prayer & Rest, Food & Beverage, Photo Log, and business surveys can all carry an optional photo. Every photo in the Log has a **Save photo** button with a descriptive filename (`dhde_<day>_<site>_<label>.jpg`) for saving to your camera roll.
- **Log** — everyone's entries on this device, filterable by day/site/person, with JSON/CSV export (of whatever's currently filtered) and a paste-to-merge importer.
- **Dashboard** — live coverage stats, entries by category, per-person contribution counts (tap a name to jump to their entries), and automatic gap flags for categories nobody has logged yet at a given site.

## Japanese interface

Tap **日本語** in the top bar (or on the name screen) to switch the interface to Japanese, and **EN** to switch back. It is remembered per phone. Tabs, buttons, category names, field labels, options, how-to tips, the Plan tab and messages are translated by exact-match lookup on the rendered text (the `JA` dictionary and `JA_PATTERNS` near the top of the script in `index.html`), so render code stays in English. Entries, plan text and other team-written content stay as written, and survey questions were already bilingual. Text split around bold words carries its Japanese in a `data-ja` attribute. To add or fix a translation, add the exact English string to `JA`. The translations were written without native review, so a native speaker should check them.

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

Creating the forms doesn't pull in survey/photo data collected through the app *before* the switch — Forms only record what's submitted through them directly. `scripts/backfill-firestore-to-forms.gs` is a second, one-time script that does that move: it reads straight from Firestore's public REST API and writes directly into the response sheets and the `Research/Photos` Drive folder, entirely within Google's own infrastructure (the photos especially are far too large to usefully pass through a chat conversation). Add it as a second file in the same Apps Script project and run `backfillAll` once — see its own comment block for details.

No photo lands in Drive without a label: each one gets a human-readable filename (site, category, date, photographer — not a code), a file description with a real caption pulled from whatever the field team wrote for that entry (the signage gap noted, the bottleneck's cause, the business name, etc.), and a row in a new **"DHDE Field Photos — Index"** sheet in the `Research` folder listing every photo with its date/day/site/category/author/caption and a direct Drive link. Any photo tied to a survey entry is also linked into that entry's row on the relevant response sheet via a "Photo Link" column.

### Per-site field reports in the team Drive

Each visited site has its own folder inside that day's folder in the Sakura team Drive (e.g. `Day 3 / Eiheiji Temple`), holding a Google Doc report built from the live Firestore data. The report uses the app's own per-category summary plus a table of every recorded value for every entry, and includes any typed-up field notes. Test entries (`TEST-DELETE-ME`, `LIVE-SYNC-CHECK … (delete me)`) are left out. Entries logged in the app under one site but recorded more than an hour outside its window, and during another site's window, are filed under the site they were actually recorded at and marked "Moved here". Entries 30–60 minutes outside their window stay put and are marked "⚠ Check site".

The photos are too large to create through a chat connector, so `scripts/export-site-photos.gs` adds them from inside Google: it reads every synced photo from Firestore, saves it to `<day Photos folder>/App photos - <site>`, and replaces the `[[PHOTOS]]` marker in that site's report with the captioned photos. Run `exportSitePhotos` once from script.google.com (steps at the top of the file). It is safe to re-run.

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
