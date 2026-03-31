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
// Run this ONCE to create all sheet tabs with correct headers

function setupSpreadsheet() {
  var ss = SpreadsheetApp.openById(SS_ID);

  var sheets = {
    "Users": ["id", "username", "password_hash", "name", "avatar_color", "role_global", "is_active", "created_at"],
    "Sessions": ["token", "user_id", "expires_at"],
    "Boards": ["id", "name", "description", "created_by", "created_at", "is_archived"],
    "Board_Members": ["board_id", "user_id", "role"],
    "Columns": ["id", "board_id", "name", "position", "color", "requires_approval"],
    "Tasks": ["id", "board_id", "column_id", "title", "description", "priority", "deadline", "created_by", "created_at", "updated_at", "position"],
    "Task_Assignees": ["task_id", "user_id"],
    "SubTasks": ["id", "task_id", "title", "is_completed", "position"],
    "Labels": ["id", "board_id", "name", "color"],
    "Task_Labels": ["task_id", "label_id"],
    "Approvals": ["id", "task_id", "from_column_id", "to_column_id", "requested_by", "approver_id", "status", "note", "created_at"]
  };

  Object.keys(sheets).forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      Logger.log("Created sheet: " + name);
    }
    var headers = sheets[name];
    var existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    var isEmpty = existing.every(function(h) { return h === ""; });
    if (isEmpty) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      // Style header row
      sheet.getRange(1, 1, 1, headers.length)
        .setBackground("#1e293b")
        .setFontColor("#e2e8f0")
        .setFontWeight("bold");
      sheet.setFrozenRows(1);
      Logger.log("Headers set for: " + name);
    }
  });
  Logger.log("Setup complete!");

  // Create admin user
  createInitialAdmin();
}
