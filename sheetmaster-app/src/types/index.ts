export type Role = "owner" | "approver" | "contributor" | "viewer";
export type Priority = "low" | "medium" | "high" | "urgent";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface User {
  id: string;
  username: string;
  name: string;
  avatarColor: string;
  roleGlobal: Role;
  isActive: boolean;
  createdAt: string;
}

export interface Session {
  token: string;
  user: User;
}

export interface Board {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
  isArchived: boolean;
  myRole: Role;
}

export interface BoardMember {
  userId: string;
  name: string;
  username: string;
  avatarColor: string;
  role: Role;
}

export interface Column {
  id: string;
  boardId: string;
  name: string;
  position: number;
  color: string;
  requiresApproval: boolean;
}

export interface Label {
  id: string;
  boardId: string;
  name: string;
  color: string;
}

export interface SubTask {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  position: number;
}

export interface Task {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description: string;
  priority: Priority;
  deadline: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  position: number;
  assignees: Pick<User, "id" | "name" | "avatarColor">[];
  labels: Label[];
  subTasks: SubTask[];
  pendingApproval?: Approval;
}

export interface Approval {
  id: string;
  taskId: string;
  taskTitle: string;
  boardId: string;
  boardName: string;
  fromColumnId: string;
  fromColumnName: string;
  toColumnId: string;
  toColumnName: string;
  requestedBy: string;
  requestedByName: string;
  approverId: string | null;
  status: ApprovalStatus;
  note: string;
  createdAt: string;
}

export interface BoardData {
  board: Board;
  columns: Column[];
  tasks: Task[];
  members: BoardMember[];
  labels: Label[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
