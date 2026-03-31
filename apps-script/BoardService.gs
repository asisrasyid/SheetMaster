// ─── Board Service ────────────────────────────────────────────────────────────

function getBoards(params, userId) {
  // Get boards where user is a member
  var memberships = findRows("Board_Members", "user_id", userId);
  var boardIds = memberships.map(function(m) { return m.board_id; });

  var allBoards = getAllRows("Boards").filter(function(b) {
    return boardIds.indexOf(b.id) !== -1 && String(b.is_archived) !== "true";
  });

  var roleMap = {};
  memberships.forEach(function(m) { roleMap[m.board_id] = m.role; });

  return ok(allBoards.map(function(b) {
    return {
      id: b.id,
      name: b.name,
      description: b.description,
      createdBy: b.created_by,
      createdAt: b.created_at,
      isArchived: b.is_archived === "true" || b.is_archived === true,
      myRole: roleMap[b.id] || "viewer"
    };
  }));
}

function createBoard(params, userId) {
  var name = params.name;
  var description = params.description || "";
  if (!name) return err("Board name required");

  var boardId = generateId();
  appendRow("Boards", {
    id: boardId,
    name: name,
    description: description,
    created_by: userId,
    created_at: now(),
    is_archived: false
  });

  // Add creator as owner
  appendRow("Board_Members", {
    board_id: boardId,
    user_id: userId,
    role: "owner"
  });

  // Create default columns
  var defaultCols = [
    { name: "To Do", color: "#64748b" },
    { name: "In Progress", color: "#3b82f6" },
    { name: "Review", color: "#f59e0b", requiresApproval: true },
    { name: "Done", color: "#10b981" }
  ];
  defaultCols.forEach(function(col, i) {
    appendRow("Columns", {
      id: generateId(),
      board_id: boardId,
      name: col.name,
      position: i,
      color: col.color,
      requires_approval: col.requiresApproval ? true : false
    });
  });

  var user = findRow("Users", "id", userId);
  return ok({
    id: boardId,
    name: name,
    description: description,
    createdBy: userId,
    createdAt: now(),
    isArchived: false,
    myRole: "owner"
  });
}

function updateBoard(params, userId) {
  var boardId = params.boardId;
  var role = getBoardRole(boardId, userId);
  if (!role || (role !== "owner" && role !== "approver")) return err("Insufficient permissions");

  updateRow("Boards", "id", boardId, {
    name: params.name || undefined,
    description: params.description !== undefined ? params.description : undefined
  });

  var board = findRow("Boards", "id", boardId);
  return ok({ id: board.id, name: board.name, description: board.description });
}

function deleteBoard(params, userId) {
  var boardId = params.boardId;
  var role = getBoardRole(boardId, userId);
  if (role !== "owner") return err("Only owner can delete board");

  // Clean up all related data
  var cols = findRows("Columns", "board_id", boardId);
  var tasks = findRows("Tasks", "board_id", boardId);
  tasks.forEach(function(t) {
    deleteRows("Task_Assignees", "task_id", t.id);
    deleteRows("SubTasks", "task_id", t.id);
    deleteRows("Task_Labels", "task_id", t.id);
    deleteRows("Approvals", "task_id", t.id);
  });
  cols.forEach(function(c) { deleteRow("Columns", "id", c.id); });
  deleteRows("Tasks", "board_id", boardId);
  deleteRows("Labels", "board_id", boardId);
  deleteRows("Board_Members", "board_id", boardId);
  deleteRow("Boards", "id", boardId);

  return ok(null);
}

