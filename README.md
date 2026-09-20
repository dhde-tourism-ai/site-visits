# DHDE Field Survey

A phone-first field survey app for the Sakura Science / DHDE tourism fieldwork team (University of Fukui). Built for the Osaka & Kyoto benchmark fieldwork day (21 Sep 2026) ahead of the Fukui suppressed-demand crowd-flow model.

**Live app:** https://mohammedsohail-virufy.github.io/dhde-field-survey/

Open that link on your phone, add it to your home screen, and pick your name — no install, no account.

## What it does

- **Today** — the day's schedule, why the trip matters for the DHDE model, and field-conduct notes.
- **Survey** — pick a site and one of 9 categories (crowd count, bottlenecks & flow, multilingual signage, prayer & rest spaces, food & beverage census, service provider survey, visitor interviews, photo log, spot tracker). Each category has a "How to record this" field guide with real methodology, not placeholder text.
- **Camera assist** — the crowd-count field has an optional on-device flow counter: draw a line across the path, and it tallies crossings for 60 seconds using a TensorFlow.js object-detection model running entirely in the browser.
- **Spot Tracker** — box in a single photo spot (a railing, a torii, a viewing deck) and the phone watches it hands-free, logging how long each visitor or pair occupies it and how many people were there at once, until you stop.
- **Log** — everyone's entries on this device, with JSON/CSV export and a paste-to-merge importer.
- **Dashboard** — live coverage stats, entries by category, per-person contribution counts, and automatic gap flags for categories nobody has logged yet.

## How data moves between phones

There is no backend and no login beyond picking your name — this keeps the whole thing free to host, needs no API keys, and means nobody's photos or camera feed ever leaves their phone. Everything is saved to that phone's local storage only.

To combine everyone's data: at each break, open **Log → Export JSON**, send the file to whoever is compiling (AirDrop, LINE, email — anything), and have them open **Log → Merge in a teammate's export** on their own phone and paste it in. Do this after every site.

## Computer vision notes

Both the flow counter and the spot tracker run [TensorFlow.js](https://www.tensorflow.org/js) with the `coco-ssd` object detection model, loaded from a CDN the first time you open the app (needs wifi/data once), then cached by a service worker so it keeps working offline for the rest of the day. Detection happens entirely on-device — no video or image is ever uploaded anywhere.

These are assistive estimates from a general-purpose person detector on a phone camera, not a calibrated sensor. In dense crowds it will undercount overlapping people. Spot-check both features against a manual tally occasionally, and always trust your own eyes over the number if they disagree.

## Editing / redeploying

This is a single static site (`index.html`, `sw.js`, `manifest.json`, `icon.svg`) with no build step. Edit `index.html` and push to `main` — GitHub Pages redeploys automatically within a minute or two.

If you bump the app logic, also bump the cache name at the top of `sw.js` (`dhde-field-survey-v1` → `v2`, etc.) so phones that already cached the old version pick up the change.

## Related

- Monday board: [DHDE Build](https://virufy.monday.com/boards/18428212892), group "Day 2 – Osaka & Kyoto Fieldwork (Sep 21)"
