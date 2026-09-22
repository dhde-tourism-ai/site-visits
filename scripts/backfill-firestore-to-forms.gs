/**
 * DHDE Field Survey — one-time backfill of existing Firestore data into the
 * Google Forms response sheets, and existing field photos into Drive with
 * real labels (not just filenames) via a Photo Index sheet.
 *
 * Why this exists: the team decided interview/survey data should live in
 * Google Forms going forward (required fields, consent trail). But entries
 * collected through the app *before* that switch are sitting in Firestore
 * only — a fresh Form starts empty, it doesn't pull in old data on its own.
 * This script does that one-time move: it reads directly from Firestore's
 * public REST API (our security rules allow open reads) and from there
 * writes straight into Drive / the response Sheets, entirely within
 * Google's own infrastructure — the images especially are much too large
 * to usefully round-trip through a chat conversation.
 *
 * Every photo gets: a human-readable filename (site, category, date,
 * photographer — not a code), a Drive file description with a real caption
 * pulled from whatever the field team actually wrote for that entry, and a
 * row in a "DHDE Field Photos — Index" sheet so nothing is a blind,
 * unlabeled file. Photos that belong to a survey entry also get linked
 * into that entry's row on the relevant response sheet.
 *
 * HOW TO RUN:
 *   1. In the SAME Apps Script project as generate-survey-forms.gs (or a
 *      new one — doesn't matter), add this as a new file.
 *   2. Select "backfillAll" in the function dropdown, click Run.
 *   3. Approve the extra permission prompt (it now also needs to fetch a
 *      URL — that's the Firestore REST call).
 *   4. Check View -> Logs for a summary (counts per form, photos uploaded).
 *
 * This is meant to run ONCE. Re-running will append the same rows and
 * re-upload the same photos again — if you need to re-run, clear what you
 * already backfilled first.
 */

var PROJECT_ID = "dhde-site-visits";
var TEAM_CODE = "dhde-fukui-2026";
var RESEARCH_FOLDER_ID = "1Kwg8cFmt49GgcHo-R9ASuWoZfa9SYNvo"; // Research (in Sakura - Team Folder)
var PHOTOS_FOLDER_ID = "1z5a7r68L7a0_X5hXQ6JkIhP-LiR5LrsO";   // Research / Photos

var SITE_NAMES = {
  dotonbori: "Dotonbori & Namba", umeda: "Umeda & Osaka Station", kiyomizu: "Kiyomizu-dera / Ninen-zaka / Sannen-zaka",
  eiheiji: "Eiheiji Temple", dinomuseum: "Fukui Prefectural Dinosaur Museum", tojinbo: "Tojinbo & Echizen Coast",
  komatsu: "Komatsu Airport", c21museum: "21st Century Museum (Kanazawa)", kenrokuen: "Kenroku-en Garden",
  kanazawacastle: "Kanazawa Castle Park", omicho: "Omicho Market", higashichaya: "Higashi Chaya District",
  kanazawastation: "Kanazawa Station & Tsuzumi-mon Gate", merchanttrial: "Eiheiji / Katsuyama Merchants",
  ichijodani: "Ichijodani Asakura Clan Ruins"
};
var DAY_LABELS = {
  sep21: "Osaka & Kyoto (21 Sep)", sep23: "Eiheiji, Katsuyama & Tojinbo (23 Sep)",
  sep24: "Komatsu & Kanazawa (24 Sep)", oct2: "System Integration & Merchant Trial (2 Oct)",
  oct8: "Ichijodani Visit (8 Oct)"
};
var CATEGORY_LABELS = {
  count: "Crowd Count", flow: "Bottlenecks & Flow", lang: "Multilingual Signage", rest: "Prayer & Rest Spaces",
  food: "Food & Beverage Census", survey: "Intercept Survey", photo: "Photo Log", spot: "Spot Tracker"
};

function siteNameFor_(entry) { return (entry && entry.siteName) || SITE_NAMES[entry && entry.site] || (entry && entry.site) || "Unknown site"; }
function dayLabelFor_(entry) { return (entry && entry.dayLabel) || DAY_LABELS[entry && entry.day] || (entry && entry.day) || "Unknown day"; }

