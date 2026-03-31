// ─── Sheet Helper ─────────────────────────────────────────────────────────────
// Utility functions for reading/writing Google Sheets

var SS_ID = "YOUR_SPREADSHEET_ID"; // Replace with your Spreadsheet ID

function getSheet(name) {
  var ss = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error("Sheet not found: " + name);
  return sheet;
}

function getAllRows(sheetName) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0];
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) {
      obj[h] = row[i];
    });
    return obj;
  });
}

function findRows(sheetName, fieldName, value) {
  return getAllRows(sheetName).filter(function(row) {
    return String(row[fieldName]) === String(value);
  });
}

function findRow(sheetName, fieldName, value) {
  var rows = findRows(sheetName, fieldName, value);
  return rows.length > 0 ? rows[0] : null;
}

function appendRow(sheetName, obj) {
  var sheet = getSheet(sheetName);
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    throw new Error("Sheet '" + sheetName + "' has no columns. Run setupSpreadsheet() first, then SpreadsheetApp.flush() before writing data.");
  }
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var row = headers.map(function(h) { return obj[h] !== undefined ? obj[h] : ""; });
  sheet.appendRow(row);
}

function updateRow(sheetName, idField, idValue, updates) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idIdx = headers.indexOf(idField);
  if (idIdx === -1) throw new Error("Field not found: " + idField);

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]) === String(idValue)) {
      Object.keys(updates).forEach(function(key) {
        var colIdx = headers.indexOf(key);
        if (colIdx !== -1) {
          sheet.getRange(i + 1, colIdx + 1).setValue(updates[key]);
        }
      });
      return true;
    }
  }
  return false;
}

function deleteRow(sheetName, idField, idValue) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idIdx = headers.indexOf(idField);
  if (idIdx === -1) throw new Error("Field not found: " + idField);

  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][idIdx]) === String(idValue)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function deleteRows(sheetName, fieldName, value) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var fieldIdx = headers.indexOf(fieldName);
  if (fieldIdx === -1) return;

  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][fieldIdx]) === String(value)) {
      sheet.deleteRow(i + 1);
    }
  }
}

function generateId() {
  return Utilities.getUuid().replace(/-/g, "").slice(0, 16);
}

function now() {
  return new Date().toISOString();
}

function ok(data) {
  return ContentService.createTextOutput(JSON.stringify({ success: true, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function err(message) {
  return ContentService.createTextOutput(JSON.stringify({ success: false, error: message }))
    .setMimeType(ContentService.MimeType.JSON);
}

function hashPassword(password) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  return bytes.map(function(b) {
    return (b < 0 ? b + 256 : b).toString(16).padStart(2, "0");
  }).join("");
}
