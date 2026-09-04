export type Task = {
  id: number;
  title: string;
  description: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TaskInput = {
  title: string;
  description?: string;
  isCompleted?: boolean;
};

export type TasksListResponse = {
  data: Task[];
  count: number;
};

export type TaskResponse = {
  data: Task;
};

export type ErrorResponse = {
  error: string;
  message: string;
  details?: Array<{ field: string; message: string }>;
};