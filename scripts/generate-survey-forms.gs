/**
 * DHDE Field Survey — Google Forms generator.
 *
 * Creates three Google Forms (Business/Shop Owner, Staff, Tourist/Visitor),
 * each starting with a verbal-consent gate, matching the app's exact
 * bilingual (EN/JA) question set, with required-field validation so nothing
 * comes back incomplete. Each form's responses land in their own linked
 * Google Sheet. Everything (forms + sheets) is moved into the Research
 * folder (inside Sakura - Team Folder) automatically.
 *
 * HOW TO RUN:
 *   1. Go to https://script.google.com -> New project.
 *   2. Delete the placeholder code, paste this whole file in.
 *   3. Save (Ctrl+S / Cmd+S), name the project anything.
 *   4. In the toolbar dropdown, select the function "createAllSurveyForms".
 *   5. Click Run. The first time, Google will ask you to authorize the
 *      script (it needs to create Forms/Sheets and move files in your
 *      Drive) — this is your own script acting as you, a normal one-time
 *      consent prompt.
 *   6. View -> Logs (or Ctrl+Enter) to see the three live links.
 *
 * Re-running creates brand-new forms each time (it does not edit existing
 * ones) — delete the previous attempt in Drive first if you're iterating.
 *
 * REVIEW BEFORE FIELD USE:
 *   - The consent script below is a draft for a minimal-risk, anonymous
 *     survey — NOT reviewed by your program's ethics process. Get it
 *     signed off (see the "Data ethics and safety review" item on your
 *     schedule) before relying on it.
 *   - Have a Japanese speaker sanity-check the JA text; it was translated
 *     by an AI assistant, not a native reviewer.
 */

var TEAM_FOLDER_ID = "1Kwg8cFmt49GgcHo-R9ASuWoZfa9SYNvo"; // "Research" folder in "Sakura - Team Folder"

var SITES = [
  "21 Sep — Dotonbori & Namba (Osaka)",
  "21 Sep — Umeda & Osaka Station",
  "21 Sep — Kiyomizu-dera / Ninen-zaka / Sannen-zaka (Kyoto)",
  "23 Sep — Eiheiji Temple",
  "23 Sep — Fukui Prefectural Dinosaur Museum",
  "23 Sep — Tojinbo & Echizen Coast",
  "24 Sep — Komatsu Airport",
  "24 Sep — 21st Century Museum (Kanazawa)",
  "24 Sep — Kenroku-en Garden",
  "24 Sep — Kanazawa Castle Park",
  "24 Sep — Omicho Market",
  "24 Sep — Higashi Chaya District",
  "24 Sep — Kanazawa Station & Tsuzumi-mon Gate",
  "2 Oct — Eiheiji / Katsuyama Merchants",
  "8 Oct — Ichijodani Asakura Clan Ruins"
];

var CONSENT_TITLE = "Consent / 同意確認";
var CONSENT_HELP =
  "Read or paraphrase this before asking any questions — do not skip it:\n\n" +
  "EN: “Hi, we're a research team from the University of Fukui / Sakura Science Program, studying how to improve the visitor experience here. Would you mind answering a few quick questions? It's anonymous, voluntary, takes about 2 minutes, and you can skip anything or stop at any time. Your answers are used only for university research and a report to local tourism authorities.”\n\n" +
  "JA: 「こんにちは。私たちは福井大学・さくらサイエンスプログラムの研究チームです。この地域の観光体験向上のための調査をしています。少しだけ質問にお答えいただけますか？匿名・任意で2分ほどです。答えたくない質問はスキップでき、いつでも中断できます。回答は大学の研究と地域の観光関係機関への報告にのみ使用します。」";

function createAllSurveyForms() {
  var report = [];
  report.push(buildBusinessForm());
  report.push(buildStaffForm());
  report.push(buildTouristForm());
  Logger.log(report.join("\n\n"));
}

