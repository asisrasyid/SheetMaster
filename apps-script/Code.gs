// ─── Main Router ──────────────────────────────────────────────────────────────
// Google Apps Script Web App Entry Point
// Deploy as: Execute as "Me", Who has access: "Anyone"

function doPost(e) {
  try {
    // Handle CORS preflight (though GAS doesn't support true CORS options)
    var params = JSON.parse(e.postData.contents);
    var action = params.action;
    var token = params.token;

    // Auth actions don't need token
    if (action === "login") return login(params);

    // All other actions require valid session
    var user = validateToken(token);
    if (!user) return err("Unauthorized");

    switch (action) {
      // Auth
      case "logout": return logout(params, user.id);

      // Boards
      case "getBoards": return getBoards(params, user.id);
      case "createBoard": return createBoard(params, user.id);
      case "updateBoard": return updateBoard(params, user.id);
      case "deleteBoard": return deleteBoard(params, user.id);
      case "getBoard": return getBoard(params, user.id);

      // Board Members
      case "getBoardMembers": return getBoardMembers(params, user.id);
      case "addBoardMember": return addBoardMember(params, user.id);
      case "updateBoardMember": return updateBoardMember(params, user.id);
      case "removeBoardMember": return removeBoardMember(params, user.id);

      // Columns
      case "createColumn": return createColumn(params, user.id);
      case "updateColumn": return updateColumn(params, user.id);
      case "deleteColumn": return deleteColumn(params, user.id);
      case "reorderColumns": return reorderColumns(params, user.id);

      // Tasks
      case "createTask": return createTask(params, user.id);
      case "updateTask": return updateTask(params, user.id);
      case "deleteTask": return deleteTask(params, user.id);
      case "moveTask": return moveTask(params, user.id);
      case "reorderTasks": return reorderTasks(params, user.id);

      // SubTasks
      case "createSubTask": return createSubTask(params, user.id);
      case "updateSubTask": return updateSubTask(params, user.id);
      case "deleteSubTask": return deleteSubTask(params, user.id);

      // Labels
      case "createLabel": return createLabel(params, user.id);
      case "deleteLabel": return deleteLabel(params, user.id);
      case "addTaskLabel": return addTaskLabel(params, user.id);
      case "removeTaskLabel": return removeTaskLabel(params, user.id);

      // Assignees
      case "addAssignee": return addAssignee(params, user.id);
      case "removeAssignee": return removeAssignee(params, user.id);

      // Approvals
      case "getPendingApprovals": return getPendingApprovals(params, user.id);
      case "approveTask": return approveTask(params, user.id);
      case "rejectTask": return rejectTask(params, user.id);

      default:
        return err("Unknown action: " + action);
    }
  } catch (error) {
    return err("Server error: " + error.message);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "SheetMaster API running",
    version: "1.0.0"
  })).setMimeType(ContentService.MimeType.JSON);
}

// ─── Spreadsheet Setup ───────────────────────────────────────────────────────
// Run this ONCE to create all sheet tabs with correct headers.
// Check the Execution Log (View > Logs or bottom panel) after running.

function setupSpreadsheet() {
  try {
    var ss = SpreadsheetApp.openById(SS_ID);
    Logger.log("=== setupSpreadsheet START ===");
    Logger.log("Spreadsheet opened: " + ss.getName() + " (id=" + SS_ID + ")");

    var SHEET_HEADERS = {
      "Users":         ["id", "username", "password_hash", "name", "avatar_color", "role_global", "is_active", "created_at"],
      "Sessions":      ["token", "user_id", "expires_at"],
      "Boards":        ["id", "name", "description", "created_by", "created_at", "is_archived"],
      "Board_Members": ["board_id", "user_id", "role"],
      "Columns":       ["id", "board_id", "name", "position", "color", "requires_approval"],
      "Tasks":         ["id", "board_id", "column_id", "title", "description", "priority", "deadline", "created_by", "created_at", "updated_at", "position"],
      "Task_Assignees":["task_id", "user_id"],
      "SubTasks":      ["id", "task_id", "title", "is_completed", "position"],
      "Labels":        ["id", "board_id", "name", "color"],
      "Task_Labels":   ["task_id", "label_id"],
      "Approvals":     ["id", "task_id", "from_column_id", "to_column_id", "requested_by", "approver_id", "status", "note", "created_at"]
    };

    var sheetNames = Object.keys(SHEET_HEADERS);
    var created = 0;
    var skipped = 0;

    for (var i = 0; i < sheetNames.length; i++) {
      var name = sheetNames[i];
      try {
        var sheet = ss.getSheetByName(name);
        if (!sheet) {
          sheet = ss.insertSheet(name);
          Logger.log("[NEW]     " + name);
          created++;
        } else {
          Logger.log("[EXISTS]  " + name);
        }

        var headers = SHEET_HEADERS[name];
        var existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
        var isEmpty = existing.every(function(h) { return h === ""; });
        if (isEmpty) {
          sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
          sheet.getRange(1, 1, 1, headers.length)
            .setBackground("#1e293b")
            .setFontColor("#e2e8f0")
            .setFontWeight("bold");
          sheet.setFrozenRows(1);
          Logger.log("  -> Headers written: " + headers.join(", "));
        } else {
          Logger.log("  -> Headers already present, skipped.");
          skipped++;
        }
      } catch (sheetErr) {
        Logger.log("[ERROR] Failed on sheet '" + name + "': " + sheetErr.message);
      }
    }

    // IMPORTANT: flush all pending writes to the spreadsheet before reading
    // from it in createInitialAdmin(). Without this, getLastColumn() may
    // return 0 on a freshly written sheet, causing appendRow() to fail.
    SpreadsheetApp.flush();
    Logger.log("Flush complete. Created=" + created + ", AlreadyExisted=" + skipped);

    // Create initial admin user (uses getSheet() internally, needs flushed state)
    try {
      createInitialAdmin();
    } catch (adminErr) {
      Logger.log("[ERROR] createInitialAdmin failed: " + adminErr.message);
      Logger.log("  Hint: check that the 'Users' sheet has correct headers.");
    }

    Logger.log("=== setupSpreadsheet COMPLETE ===");

  } catch (e) {
    Logger.log("=== FATAL ERROR in setupSpreadsheet: " + e.message + " ===");
    throw e; // re-throw so Apps Script shows it as a red error
  }
}

