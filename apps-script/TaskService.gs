// ─── Task Service ─────────────────────────────────────────────────────────────

function createTask(params, userId) {
  var boardId = params.boardId;
  var columnId = params.columnId;
  var role = getBoardRole(boardId, userId);
  if (!role || role === "viewer") return err("Insufficient permissions");

  var colTasks = findRows("Tasks", "column_id", columnId);
  var position = colTasks.length;
  var taskId = generateId();
  var timestamp = now();

  appendRow("Tasks", {
    id: taskId,
    board_id: boardId,
    column_id: columnId,
    title: params.title,
    description: "",
    priority: params.priority || "medium",
    deadline: "",
    created_by: userId,
    created_at: timestamp,
    updated_at: timestamp,
    position: position
  });

  return ok({
    id: taskId,
    boardId: boardId,
    columnId: columnId,
    title: params.title,
    description: "",
    priority: params.priority || "medium",
    deadline: null,
    createdBy: userId,
    createdAt: timestamp,
    updatedAt: timestamp,
    position: position,
    assignees: [],
    labels: [],
    subTasks: [],
    pendingApproval: null
  });
}

function updateTask(params, userId) {
  var taskId = params.taskId;
  var task = findRow("Tasks", "id", taskId);
  if (!task) return err("Task not found");

  var role = getBoardRole(task.board_id, userId);
  if (!role || role === "viewer") return err("Insufficient permissions");
  // Contributor can only edit own tasks
  if (role === "contributor" && task.created_by !== userId) return err("Can only edit own tasks");

  var updates = { updated_at: now() };
  if (params.title !== undefined) updates.title = params.title;
  if (params.description !== undefined) updates.description = params.description;
  if (params.priority !== undefined) updates.priority = params.priority;
  if (params.deadline !== undefined) updates.deadline = params.deadline;

  updateRow("Tasks", "id", taskId, updates);
  return ok(null);
}

function deleteTask(params, userId) {
  var taskId = params.taskId;
  var task = findRow("Tasks", "id", taskId);
  if (!task) return err("Task not found");

  var role = getBoardRole(task.board_id, userId);
  if (!role || role === "viewer") return err("Insufficient permissions");
  if (role === "contributor" && task.created_by !== userId) return err("Can only delete own tasks");

  deleteRows("Task_Assignees", "task_id", taskId);
  deleteRows("SubTasks", "task_id", taskId);
  deleteRows("Task_Labels", "task_id", taskId);
  deleteRows("Approvals", "task_id", taskId);
  deleteRow("Tasks", "id", taskId);
  return ok(null);
}

function moveTask(params, userId) {
  var taskId = params.taskId;
  var toColumnId = params.toColumnId;
  var position = parseInt(params.position) || 0;

  var task = findRow("Tasks", "id", taskId);
  if (!task) return err("Task not found");

  var toCol = findRow("Columns", "id", toColumnId);
  if (!toCol) return err("Column not found");

  var role = getBoardRole(task.board_id, userId);
  if (!role || role === "viewer") return err("Insufficient permissions");

  // Check if column requires approval
  var requiresApproval = toCol.requires_approval === "true" || toCol.requires_approval === true;
  if (requiresApproval && role === "contributor") {
    // Create approval request instead of moving
    var approvalId = generateId();
    var fromCol = findRow("Columns", "id", task.column_id);

    // Cancel any existing pending approval for this task
    var existing = findRows("Approvals", "task_id", taskId).filter(function(a) { return a.status === "pending"; });
    existing.forEach(function(a) { updateRow("Approvals", "id", a.id, { status: "cancelled" }); });

    appendRow("Approvals", {
      id: approvalId,
      task_id: taskId,
      from_column_id: task.column_id,
      to_column_id: toColumnId,
      requested_by: userId,
      approver_id: "",
      status: "pending",
      note: params.note || "",
      created_at: now()
    });
    return ok({ approvalRequested: true, approvalId: approvalId });
  }

  // Direct move (Owner/Approver, or non-approval column)
  updateRow("Tasks", "id", taskId, {
    column_id: toColumnId,
    position: position,
    updated_at: now()
  });
  return ok(null);
}