function addMc(form, title, options) {
  form.addMultipleChoiceItem().setTitle(title).setChoiceValues(options).setRequired(true);
}
function addCheckbox(form, title, options) {
  form.addCheckboxItem().setTitle(title).setChoiceValues(options).setRequired(true);
}

function addCommonHeader(form) {
  form.setCollectEmail(false);
  form.setLimitOneResponsePerUser(false);
  form.setShowLinkToRespondAgain(true);
  form.setProgressBar(true);

  form.addSectionHeaderItem().setTitle(CONSENT_TITLE).setHelpText(CONSENT_HELP);

  var consent = form.addMultipleChoiceItem()
    .setTitle("Did the participant give verbal consent to continue? / 参加者は口頭で同意しましたか？")
    .setRequired(true);
  consent.setChoices([
    consent.createChoice("Yes / はい", FormApp.PageNavigationType.CONTINUE),
    consent.createChoice("No / いいえ (stop here — do not proceed with the rest)", FormApp.PageNavigationType.SUBMIT)
  ]);

  form.addListItem().setTitle("Site / 場所").setChoiceValues(SITES).setRequired(true);
  form.addTextItem().setTitle("If the site isn't listed, name it here / 上記にない場合はこちらに記入");
  form.addTextItem().setTitle("Your name (recorder) / 記録者名").setRequired(true);
}

function moveToTeamFolder(fileId) {
  var file = DriveApp.getFileById(fileId);
  var folder = DriveApp.getFolderById(TEAM_FOLDER_ID);
  var oldParents = [];
  var it = file.getParents();
  while (it.hasNext()) oldParents.push(it.next());
  folder.addFile(file);
  oldParents.forEach(function (p) { if (p.getId() !== TEAM_FOLDER_ID) p.removeFile(file); });
}

function finalizeForm(form, title) {
  var ss = SpreadsheetApp.create(title + " (Responses)");
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  moveToTeamFolder(form.getId());
  moveToTeamFolder(ss.getId());
  return title + ":\n  Fill in: " + form.getPublishedUrl() + "\n  Edit: " + form.getEditUrl() + "\n  Responses sheet: " + ss.getUrl();
}

function buildBusinessForm() {
  var form = FormApp.create("DHDE Field Survey — Business / Shop Owner");
  form.setDescription("Sakura Science / DHDE tourism fieldwork. For team members to fill in while interviewing a business or shop owner.");
  addCommonHeader(form);

  form.addTextItem().setTitle("Business name / 店舗名").setRequired(true);
  form.addTextItem().setTitle("Business type / 業種");

  addMc(form, "About how many customers do you get on a typical day? / 一日に大体何人のお客様が来られますか?",
    ["Fewer than 20 / 20人未満", "20–50 / 20〜50人", "50–100 / 50〜100人", "100–300 / 100〜300人", "More than 300 / 300人以上", "Cannot answer / 回答できません"]);

  addMc(form, "Roughly what share of your customers are visitors from outside Japan? / お客様のうち、海外からの観光客はどのくらいの割合ですか?",
    ["Almost none (0–10%) / ほとんどいない(0〜10%)", "A few (10–30%) / 少し(10〜30%)", "About half (30–50%) / 約半分(30〜50%)", "Most (50–80%) / 多い(50〜80%)", "Nearly all (80–100%) / ほとんど(80〜100%)", "Cannot answer / 回答できません"]);

  addMc(form, "When is it busiest for you? / 一番忙しい時間帯はいつですか?",
    ["Morning (before 11am) / 午前(11時前)", "Midday (11am–2pm) / 昼(11時〜14時)", "Afternoon (2–5pm) / 午後(14時〜17時)", "Evening (after 5pm) / 夕方以降(17時以降)", "Weekends busier than weekdays / 平日より週末が忙しい", "Cannot answer / 回答できません"]);

  addCheckbox(form, "What language support do you offer non-Japanese-speaking customers? / 日本語が話せないお客様への言語サポートはありますか?",
    ["Menu/signage in other languages / 他言語のメニュー・表示", "Staff who speak other languages / 他言語を話せるスタッフ", "Translation app or device / 翻訳アプリ・機器", "QR code / QRコード", "None currently / 特にない", "Cannot answer / 回答できません"]);

  addCheckbox(form, "What payment methods do you accept? / どの支払い方法に対応していますか?",
    ["Cash only / 現金のみ", "IC card (Suica/ICOCA) / ICカード", "Credit card / クレジットカード", "QR payment (PayPay etc.) / QR決済", "Alipay / WeChat Pay", "Cannot answer / 回答できません"]);

  addMc(form, "How has the number of foreign tourists changed over the last year? / この一年で外国人観光客の数はどう変化しましたか?",
    ["Increased a lot / 大きく増えた", "Increased a little / 少し増えた", "About the same / 変わらない", "Decreased a little / 少し減った", "Decreased a lot / 大きく減った", "Not sure / cannot answer / わからない・回答できません"]);

  form.addParagraphTextItem().setTitle("What is the single biggest challenge you face with tourist customers right now? / 現在、観光客のお客様に関して一番困っていることは何ですか?").setRequired(true);

  return finalizeForm(form, "DHDE Field Survey — Business");
}

