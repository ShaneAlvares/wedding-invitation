/**
 * Paste this into the reply spreadsheet:
 * Extensions → Apps Script → replace Code.gs → Save.
 * Deploy → New deployment → Web app.
 * Execute as: Me
 * Who has access: Anyone
 * Copy the web app URL into sheetUrl in js/wedding.js.
 */
var SHEET_ID = "1-bt6ZgRbVSmOZSzA03QeXB8FqmkLp6V-04tAoAf23i0";
var PASSCODE = "rosewood";
var HEADERS = ["Name", "Coming", "Note", "Submitted", "Updated", "Id", "Token"];

function doGet() {
  return json({ ok: true });
}

function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    if (!body || typeof body !== "object") {
      return json({ error: "Please send your reply again." });
    }
    var action = body.action || "submit";
    if (action === "health") return json({ ok: true });
    if (action === "list") {
      if (!authorized(body.code)) return json({ error: "Unauthorized" });
      return json({ items: listItems() });
    }
    if (action === "delete") {
      if (!authorized(body.code)) return json({ error: "Unauthorized" });
      deleteItem(body.id);
      return json({ ok: true });
    }
    return json(upsert(body));
  } catch (error) {
    return json({ error: error && error.message ? error.message : "Could not save your reply." });
  }
}

function json(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function authorized(code) {
  var given = String(code || "");
  if (given.length !== PASSCODE.length) return false;
  return given === PASSCODE;
}

function spreadsheet() {
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  return SpreadsheetApp.openById(SHEET_ID);
}

function ensureSheet() {
  var sh = spreadsheet().getSheets()[0];
  var first = sh.getLastRow() === 0 ? "" : String(sh.getRange(1, 1).getValue());
  if (first !== "Name") {
    if (sh.getLastRow() > 0) sh.insertRowBefore(1);
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
  sh.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  sh.setFrozenRows(1);
  sh.hideColumns(6, 2);
  return sh;
}

function clean(value, limit) {
  return String(value == null ? "" : value).replace(/\u0000/g, "").trim().slice(0, limit);
}

function asIso(value) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return value.toISOString();
  }
  return String(value || "");
}

function rowToRecord(row) {
  var attending = String(row[1] || "").toLowerCase() === "yes";
  return {
    name: String(row[0] || ""),
    attending: attending,
    note: String(row[2] || ""),
    createdAt: asIso(row[3]),
    updatedAt: asIso(row[4]),
    id: String(row[5] || ""),
    token: String(row[6] || ""),
    email: "",
    partySize: attending ? 1 : 0,
    companion: "",
    courseId: "",
    courseName: "",
    dietary: [],
    transport: false,
    song: "",
  };
}

function publicRecord(record) {
  var copy = {};
  Object.keys(record).forEach(function (key) {
    if (key !== "token") copy[key] = record[key];
  });
  return copy;
}

function readRows(sh) {
  var last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
}

function listItems() {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    return readRows(ensureSheet()).filter(function (row) {
      return String(row[0] || "").trim() || String(row[5] || "").trim();
    }).map(function (row) {
      return publicRecord(rowToRecord(row));
    });
  } finally {
    lock.releaseLock();
  }
}

function upsert(body) {
  var name = clean(body.name, 80);
  if (name.length < 2) throw new Error("Please enter your full name.");
  var note = clean(body.note, 600);
  var attending = Boolean(body.attending);
  var now = new Date().toISOString();
  var incomingId = clean(body.id, 40);
  var incomingToken = clean(body.token, 80);

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = ensureSheet();
    var rows = readRows(sh);
    var match = -1;
    if (incomingId && incomingToken) {
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i][5]) === incomingId && String(rows[i][6]) === incomingToken) {
          match = i;
          break;
        }
      }
    }

    var record;
    if (match >= 0) {
      record = rowToRecord(rows[match]);
      record.name = name;
      record.attending = attending;
      record.note = note;
      record.updatedAt = now;
      record.partySize = attending ? 1 : 0;
      writeRecord(sh, match + 2, record);
      return record;
    }

    record = {
      name: name,
      attending: attending,
      note: note,
      createdAt: now,
      updatedAt: now,
      id: Utilities.getUuid(),
      token: Utilities.getUuid(),
      email: "",
      partySize: attending ? 1 : 0,
      companion: "",
      courseId: "",
      courseName: "",
      dietary: [],
      transport: false,
      song: "",
    };
    writeRecord(sh, sh.getLastRow() + 1, record);
    return record;
  } finally {
    lock.releaseLock();
  }
}

function writeRecord(sh, row, record) {
  sh.getRange(row, 1, 1, HEADERS.length).setValues([[
    record.name,
    record.attending ? "Yes" : "No",
    record.note,
    record.createdAt,
    record.updatedAt,
    record.id,
    record.token,
  ]]);
}

function deleteItem(id) {
  var target = clean(id, 40);
  if (!target) return;
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = ensureSheet();
    var rows = readRows(sh);
    for (var i = rows.length - 1; i >= 0; i--) {
      if (String(rows[i][5]) === target) sh.deleteRow(i + 2);
    }
  } finally {
    lock.releaseLock();
  }
}
