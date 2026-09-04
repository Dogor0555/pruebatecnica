import type {
  Task,
  TaskInput,
  TasksListResponse,
  TaskResponse,
} from '@/types/task';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
  'http://localhost:3000';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (json && typeof json === 'object' && 'message' in json
        ? String((json as { message: unknown }).message)
        : null) || `Error ${res.status}`;
    throw new ApiError(message, res.status, json);
  }
  return json as T;
}

export const api = {
  async list(): Promise<TasksListResponse> {
    const res = await fetch(`${API_URL}/api/tasks`, { cache: 'no-store' });
    return handle<TasksListResponse>(res);
  },

  async create(input: TaskInput): Promise<TaskResponse> {
    const res = await fetch(`${API_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return handle<TaskResponse>(res);
  },

  async update(id: number, input: Partial<TaskInput>): Promise<TaskResponse> {
    const res = await fetch(`${API_URL}/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return handle<TaskResponse>(res);
  },

  async remove(id: number): Promise<void> {
    const res = await fetch(`${API_URL}/api/tasks/${id}`, {
      method: 'DELETE',
    });
    return handle<void>(res);
  },
};

export { ApiError };