function buildStaffForm() {
  var form = FormApp.create("DHDE Field Survey — Staff");
  form.setDescription("Sakura Science / DHDE tourism fieldwork. For team members to fill in while interviewing attraction/station/tourism-office staff.");
  addCommonHeader(form);

  form.addTextItem().setTitle("Role / organization / 役職・所属");

  form.addParagraphTextItem().setTitle("What questions do visitors ask you most often? / 観光客からよく聞かれる質問は何ですか?").setRequired(true);
  form.addParagraphTextItem().setTitle("What is the most common complaint or point of confusion you hear? / よくある苦情や混乱ポイントは何ですか?").setRequired(true);
  form.addParagraphTextItem().setTitle("Is there anything about facilities here (signage, restrooms, rest areas) that visitors often struggle with? / 施設(案内表示・トイレ・休憩所など)について観光客がよく困ることはありますか?").setRequired(true);
  form.addParagraphTextItem().setTitle("Do you feel adequately equipped to help non-Japanese-speaking visitors? / 日本語を話さない観光客への対応に十分な準備ができていると感じますか?").setRequired(true);

  return finalizeForm(form, "DHDE Field Survey — Staff");
}

function buildTouristForm() {
  var form = FormApp.create("DHDE Field Survey — Tourist / Visitor");
  form.setDescription("Sakura Science / DHDE tourism fieldwork. For team members to fill in while interviewing a tourist or visitor.");
  addCommonHeader(form);

  form.addTextItem().setTitle("Country / region of origin / 出身国・地域").setRequired(true);
  form.addTextItem().setTitle("Language most comfortable in / 話しやすい言語");
  form.addMultipleChoiceItem().setTitle("Group type / グループの種類").setChoiceValues(["Solo", "Couple", "Family", "Friends", "Tour group"]);

  form.addParagraphTextItem().setTitle("What brought you to this area today? / 今日このエリアに来た目的は何ですか?").setRequired(true);
  form.addParagraphTextItem().setTitle("Was there anything here that was hard to find or understand? / ここで分かりにくかったこと、探しにくかったことはありますか?");
  form.addParagraphTextItem().setTitle("Did you have any trouble with language, payment, or getting around? / 言語、支払い、移動で困ったことはありますか?");
  form.addParagraphTextItem().setTitle("What's one thing that would have made your visit better? / 訪問がもっと良くなるために、何か改善できるとしたら?");
  form.addParagraphTextItem().setTitle("Would you recommend this place to a friend? Why or why not? / 友人にこの場所を勧めますか?その理由は?");

  return finalizeForm(form, "DHDE Field Survey — Tourist");
}