function getBoard(params, userId) {
  var boardId = params.boardId;
  var role = getBoardRole(boardId, userId);
  if (!role) return err("Access denied");

  var board = findRow("Boards", "id", boardId);
  if (!board) return err("Board not found");

  var columns = findRows("Columns", "board_id", boardId).map(function(c) {
    return {
      id: c.id,
      boardId: c.board_id,
      name: c.name,
      position: parseInt(c.position) || 0,
      color: c.color,
      requiresApproval: c.requires_approval === "true" || c.requires_approval === true
    };
  });

  var rawTasks = findRows("Tasks", "board_id", boardId);
  var allAssignees = getAllRows("Task_Assignees");
  var allSubTasks = getAllRows("SubTasks");
  var allTaskLabels = getAllRows("Task_Labels");
  var allLabels = findRows("Labels", "board_id", boardId);
  var allApprovals = getAllRows("Approvals");
  var allUsers = getAllRows("Users");

  var userMap = {};
  allUsers.forEach(function(u) {
    userMap[u.id] = { id: u.id, name: u.name, avatarColor: u.avatar_color };
  });

  var labelMap = {};
  allLabels.forEach(function(l) { labelMap[l.id] = { id: l.id, boardId: l.board_id, name: l.name, color: l.color }; });

  var tasks = rawTasks.map(function(t) {
    var assignees = allAssignees
      .filter(function(a) { return a.task_id === t.id; })
      .map(function(a) { return userMap[a.user_id] || null; })
      .filter(Boolean);

    var subTasks = allSubTasks
      .filter(function(s) { return s.task_id === t.id; })
      .map(function(s) {
        return {
          id: s.id,
          taskId: s.task_id,
          title: s.title,
          isCompleted: s.is_completed === "true" || s.is_completed === true,
          position: parseInt(s.position) || 0
        };
      });

    var taskLabelIds = allTaskLabels.filter(function(tl) { return tl.task_id === t.id; }).map(function(tl) { return tl.label_id; });
    var labels = taskLabelIds.map(function(id) { return labelMap[id]; }).filter(Boolean);

    var pendingApproval = allApprovals.find(function(a) {
      return a.task_id === t.id && a.status === "pending";
    });

    return {
      id: t.id,
      boardId: t.board_id,
      columnId: t.column_id,
      title: t.title,
      description: t.description || "",
      priority: t.priority || "medium",
      deadline: t.deadline || null,
      createdBy: t.created_by,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      position: parseInt(t.position) || 0,
      assignees: assignees,
      labels: labels,
      subTasks: subTasks,
      pendingApproval: pendingApproval ? {
        id: pendingApproval.id,
        status: pendingApproval.status
      } : null
    };
  });

  var members = findRows("Board_Members", "board_id", boardId).map(function(m) {
    var u = userMap[m.user_id];
    return u ? {
      userId: m.user_id,
      name: u.name,
      username: findRow("Users", "id", m.user_id)?.username || "",
      avatarColor: u.avatarColor,
      role: m.role
    } : null;
  }).filter(Boolean);

  return ok({
    board: {
      id: board.id,
      name: board.name,
      description: board.description,
      createdBy: board.created_by,
      createdAt: board.created_at,
      isArchived: board.is_archived === "true",
      myRole: role
    },
    columns: columns,
    tasks: tasks,
    members: members,
    labels: allLabels.map(function(l) { return { id: l.id, boardId: l.board_id, name: l.name, color: l.color }; })
  });
}

function getBoardMembers(params, userId) {
  var boardId = params.boardId;
  if (!getBoardRole(boardId, userId)) return err("Access denied");
  var members = findRows("Board_Members", "board_id", boardId);
  var users = getAllRows("Users");
  var userMap = {};
  users.forEach(function(u) { userMap[u.id] = u; });

  return ok(members.map(function(m) {
    var u = userMap[m.user_id];
    return u ? { userId: m.user_id, name: u.name, username: u.username, avatarColor: u.avatar_color, role: m.role } : null;
  }).filter(Boolean));
}

function addBoardMember(params, userId) {
  var boardId = params.boardId;
  var role = getBoardRole(boardId, userId);
  if (role !== "owner") return err("Only owner can add members");

  var targetUser = findRow("Users", "username", params.username);
  if (!targetUser) return err("User not found: " + params.username);

  var existing = findRows("Board_Members", "board_id", boardId).find(function(m) { return m.user_id === targetUser.id; });
  if (existing) return err("User is already a member");

  appendRow("Board_Members", {
    board_id: boardId,
    user_id: targetUser.id,
    role: params.role || "contributor"
  });
  return ok(null);
}

