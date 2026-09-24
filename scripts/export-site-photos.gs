/**
 * DHDE Field Survey: put the app's synced photos into the per-site field
 * reports in the Sakura team Drive, and into each day's Photos folder.
 *
 * The per-site reports (one Google Doc per site, in a folder named after the
 * site inside each day's folder) were generated from the live Firestore data
 * on 24 Sep 2026. Each report has a "Photos" section containing a
 * [[PHOTOS]] marker, and every entry that has a photo says "Photo N in the
 * Photos section". This script fills that in: it reads each photo straight
 * from Firestore's public REST API, entirely inside Google's infrastructure
 * (the ~11 MB of images is far too large to push through a chat
 * conversation), and for every site:
 *   - saves each photo as a JPEG in "<day Photos folder>/App photos - <site>",
 *     named "Photo NN - <site> - <time> - <author>.jpg", with the caption as
 *     the file description;
 *   - replaces [[PHOTOS]] in that site's report with the photos, in order,
 *     each captioned "Photo N: <time · author · category · summary>" and
 *     linked to its Drive file.
 *
 * HOW TO RUN (any team member with edit access to the Sakura team folders):
 *   1. Go to script.google.com, then New project (or reuse the project that has
 *      generate-survey-forms.gs / backfill-firestore-to-forms.gs).
 *   2. Add a file, paste this whole script in, save.
 *   3. Choose "exportSitePhotos" in the function dropdown and click Run.
 *   4. Approve the permission prompt (Drive, Docs, and fetching a URL, for the
 *      Firestore REST call).
 *   5. Check Execution log for a per-site summary.
 *
 * Safe to re-run: photos already saved (same filename in the same folder)
 * are reused, not duplicated, and a report whose [[PHOTOS]] marker is
 * already gone is left alone.
 */

var PROJECT_ID = "dhde-site-visits";
var FIRESTORE_BASE = "https://firestore.googleapis.com/v1/projects/" + PROJECT_ID + "/databases/(default)/documents";
var IMAGE_WIDTH = 460; // px in the doc; keeps a portrait photo on one page

