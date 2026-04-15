export type UserPublic = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export type Project = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  owner: UserPublic;
  createdAt: string;
  _count?: { tasks: number };
};

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  assigneeId: string | null;
  assignee: UserPublic | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectDetail = Project & { tasks: Task[] };

export type Stats = {
  byStatus: { status: TaskStatus; count: number }[];
  byAssignee: { assignee: UserPublic | null; count: number }[];
  total: number;
};

export type PaginatedResponse<T> = {
  pagination: { page: number; limit: number; total: number; totalPages: number };
} & T;