function updateBoardMember(params, userId) {
  var boardId = params.boardId;
  if (getBoardRole(boardId, userId) !== "owner") return err("Only owner can change roles");

  var members = findRows("Board_Members", "board_id", boardId);
  var sheet = getSheet("Board_Members");
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var boardIdx = headers.indexOf("board_id");
  var userIdx = headers.indexOf("user_id");
  var roleIdx = headers.indexOf("role");

  for (var i = 1; i < data.length; i++) {
    if (data[i][boardIdx] === boardId && data[i][userIdx] === params.userId) {
      sheet.getRange(i + 1, roleIdx + 1).setValue(params.role);
      return ok(null);
    }
  }
  return err("Member not found");
}

function removeBoardMember(params, userId) {
  var boardId = params.boardId;
  if (getBoardRole(boardId, userId) !== "owner") return err("Only owner can remove members");

  var sheet = getSheet("Board_Members");
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var boardIdx = headers.indexOf("board_id");
  var userIdx = headers.indexOf("user_id");

  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][boardIdx] === boardId && data[i][userIdx] === params.userId) {
      sheet.deleteRow(i + 1);
      return ok(null);
    }
  }
  return err("Member not found");
}

// ─── Column Operations ────────────────────────────────────────────────────────

function createColumn(params, userId) {
  var boardId = params.boardId;
  var role = getBoardRole(boardId, userId);
  if (!role || (role !== "owner" && role !== "approver")) return err("Insufficient permissions");

  var cols = findRows("Columns", "board_id", boardId);
  var position = cols.length;
  var colId = generateId();

  appendRow("Columns", {
    id: colId,
    board_id: boardId,
    name: params.name || "New Column",
    position: position,
    color: params.color || "#64748b",
    requires_approval: false
  });

  return ok({
    id: colId,
    boardId: boardId,
    name: params.name,
    position: position,
    color: params.color || "#64748b",
    requiresApproval: false
  });
}

function updateColumn(params, userId) {
  var colId = params.columnId;
  var col = findRow("Columns", "id", colId);
  if (!col) return err("Column not found");

  var role = getBoardRole(col.board_id, userId);
  if (!role || (role !== "owner" && role !== "approver")) return err("Insufficient permissions");

  updateRow("Columns", "id", colId, {
    name: params.name,
    color: params.color,
    requires_approval: params.requiresApproval ? true : false
  });
  return ok(null);
}

function deleteColumn(params, userId) {
  var colId = params.columnId;
  var col = findRow("Columns", "id", colId);
  if (!col) return err("Column not found");

  var role = getBoardRole(col.board_id, userId);
  if (role !== "owner" && role !== "approver") return err("Insufficient permissions");

  // Delete tasks in column
  var tasks = findRows("Tasks", "column_id", colId);
  tasks.forEach(function(t) {
    deleteRows("Task_Assignees", "task_id", t.id);
    deleteRows("SubTasks", "task_id", t.id);
    deleteRows("Task_Labels", "task_id", t.id);
    deleteRow("Tasks", "id", t.id);
  });
  deleteRow("Columns", "id", colId);
  return ok(null);
}

function reorderColumns(params, userId) {
  var columnIds = params.columnIds;
  if (!columnIds || !Array.isArray(columnIds)) return err("columnIds required");

  columnIds.forEach(function(colId, i) {
    var col = findRow("Columns", "id", colId);
    if (!col) return;
    var role = getBoardRole(col.board_id, userId);
    if (role === "owner" || role === "approver") {
      updateRow("Columns", "id", colId, { position: i });
    }
  });
  return ok(null);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBoardRole(boardId, userId) {
  var membership = findRows("Board_Members", "board_id", boardId).find(function(m) {
    return m.user_id === userId;
  });
  return membership ? membership.role : null;
}
