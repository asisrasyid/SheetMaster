import { ApiResponse, Board, BoardData, BoardMember, Approval, User } from "@/types";

// Replace this with your deployed Google Apps Script Web App URL
const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || "";

async function callAPI<T>(
  action: string,
  params: Record<string, unknown> = {},
  token?: string
): Promise<T> {
  const body: Record<string, unknown> = { action, ...params };
  if (token) body.token = token;

  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  const data: ApiResponse<T> = await res.json();
  if (!data.success) throw new Error(data.error || "API error");
  return data.data as T;
}

function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("sm_token") || "";
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function apiLogin(username: string, password: string) {
  return callAPI<{ token: string; user: User }>("login", { username, password });
}

export async function apiLogout() {
  return callAPI("logout", {}, getToken());
}

// ─── Boards ──────────────────────────────────────────────────────────────────

export async function apiGetBoards() {
  return callAPI<Board[]>("getBoards", {}, getToken());
}

export async function apiCreateBoard(name: string, description: string) {
  return callAPI<Board>("createBoard", { name, description }, getToken());
}

export async function apiUpdateBoard(boardId: string, name: string, description: string) {
  return callAPI<Board>("updateBoard", { boardId, name, description }, getToken());
}

export async function apiDeleteBoard(boardId: string) {
  return callAPI("deleteBoard", { boardId }, getToken());
}

export async function apiGetBoard(boardId: string) {
  return callAPI<BoardData>("getBoard", { boardId }, getToken());
}

// ─── Board Members ────────────────────────────────────────────────────────────

export async function apiGetBoardMembers(boardId: string) {
  return callAPI<BoardMember[]>("getBoardMembers", { boardId }, getToken());
}

export async function apiAddBoardMember(boardId: string, username: string, role: string) {
  return callAPI("addBoardMember", { boardId, username, role }, getToken());
}

export async function apiUpdateBoardMember(boardId: string, userId: string, role: string) {
  return callAPI("updateBoardMember", { boardId, userId, role }, getToken());
}

export async function apiRemoveBoardMember(boardId: string, userId: string) {
  return callAPI("removeBoardMember", { boardId, userId }, getToken());
}

// ─── Columns ─────────────────────────────────────────────────────────────────

export async function apiCreateColumn(boardId: string, name: string, color: string) {
  return callAPI("createColumn", { boardId, name, color }, getToken());
}

export async function apiUpdateColumn(
  columnId: string,
  name: string,
  color: string,
  requiresApproval: boolean
) {
  return callAPI("updateColumn", { columnId, name, color, requiresApproval }, getToken());
}

export async function apiDeleteColumn(columnId: string) {
  return callAPI("deleteColumn", { columnId }, getToken());
}

export async function apiReorderColumns(columnIds: string[]) {
  return callAPI("reorderColumns", { columnIds }, getToken());
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export async function apiCreateTask(
  boardId: string,
  columnId: string,
  title: string,
  priority: string = "medium"
) {
  return callAPI("createTask", { boardId, columnId, title, priority }, getToken());
}

export async function apiUpdateTask(taskId: string, updates: Record<string, unknown>) {
  return callAPI("updateTask", { taskId, ...updates }, getToken());
}

export async function apiDeleteTask(taskId: string) {
  return callAPI("deleteTask", { taskId }, getToken());
}

export async function apiMoveTask(taskId: string, toColumnId: string, position: number) {
  return callAPI("moveTask", { taskId, toColumnId, position }, getToken());
}

export async function apiReorderTasks(columnId: string, taskIds: string[]) {
  return callAPI("reorderTasks", { columnId, taskIds }, getToken());
}

// ─── SubTasks ─────────────────────────────────────────────────────────────────

export async function apiCreateSubTask(taskId: string, title: string) {
  return callAPI("createSubTask", { taskId, title }, getToken());
}

export async function apiUpdateSubTask(
  subTaskId: string,
  updates: { title?: string; isCompleted?: boolean }
) {
  return callAPI("updateSubTask", { subTaskId, ...updates }, getToken());
}

export async function apiDeleteSubTask(subTaskId: string) {
  return callAPI("deleteSubTask", { subTaskId }, getToken());
}

// ─── Labels ───────────────────────────────────────────────────────────────────

export async function apiCreateLabel(boardId: string, name: string, color: string) {
  return callAPI("createLabel", { boardId, name, color }, getToken());
}

export async function apiDeleteLabel(labelId: string) {
  return callAPI("deleteLabel", { labelId }, getToken());
}

export async function apiAddTaskLabel(taskId: string, labelId: string) {
  return callAPI("addTaskLabel", { taskId, labelId }, getToken());
}

export async function apiRemoveTaskLabel(taskId: string, labelId: string) {
  return callAPI("removeTaskLabel", { taskId, labelId }, getToken());
}

// ─── Assignees ────────────────────────────────────────────────────────────────

export async function apiAddAssignee(taskId: string, userId: string) {
  return callAPI("addAssignee", { taskId, userId }, getToken());
}

export async function apiRemoveAssignee(taskId: string, userId: string) {
  return callAPI("removeAssignee", { taskId, userId }, getToken());
}

// ─── Approvals ────────────────────────────────────────────────────────────────

export async function apiGetPendingApprovals() {
  return callAPI<Approval[]>("getPendingApprovals", {}, getToken());
}

export async function apiApproveTask(approvalId: string) {
  return callAPI("approveTask", { approvalId }, getToken());
}

export async function apiRejectTask(approvalId: string, note: string) {
  return callAPI("rejectTask", { approvalId, note }, getToken());
}