function reorderTasks(params, userId) {
  var columnId = params.columnId;
  var taskIds = params.taskIds;
  if (!taskIds || !Array.isArray(taskIds)) return err("taskIds required");

  var col = findRow("Columns", "id", columnId);
  if (!col) return err("Column not found");
  var role = getBoardRole(col.board_id, userId);
  if (!role || role === "viewer") return err("Insufficient permissions");

  taskIds.forEach(function(taskId, i) {
    updateRow("Tasks", "id", taskId, { position: i });
  });
  return ok(null);
}

// ─── SubTasks ─────────────────────────────────────────────────────────────────

function createSubTask(params, userId) {
  var task = findRow("Tasks", "id", params.taskId);
  if (!task) return err("Task not found");

  var role = getBoardRole(task.board_id, userId);
  if (!role || role === "viewer") return err("Insufficient permissions");

  var existing = findRows("SubTasks", "task_id", params.taskId);
  var subTaskId = generateId();
  appendRow("SubTasks", {
    id: subTaskId,
    task_id: params.taskId,
    title: params.title,
    is_completed: false,
    position: existing.length
  });
  return ok({ id: subTaskId });
}

function updateSubTask(params, userId) {
  var subTask = findRow("SubTasks", "id", params.subTaskId);
  if (!subTask) return err("SubTask not found");

  var task = findRow("Tasks", "id", subTask.task_id);
  if (!task) return err("Task not found");

  var role = getBoardRole(task.board_id, userId);
  if (!role || role === "viewer") return err("Insufficient permissions");

  var updates = {};
  if (params.title !== undefined) updates.title = params.title;
  if (params.isCompleted !== undefined) updates.is_completed = params.isCompleted;
  updateRow("SubTasks", "id", params.subTaskId, updates);
  return ok(null);
}

function deleteSubTask(params, userId) {
  var subTask = findRow("SubTasks", "id", params.subTaskId);
  if (!subTask) return err("SubTask not found");
  var task = findRow("Tasks", "id", subTask.task_id);
  var role = getBoardRole(task.board_id, userId);
  if (!role || role === "viewer") return err("Insufficient permissions");
  deleteRow("SubTasks", "id", params.subTaskId);
  return ok(null);
}

// ─── Labels ───────────────────────────────────────────────────────────────────

function createLabel(params, userId) {
  var boardId = params.boardId;
  var role = getBoardRole(boardId, userId);
  if (!role || (role !== "owner" && role !== "approver")) return err("Insufficient permissions");

  var labelId = generateId();
  appendRow("Labels", { id: labelId, board_id: boardId, name: params.name, color: params.color });
  return ok({ id: labelId });
}

function deleteLabel(params, userId) {
  var label = findRow("Labels", "id", params.labelId);
  if (!label) return err("Label not found");
  var role = getBoardRole(label.board_id, userId);
  if (role !== "owner" && role !== "approver") return err("Insufficient permissions");
  deleteRows("Task_Labels", "label_id", params.labelId);
  deleteRow("Labels", "id", params.labelId);
  return ok(null);
}

function addTaskLabel(params, userId) {
  var task = findRow("Tasks", "id", params.taskId);
  if (!task) return err("Task not found");
  var role = getBoardRole(task.board_id, userId);
  if (!role || role === "viewer") return err("Insufficient permissions");

  var existing = findRows("Task_Labels", "task_id", params.taskId).find(function(tl) { return tl.label_id === params.labelId; });
  if (!existing) appendRow("Task_Labels", { task_id: params.taskId, label_id: params.labelId });
  return ok(null);
}

function removeTaskLabel(params, userId) {
  var sheet = getSheet("Task_Labels");
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var taskIdx = headers.indexOf("task_id");
  var labelIdx = headers.indexOf("label_id");
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][taskIdx] === params.taskId && data[i][labelIdx] === params.labelId) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  return ok(null);
}

// ─── Assignees ────────────────────────────────────────────────────────────────