// Generated from the report export: which Drive doc each site's photos go
// into, the day's Photos folder, and the photo order/captions used in the
// report text ("Photo N").
var SITES = [
 {
  "key": "sep21|kiyomizu",
  "name": "Kiyomizu-dera · Ninen-zaka · Sannen-zaka",
  "docId": "1H8sw-Dms9_NclISHEv_jlqoIULgis3bVkykc87zO7Rk",
  "photosFolderId": "1xCTgvuXLhRF8dbuQTaoXeYKIMoUT7ZC8",
  "photos": [
   {
    "entryId": "sep21_kiyomizu_lang_muhammad-anugra-rizky-rambe_20260921-064927_n4c1l",
    "n": 1,
    "caption": "15:49 · Muhammad Anugra Rizky Rambe · Multilingual Signage · Front of the tall castle: Japanese, English (Fixed sign, quality 4/5)"
   },
   {
    "entryId": "sep21_kiyomizu_lang_muhammad-anugra-rizky-rambe_20260921-065349_gnuig",
    "n": 2,
    "caption": "15:53 · Muhammad Anugra Rizky Rambe · Multilingual Signage · Side of castle: Japanese, English (Fixed sign, quality 4/5)"
   },
   {
    "entryId": "sep21_kiyomizu_rest_muhammad-anugra-rizky-rambe_20260921-065502_6674z",
    "n": 3,
    "caption": "15:55 · Muhammad Anugra Rizky Rambe · Prayer & Rest Spaces · Accessible restroom: 50 m"
   },
   {
    "entryId": "sep21_kiyomizu_lang_muhammad-anugra-rizky-rambe_20260921-065946_7thx8",
    "n": 4,
    "caption": "15:59 · Muhammad Anugra Rizky Rambe · Multilingual Signage · Entrance of main castle: Japanese, English (Fixed sign, quality 4/5)"
   },
   {
    "entryId": "sep21_kiyomizu_lang_muhammad-anugra-rizky-rambe_20260921-070326_fvtxw",
    "n": 5,
    "caption": "16:03 · Muhammad Anugra Rizky Rambe · Multilingual Signage · Back of the castle: Japanese (Fixed sign, quality 4/5)"
   }
  ]
 },
 {
  "key": "sep23|dinomuseum",
  "name": "Fukui Prefectural Dinosaur Museum",
  "docId": "18GiO8Nujd-el8-4PgQnHgjD8nnhWIQ0yCceSd7zqM9Y",
  "photosFolderId": "1Okl97PD_Ibib-wq7iN-_zwtp1SzunVud",
  "photos": [
   {
    "entryId": "sep23_eiheiji_lang_dina-belay_20260923-023100_0602c",
    "n": 1,
    "caption": "11:31 · Dina Belay · Multilingual Signage · Dinosaur museum entrance: Japanese (Fixed sign, quality 3/5)"
   },
   {
    "entryId": "sep23_eiheiji_lang_dina-belay_20260923-024107_05xnq",
    "n": 2,
    "caption": "11:41 · Dina Belay · Multilingual Signage · Dinosaur museum entrance - Waste items signage : Japanese, English (Fixed sign, quality 5/5)"
   },
   {
    "entryId": "sep23_eiheiji_lang_dina-belay_20260923-024330_8ggm6",
    "n": 3,
    "caption": "11:43 · Dina Belay · Multilingual Signage · Dinosaur museum east entrance : Japanese, English (Fixed sign, quality 5/5)"
   },
   {
    "entryId": "sep23_eiheiji_lang_dina-belay_20260923-025835_pg0yp",
    "n": 4,
    "caption": "11:58 · Dina Belay · Multilingual Signage · Dinosaur museum entrance end of line signage: Japanese (Fixed sign, quality 3/5)"
   },
   {
    "entryId": "sep23_dinomuseum_lang_dina-belay_20260923-030333_kqovw",
    "n": 5,
    "caption": "12:03 · Dina Belay · Multilingual Signage · Dinosaur museum east entrance : Japanese, English (Fixed sign, quality 5/5)"
   },
   {
    "entryId": "sep23_eiheiji_lang_mohammed-sohail_20260923-030623_76xhb",
    "n": 6,
    "caption": "12:06 · Mohammed Sohail · Multilingual Signage · Dino Park: Japanese (Fixed sign, quality 3/5)"
   },
   {
    "entryId": "sep23_dinomuseum_lang_dina-belay_20260923-030739_yfbi8",
    "n": 7,
    "caption": "12:07 · Dina Belay · Multilingual Signage · Main entrance : Japanese (Fixed sign, quality 3/5)"
   },
   {
    "entryId": "sep23_dinomuseum_lang_muhammad-anugra-rizky-rambe_20260923-031650_6dbcy",
    "n": 8,
    "caption": "12:16 · Muhammad Anugra Rizky Rambe · Multilingual Signage · Main garden: Japanese (Fixed sign, quality 3/5)"
   },
   {
    "entryId": "sep23_eiheiji_lang_dina-belay_20260923-032937_c484n",
    "n": 9,
    "caption": "12:29 · Dina Belay · Multilingual Signage · Saurus chicken: Japanese (Fixed sign, quality 3/5)"
   }
  ]
 },
 {
  "key": "sep23|eiheiji",
  "name": "Eiheiji Temple",
  "docId": "1uUoO2Zj_RgQGe6-yJPgjK0D53trSZytjmLhPd_4HvwU",
  "photosFolderId": "1Okl97PD_Ibib-wq7iN-_zwtp1SzunVud",
  "photos": [
   {
    "entryId": "sep23_eiheiji_lang_dina-belay_20260922-235119_qf0nk",
    "n": 1,
    "caption": "08:51 · Dina Belay · Multilingual Signage · Eheji temple entrance : Japanese (Fixed sign, quality 4/5)"
   },
   {
    "entryId": "sep23_eiheiji_photo_dina-belay_20260922-235334_zl0r9",
    "n": 2,
    "caption": "08:53 · Dina Belay · Photo Log · Cameras found around Eheji temple entrance but not sure if they are edge-AI cameras we might need to check."
   },
   {
    "entryId": "sep23_eiheiji_lang_dina-belay_20260922-235614_addsu",
    "n": 3,
    "caption": "08:56 · Dina Belay · Multilingual Signage · Eheji temple Entrance : Japanese (Fixed sign, quality 4/5)"
   },
   {
    "entryId": "sep23_eiheiji_lang_dina-belay_20260922-235901_mfqc9",
    "n": 4,
    "caption": "08:59 · Dina Belay · Multilingual Signage · Eheji temple entrance : Japanese, English (Fixed sign, quality 3/5)"
   },
   {
    "entryId": "sep23_eiheiji_lang_dina-belay_20260923-000114_lsuwz",
    "n": 5,
    "caption": "09:01 · Dina Belay · Multilingual Signage · Eheji temple entrance : Japanese (Fixed sign, quality 5/5)"
   },
   {
    "entryId": "sep23_eiheiji_lang_dina-belay_20260923-000407_ob3o4",
    "n": 6,
    "caption": "09:04 · Dina Belay · Multilingual Signage · Eheji temple tickets area : Japanese, English (Fixed sign, quality 5/5)"
   },
   {
    "entryId": "sep23_eiheiji_lang_dina-belay_20260923-000749_4crnf",
    "n": 7,
    "caption": "09:07 · Dina Belay · Multilingual Signage · Eheji temple tickets area : Japanese, English (Fixed sign, quality 4/5)"
   },
   {
    "entryId": "sep23_eiheiji_photo_dina-belay_20260923-001137_xqqwt",
    "n": 8,
    "caption": "09:11 · Dina Belay · Photo Log · Temple shoes taking off area"
   },
   {
    "entryId": "sep23_eiheiji_lang_dina-belay_20260923-002135_5ae07",
    "n": 9,
    "caption": "09:21 · Dina Belay · Multilingual Signage · Eheji temple documentary room: Japanese (Fixed sign, quality 4/5)"
   },
   {
    "entryId": "sep23_eiheiji_lang_dina-belay_20260923-002523_vio1g",
    "n": 10,
    "caption": "09:25 · Dina Belay · Multilingual Signage · Schidogaran: Japanese, English (Fixed sign, quality 5/5)"
   },
   {
    "entryId": "sep23_eiheiji_lang_dina-belay_20260923-002616_w6pq4",
    "n": 11,
    "caption": "09:26 · Dina Belay · Multilingual Signage · Schidogaran toilet: Japanese, English (Fixed sign, quality 5/5)"
   },
   {
    "entryId": "sep23_eiheiji_flow_mohammed-sohail_20260923-002648_k3qj5",
    "n": 12,
    "caption": "09:26 · Mohammed Sohail · Bottlenecks & Flow · Center Line: Other, severity 2/5"
   },
   {
    "entryId": "sep23_eiheiji_lang_dina-belay_20260923-002719_yxjv0",
    "n": 13,
    "caption": "09:27 · Dina Belay · Multilingual Signage · Around sodo entrance : Japanese, English (Fixed sign, quality 5/5)"
   },
   {
    "entryId": "sep23_eiheiji_photo_dina-belay_20260923-002943_b5jsu",
    "n": 14,
    "caption": "09:29 · Dina Belay · Photo Log · Budhist statue area "
   },
   {
    "entryId": "sep23_eiheiji_lang_dina-belay_20260923-003237_5ngt4",
    "n": 15,
    "caption": "09:32 · Dina Belay · Multilingual Signage · Hatto area - fire extinguisher signage: Japanese, English (Fixed sign, quality 3/5)"
   },
   {
    "entryId": "sep23_eiheiji_lang_dina-belay_20260923-004127_7lix4",
    "n": 16,
    "caption": "09:41 · Dina Belay · Multilingual Signage · Hatto informational board: Japanese, English (Fixed sign, quality 5/5)"
   },
   {
    "entryId": "sep23_eiheiji_photo_dina-belay_20260923-004400_u4xx7",
    "n": 17,
    "caption": "09:44 · Dina Belay · Photo Log · Sign of the Zen temple "
   },
   {
    "entryId": "sep23_eiheiji_lang_dina-belay_20260923-004552_3tibs",
    "n": 18,
    "caption": "09:45 · Dina Belay · Multilingual Signage · Daikun informational board: Japanese, English (Fixed sign, quality 4/5)"
   },
   {
    "entryId": "sep23_eiheiji_lang_dina-belay_20260923-004835_l9kgo",
    "n": 19,
    "caption": "09:48 · Dina Belay · Multilingual Signage · Daiksu grinding area: Japanese (Fixed sign, quality 2/5)"
   },
   {
    "entryId": "sep23_eiheiji_lang_dina-belay_20260923-010138_xosue",
    "n": 20,
    "caption": "10:01 · Dina Belay · Multilingual Signage · Hakusanui information signage: Japanese, English (Fixed sign, quality 4/5)"
   },
   {
    "entryId": "sep23_eiheiji_lang_dina-belay_20260923-010245_jkwyf",
    "n": 21,
    "caption": "10:02 · Dina Belay · Multilingual Signage · Kounkaku information board: Japanese, English (Fixed sign, quality 5/5)"
   },
   {
    "entryId": "sep23_eiheiji_lang_dina-belay_20260923-010438_uavdy",
    "n": 22,
    "caption": "10:04 · Dina Belay · Multilingual Signage · Kounkaku emergency button : Japanese (Fixed sign, quality 2/5)"
   },
   {
    "entryId": "sep23_eiheiji_lang_dina-belay_20260923-010634_7mj3a",
    "n": 23,
    "caption": "10:06 · Dina Belay · Multilingual Signage · Joyden area signage : Japanese, English (Fixed sign, quality 5/5)"
   },
   {
    "entryId": "sep23_eiheiji_lang_dina-belay_20260923-010729_zc392",
    "n": 24,
    "caption": "10:07 · Dina Belay · Multilingual Signage · Joyden area corridor : Japanese (Fixed sign, quality 3/5)"
   },
   {
    "entryId": "sep23_eiheiji_lang_dina-belay_20260923-010926_6mio6",
    "n": 25,
    "caption": "10:09 · Dina Belay · Multilingual Signage · Joyden area exit: Japanese, English (Fixed sign, quality 3/5)"
   },
   {
    "entryId": "sep23_eiheiji_lang_dina-belay_20260923-011848_n3dya",
    "n": 26,
    "caption": "10:18 · Dina Belay · Multilingual Signage · Memorial service hall signage : Japanese (Fixed sign, quality 2/5)"
   },
   {
    "entryId": "sep23_eiheiji_lang_dina-belay_20260923-012151_bjgdt",
    "n": 27,
    "caption": "10:21 · Dina Belay · Multilingual Signage · Dinining area signage : Japanese (Fixed sign, quality 2/5)"
   },
   {
    "entryId": "sep23_eiheiji_lang_dina-belay_20260923-012633_xl1ih",
    "n": 28,
    "caption": "10:26 · Dina Belay · Multilingual Signage · Zen museum signage : Japanese, English (Fixed sign, quality 5/5)"
   },
   {
    "entryId": "sep23_eiheiji_lang_dina-belay_20260923-013037_vqiwn",
    "n": 29,
    "caption": "10:30 · Dina Belay · Multilingual Signage · Eheji temple exit: Japanese (Fixed sign, quality 2/5)"
   }
  ]
 },
 {
  "key": "sep23|tojinbo",
  "name": "Tojinbo & Echizen Coast",
  "docId": "1UPS8ujj40oa28nMypENXG_nBOnH1dRgX4-S1EMHOxQM",
  "photosFolderId": "1Okl97PD_Ibib-wq7iN-_zwtp1SzunVud",
  "photos": [
   {
    "entryId": "sep23_tojinbo_photo_dina-belay_20260923-053631_7d4hh",
    "n": 1,
    "caption": "14:36 · Dina Belay · Photo Log · Flyer received at entrance - no English translation "
   },
   {
    "entryId": "sep23_tojinbo_lang_dina-belay_20260923-055950_nxsqs",
    "n": 2,
    "caption": "14:59 · Dina Belay · Multilingual Signage · Tonjibo coast signage: Japanese (Fixed sign, quality 2/5)"
   },
   {
    "entryId": "sep23_tojinbo_lang_muhammad-anugra-rizky-rambe_20260923-062811_ljvkh",
    "n": 3,
    "caption": "15:28 · Muhammad Anugra Rizky Rambe · Multilingual Signage · Side of coast: Japanese (Fixed sign, quality 4/5)"
   },
   {
    "entryId": "sep23_tojinbo_food_mohammed-sohail_20260923-063640_1rm0p",
    "n": 4,
    "caption": "15:36 · Mohammed Sohail · Food & Beverage Census · IWABA Cafe (Cafe, ¥¥ (mid))"
   }
  ]
 }
];