// ─── Diagnostic: run anytime to verify the spreadsheet state ─────────────────
function testSetup() {
  Logger.log("=== testSetup ===");
  try {
    var ss = SpreadsheetApp.openById(SS_ID);
    Logger.log("Spreadsheet: " + ss.getName());
  } catch (e) {
    Logger.log("FATAL: Cannot open spreadsheet. Check SS_ID. Error: " + e.message);
    return;
  }

  var expected = {
    "Users": 8, "Sessions": 3, "Boards": 6, "Board_Members": 3,
    "Columns": 6, "Tasks": 11, "Task_Assignees": 2, "SubTasks": 5,
    "Labels": 4, "Task_Labels": 2, "Approvals": 9
  };

  var ss2 = SpreadsheetApp.openById(SS_ID);
  var allOk = true;
  Object.keys(expected).forEach(function(name) {
    var sheet = ss2.getSheetByName(name);
    if (!sheet) {
      Logger.log("  [MISSING] " + name);
      allOk = false;
      return;
    }
    var cols = sheet.getLastColumn();
    var rows = sheet.getLastRow();
    var ok = cols === expected[name];
    Logger.log("  [" + (ok ? "OK" : "WRONG COLS") + "] " + name +
      " — columns: " + cols + "/" + expected[name] +
      ", data rows: " + Math.max(0, rows - 1));
    if (!ok) allOk = false;
  });

  // Check admin user
  try {
    var admin = findRow("Users", "username", "admin");
    if (admin) {
      Logger.log("  [OK] Admin user exists (is_active=" + admin.is_active + ", role=" + admin.role_global + ")");
    } else {
      Logger.log("  [MISSING] Admin user not found — run createInitialAdmin()");
      allOk = false;
    }
  } catch (e) {
    Logger.log("  [ERROR] Could not check admin user: " + e.message);
    allOk = false;
  }

  Logger.log(allOk ? "=== All checks passed ===" : "=== Some checks FAILED — re-run setupSpreadsheet() ===");
}

// ─── Non-destructive header repair (run if setup partially completed) ────────
function resetSheetHeaders() {
  Logger.log("=== resetSheetHeaders START ===");
  var ss = SpreadsheetApp.openById(SS_ID);

  var SHEET_HEADERS = {
    "Users":         ["id", "username", "password_hash", "name", "avatar_color", "role_global", "is_active", "created_at"],
    "Sessions":      ["token", "user_id", "expires_at"],
    "Boards":        ["id", "name", "description", "created_by", "created_at", "is_archived"],
    "Board_Members": ["board_id", "user_id", "role"],
    "Columns":       ["id", "board_id", "name", "position", "color", "requires_approval"],
    "Tasks":         ["id", "board_id", "column_id", "title", "description", "priority", "deadline", "created_by", "created_at", "updated_at", "position"],
    "Task_Assignees":["task_id", "user_id"],
    "SubTasks":      ["id", "task_id", "title", "is_completed", "position"],
    "Labels":        ["id", "board_id", "name", "color"],
    "Task_Labels":   ["task_id", "label_id"],
    "Approvals":     ["id", "task_id", "from_column_id", "to_column_id", "requested_by", "approver_id", "status", "note", "created_at"]
  };

  Object.keys(SHEET_HEADERS).forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      Logger.log("[SKIP] Sheet does not exist: " + name + " — run setupSpreadsheet() first");
      return;
    }
    if (sheet.getLastColumn() === 0) {
      var headers = SHEET_HEADERS[name];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length)
        .setBackground("#1e293b").setFontColor("#e2e8f0").setFontWeight("bold");
      sheet.setFrozenRows(1);
      Logger.log("[FIXED] Headers written for: " + name);
    } else {
      Logger.log("[OK]    Headers already present: " + name);
    }
  });

  SpreadsheetApp.flush();
  Logger.log("=== resetSheetHeaders COMPLETE ===");
}