function addAssignee(params, userId) {
  var task = findRow("Tasks", "id", params.taskId);
  if (!task) return err("Task not found");
  var role = getBoardRole(task.board_id, userId);
  if (!role || role === "viewer") return err("Insufficient permissions");
  var existing = findRows("Task_Assignees", "task_id", params.taskId).find(function(a) { return a.user_id === params.userId; });
  if (!existing) appendRow("Task_Assignees", { task_id: params.taskId, user_id: params.userId });
  return ok(null);
}

function removeAssignee(params, userId) {
  var sheet = getSheet("Task_Assignees");
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var taskIdx = headers.indexOf("task_id");
  var userIdx = headers.indexOf("user_id");
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][taskIdx] === params.taskId && data[i][userIdx] === params.userId) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  return ok(null);
}

// ─── Approvals ────────────────────────────────────────────────────────────────

function getPendingApprovals(params, userId) {
  var allApprovals = findRows("Approvals", "status", "pending");
  var allBoards = getAllRows("Boards");
  var allTasks = getAllRows("Tasks");
  var allCols = getAllRows("Columns");
  var allUsers = getAllRows("Users");

  var userMap = {};
  allUsers.forEach(function(u) { userMap[u.id] = u; });
  var taskMap = {};
  allTasks.forEach(function(t) { taskMap[t.id] = t; });
  var colMap = {};
  allCols.forEach(function(c) { colMap[c.id] = c; });
  var boardMap = {};
  allBoards.forEach(function(b) { boardMap[b.id] = b; });

  // Filter to only approvals where user is owner/approver of the board
  var filtered = allApprovals.filter(function(a) {
    var task = taskMap[a.task_id];
    if (!task) return false;
    var role = getBoardRole(task.board_id, userId);
    return role === "owner" || role === "approver";
  });

  return ok(filtered.map(function(a) {
    var task = taskMap[a.task_id];
    var fromCol = colMap[a.from_column_id];
    var toCol = colMap[a.to_column_id];
    var requester = userMap[a.requested_by];
    var board = task ? boardMap[task.board_id] : null;
    return {
      id: a.id,
      taskId: a.task_id,
      taskTitle: task ? task.title : "Unknown",
      boardId: task ? task.board_id : "",
      boardName: board ? board.name : "Unknown",
      fromColumnId: a.from_column_id,
      fromColumnName: fromCol ? fromCol.name : "Unknown",
      toColumnId: a.to_column_id,
      toColumnName: toCol ? toCol.name : "Unknown",
      requestedBy: a.requested_by,
      requestedByName: requester ? requester.name : "Unknown",
      approverId: a.approver_id || null,
      status: a.status,
      note: a.note || "",
      createdAt: a.created_at
    };
  }));
}

function approveTask(params, userId) {
  var approval = findRow("Approvals", "id", params.approvalId);
  if (!approval) return err("Approval not found");
  if (approval.status !== "pending") return err("Approval already processed");

  var task = findRow("Tasks", "id", approval.task_id);
  if (!task) return err("Task not found");

  var role = getBoardRole(task.board_id, userId);
  if (role !== "owner" && role !== "approver") return err("Insufficient permissions");

  // Update approval
  updateRow("Approvals", "id", approval.id, { status: "approved", approver_id: userId });

  // Move the task
  updateRow("Tasks", "id", task.id, {
    column_id: approval.to_column_id,
    updated_at: now()
  });
  return ok(null);
}

function rejectTask(params, userId) {
  var approval = findRow("Approvals", "id", params.approvalId);
  if (!approval) return err("Approval not found");
  if (approval.status !== "pending") return err("Approval already processed");

  var task = findRow("Tasks", "id", approval.task_id);
  if (!task) return err("Task not found");

  var role = getBoardRole(task.board_id, userId);
  if (role !== "owner" && role !== "approver") return err("Insufficient permissions");

  updateRow("Approvals", "id", approval.id, {
    status: "rejected",
    approver_id: userId,
    note: params.note || ""
  });
  return ok(null);
}