function exportSitePhotos() {
  SITES.forEach(function (s) { if (/^__DOC_/.test(s.docId)) throw new Error("Report doc ID missing for " + s.name + ". Fill it in SITES first."); });
  var needed = {};
  SITES.forEach(function (s) { s.photos.forEach(function (p) { needed[p.entryId] = true; }); });
  var dataUrls = fetchPhotoDataUrls_(needed);

  SITES.forEach(function (site) {
    var dayFolder = DriveApp.getFolderById(site.photosFolderId);
    var folder = getOrCreateFolder_(dayFolder, "App photos - " + site.name);
    var saved = [], missing = 0;

    site.photos.forEach(function (p) {
      var dataUrl = dataUrls[p.entryId];
      if (!dataUrl) { missing++; return; }
      var name = "Photo " + pad2_(p.n) + " - " + site.name + " - " + fileSafe_(p.caption.split(" · ").slice(0, 2).join(" - ")) + ".jpg";
      var file = findFile_(folder, name);
      if (!file) {
        var b64 = dataUrl.split(",")[1];
        var mime = (dataUrl.match(/^data:([^;]+);/) || [])[1] || "image/jpeg";
        file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(b64), mime, name));
        file.setDescription("Photo " + p.n + ", " + site.name + ": " + p.caption);
      }
      saved.push({ n: p.n, caption: p.caption, file: file });
    });

    var inserted = insertIntoReport_(site.docId, saved);
    Logger.log(site.name + ": " + saved.length + " photo(s) saved to '" + folder.getName() + "'" +
      (missing ? ", " + missing + " not found in Firestore" : "") +
      (inserted ? ", inserted into the report." : ", report already had its photos (marker not found), left unchanged."));
  });
}