function fsGet_(path) {
  var url = "https://firestore.googleapis.com/v1/projects/" + PROJECT_ID + "/databases/(default)/documents/" + path;
  var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  return JSON.parse(resp.getContentText());
}
function fsValue_(v) {
  if (v == null) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(fsValue_);
  if ("mapValue" in v) return fsFields_(v.mapValue.fields || {});
  return null;
}
function fsFields_(fields) {
  var out = {};
  Object.keys(fields || {}).forEach(function (k) { out[k] = fsValue_(fields[k]); });
  return out;
}
function fsDoc_(doc) {
  var id = doc.name.split("/").pop();
  return Object.assign({ id: id }, fsFields_(doc.fields));
}
function fetchCollection_(name) {
  var out = [];
  var pageToken = null;
  do {
    var path = name + "?pageSize=300" + (pageToken ? "&pageToken=" + pageToken : "");
    var data = fsGet_(path);
    (data.documents || []).forEach(function (d) { out.push(fsDoc_(d)); });
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  return out;
}

function findSheetByName_(nameOrContains, exact) {
  var folder = DriveApp.getFolderById(RESEARCH_FOLDER_ID);
  var files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
  while (files.hasNext()) {
    var f = files.next();
    var match = exact ? (f.getName() === nameOrContains) : (f.getName().indexOf(nameOrContains) !== -1);
    if (match) return SpreadsheetApp.openById(f.getId()).getSheets()[0];
  }
  return null;
}

function moveFileToResearchFolder_(fileId) {
  var file = DriveApp.getFileById(fileId);
  var folder = DriveApp.getFolderById(RESEARCH_FOLDER_ID);
  var oldParents = [];
  var it = file.getParents();
  while (it.hasNext()) oldParents.push(it.next());
  folder.addFile(file);
  oldParents.forEach(function (p) { if (p.getId() !== RESEARCH_FOLDER_ID) p.removeFile(file); });
}

function findOrCreatePhotoIndex_() {
  var existing = findSheetByName_("DHDE Field Photos — Index", true);
  if (existing) return existing;
  var ss = SpreadsheetApp.create("DHDE Field Photos — Index");
  var sheet = ss.getSheets()[0];
  sheet.appendRow(["Date", "Day", "Site", "Category", "Author", "Caption", "Filename", "Drive Link"]);
  sheet.setFrozenRows(1);
  moveFileToResearchFolder_(ss.getId());
  return sheet;
}

function ensurePhotoLinkHeader_(sheet) {
  if (!sheet) return;
  var lastCol = sheet.getLastColumn();
  var header = sheet.getRange(1, lastCol).getValue();
  if (header !== "Photo Link") sheet.getRange(1, lastCol + 1).setValue("Photo Link");
}

function photoCaption_(photoDoc, entry) {
  var d = entry ? (entry.data || {}) : {};
  switch (photoDoc.catId) {
    case "lang": return "Signage at " + (d.location || "unspecified") + (d.gap ? " — gap noted: " + d.gap : "");
    case "rest": return (d.type || "Rest/prayer space") + (d.distance ? " (" + d.distance + " from main path)" : "");
    case "flow": return "Bottleneck at " + (d.location || "unspecified") + (d.cause ? " — cause: " + d.cause : "");
    case "food": return d.name ? (d.name + (d.category ? " (" + d.category + ")" : "")) : "Food & beverage venue";
    case "photo": return d.caption || "Field photo";
    case "survey": return d.personType === "business" ? ("Business: " + (d.bizName || "unnamed")) : "Survey photo";
    default: return CATEGORY_LABELS[photoDoc.catId] || photoDoc.catId;
  }
}

function backfillAll() {
  var entries = fetchCollection_("entries").filter(function (e) { return e.teamCode === TEAM_CODE; });
  var photos = fetchCollection_("photos").filter(function (p) { return p.teamCode === TEAM_CODE; });
  var surveyEntries = entries.filter(function (e) { return e.catId === "survey"; });

  var entriesById = {};
  entries.forEach(function (e) { entriesById[e.id] = e; });

  var photoIndex = findOrCreatePhotoIndex_();

  // Upload every photo to Drive with a real name + description + index row,
  // and keep a map of entryId -> Drive link for survey-response linking.
  var uploadedPhotoLinks = {};
  var photoUploadCount = 0;
  photos.forEach(function (p) {
    try {
      var b64 = (p.dataUrl || "").split(",")[1];
      if (!b64) return;

      var entry = entriesById[p.entryId];
      var siteName = siteNameFor_(entry || p);
      var dayLabel = dayLabelFor_(entry || p);
      var catLabel = CATEGORY_LABELS[p.catId] || p.catId;
      var caption = photoCaption_(p, entry);
      var dateStr = "unknown date";
      try { dateStr = Utilities.formatDate(new Date(p.ts), "Asia/Tokyo", "d MMM yyyy"); } catch (ignored) {}

      var filename = (siteName + " - " + catLabel + " - " + dateStr + " (" + (p.author || "Unknown") + ")")
        .replace(/[\\\/:*?"<>|]/g, "-") + ".jpg";

      var bytes = Utilities.base64Decode(b64);
      var blob = Utilities.newBlob(bytes, "image/jpeg", filename);
      var file = DriveApp.getFolderById(PHOTOS_FOLDER_ID).createFile(blob);
      file.setDescription(caption + " | Site: " + siteName + " | Day: " + dayLabel + " | Recorded by: " + (p.author || "unknown"));

      uploadedPhotoLinks[p.entryId] = file.getUrl();
      photoUploadCount++;

      photoIndex.appendRow([dateStr, dayLabel, siteName, catLabel, p.author || "", caption, filename, file.getUrl()]);
    } catch (e) {
      Logger.log("Photo upload failed for " + p.id + ": " + e);
    }
  });

  var sheets = {
    business: findSheetByName_("Business", false),
    staff: findSheetByName_("Staff", false),
    tourist: findSheetByName_("Tourist", false)
  };
  Object.keys(sheets).forEach(function (k) { ensurePhotoLinkHeader_(sheets[k]); });

  var counts = { business: 0, staff: 0, tourist: 0, skipped: 0 };

  surveyEntries.forEach(function (e) {
    var d = e.data || {};
    var type = d.personType;
    var sheet = sheets[type];
    if (!sheet) { counts.skipped++; return; }

    var photoLink = uploadedPhotoLinks[e.id] || "";
    var timestamp = e.ts || "";
    var siteLabel = siteNameFor_(e) + " — " + dayLabelFor_(e);
    var consentNote = "Backfilled from app data (consent not separately logged at the time)";
    var recorder = e.author || "";

    var row;
    if (type === "business") {
      row = [timestamp, consentNote, siteLabel, "", recorder,
        d.bizName || "", d.bizType || "",
        d.q1_traffic || "", d.q2_touristshare || "", d.q3_busiest || "",
        (d.q4_language || []).join(", "), (d.q5_payment || []).join(", "),
        d.q6_trend || "", d.q7_painpoint || "", photoLink];
      counts.business++;
    } else if (type === "staff") {
      row = [timestamp, consentNote, siteLabel, "", recorder,
        d.orgName || "", d.s1 || "", d.s2 || "", d.s3 || "", d.s4 || "", photoLink];
      counts.staff++;
    } else if (type === "tourist") {
      row = [timestamp, consentNote, siteLabel, "", recorder,
        d.origin || "", d.language || "", d.groupType || "",
        d.t1 || "", d.t2 || "", d.t3 || "", d.t4 || "", d.t5 || "", photoLink];
      counts.tourist++;
    } else {
      counts.skipped++;
      return;
    }
    sheet.appendRow(row);
  });

  Logger.log(JSON.stringify({
    totalEntries: entries.length,
    surveyEntriesFound: surveyEntries.length,
    backfilled: counts,
    totalPhotosInFirestore: photos.length,
    photosUploadedToDrive: photoUploadCount,
    photoIndexSheet: "DHDE Field Photos — Index (in Research folder)"
  }, null, 2));
}
