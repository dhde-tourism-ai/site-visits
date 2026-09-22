/**
 * DHDE Field Survey — one-time backfill of existing Firestore data into the
 * Google Forms response sheets, and existing field photos into Drive.
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
 * HOW TO RUN:
 *   1. In the SAME Apps Script project as generate-survey-forms.gs (or a
 *      new one — doesn't matter), add this as a new file.
 *   2. Select "backfillAll" in the function dropdown, click Run.
 *   3. Approve the extra permission prompt (it now also needs to fetch a
 *      URL — that's the Firestore REST call).
 *   4. Check View -> Logs for a summary (counts per form, photos uploaded).
 *
 * This is meant to run ONCE. Re-running will append the same rows again
 * (Firestore data doesn't disappear once backfilled) — if you need to
 * re-run, clear the rows you already backfilled first.
 */

var PROJECT_ID = "dhde-site-visits";
var TEAM_CODE = "dhde-fukui-2026";
var RESEARCH_FOLDER_ID = "1Kwg8cFmt49GgcHo-R9ASuWoZfa9SYNvo"; // Research (in Sakura - Team Folder)
var PHOTOS_FOLDER_ID = "1z5a7r68L7a0_X5hXQ6JkIhP-LiR5LrsO";   // Research / Photos

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

function findResponseSheet_(titleContains) {
  var folder = DriveApp.getFolderById(RESEARCH_FOLDER_ID);
  var files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
  while (files.hasNext()) {
    var f = files.next();
    if (f.getName().indexOf(titleContains) !== -1) return SpreadsheetApp.openById(f.getId()).getSheets()[0];
  }
  return null;
}

function ensurePhotoLinkHeader_(sheet) {
  if (!sheet) return;
  var lastCol = sheet.getLastColumn();
  var header = sheet.getRange(1, lastCol).getValue();
  if (header !== "Photo Link") {
    sheet.getRange(1, lastCol + 1).setValue("Photo Link");
  }
}

function backfillAll() {
  var entries = fetchCollection_("entries").filter(function (e) { return e.teamCode === TEAM_CODE; });
  var photos = fetchCollection_("photos").filter(function (p) { return p.teamCode === TEAM_CODE; });
  var surveyEntries = entries.filter(function (e) { return e.catId === "survey"; });

  // Upload every photo to Drive first, regardless of category, and keep a
  // map of which uploaded link belongs to which entry (for survey linking).
  var uploadedPhotoLinks = {};
  var photoUploadCount = 0;
  photos.forEach(function (p) {
    try {
      var b64 = (p.dataUrl || "").split(",")[1];
      if (!b64) return;
      var bytes = Utilities.base64Decode(b64);
      var filename = "dhde_" + p.day + "_" + p.site + "_" + p.catId + "_" + String(p.author || "").replace(/\s+/g, "-") + ".jpg";
      var blob = Utilities.newBlob(bytes, "image/jpeg", filename);
      var file = DriveApp.getFolderById(PHOTOS_FOLDER_ID).createFile(blob);
      uploadedPhotoLinks[p.entryId] = file.getUrl();
      photoUploadCount++;
    } catch (e) {
      Logger.log("Photo upload failed for " + p.id + ": " + e);
    }
  });

  var sheets = {
    business: findResponseSheet_("Business"),
    staff: findResponseSheet_("Staff"),
    tourist: findResponseSheet_("Tourist")
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
    var siteLabel = (e.siteName || e.site || "") + (e.dayLabel ? (" — " + e.dayLabel) : "");
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
    photosUploadedToDrive: photoUploadCount
  }, null, 2));
}