function insertIntoReport_(docId, saved) {
  var doc = DocumentApp.openById(docId);
  var body = doc.getBody();
  var found = body.findText("\\[\\[PHOTOS\\]\\]");
  if (!found) return false;
  var markerPara = found.getElement().getParent();
  while (markerPara.getType() !== DocumentApp.ElementType.PARAGRAPH && markerPara.getParent()) markerPara = markerPara.getParent();
  var index = body.getChildIndex(markerPara);

  // Insert each caption + image just above the marker (pushing it down), then drop the marker.
  saved.forEach(function (s) {
    var cap = body.insertParagraph(index++, "Photo " + s.n + ": " + s.caption);
    cap.setHeading(DocumentApp.ParagraphHeading.HEADING4);
    cap.setLinkUrl(s.file.getUrl());
    var imgPara = body.insertParagraph(index++, "");
    var img = imgPara.appendInlineImage(s.file.getBlob());
    var w = img.getWidth(), h = img.getHeight();
    if (w > IMAGE_WIDTH) { img.setWidth(IMAGE_WIDTH); img.setHeight(Math.round(h * IMAGE_WIDTH / w)); }
  });
  markerPara.removeFromParent();
  doc.saveAndClose();
  return true;
}

function fetchPhotoDataUrls_(needed) {
  var out = {}, token = "";
  do {
    var url = FIRESTORE_BASE + "/photos?pageSize=10" + (token ? "&pageToken=" + encodeURIComponent(token) : "");
    var res = JSON.parse(UrlFetchApp.fetch(url, { muteHttpExceptions: false }).getContentText());
    (res.documents || []).forEach(function (d) {
      var f = d.fields || {};
      var id = f.entryId && f.entryId.stringValue;
      if (id && needed[id] && f.dataUrl) out[id] = f.dataUrl.stringValue;
    });
    token = res.nextPageToken || "";
  } while (token);
  return out;
}

function getOrCreateFolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
function findFile_(folder, name) {
  var it = folder.getFilesByName(name);
  return it.hasNext() ? it.next() : null;
}
function pad2_(n) { return (n < 10 ? "0" : "") + n; }
function fileSafe_(s) { return String(s).replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim().slice(0, 80); }
