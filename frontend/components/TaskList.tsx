'use client';

import useSWR from 'swr';
import type { Task } from '@/types/task';
import { api, ApiError } from '@/lib/api';
import { TaskItem } from './TaskItem';

const fetcher = async () => api.list();

type Props = {
  refreshKey: number;
  onMutated: () => void;
};

export function TaskList({ refreshKey, onMutated }: Props) {
  const { data, error, isLoading, mutate } = useSWR(
    ['tasks', refreshKey],
    fetcher,
    { refreshInterval: 0, revalidateOnFocus: false },
  );

  if (isLoading) {
    return <div className="empty">Cargando tareas...</div>;
  }

  if (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : 'No se pudo conectar con la API.';
    return (
      <div className="error-banner" role="alert">
        {message}
      </div>
    );
  }

  const tasks: Task[] = data?.data ?? [];

  if (tasks.length === 0) {
    return (
      <div className="empty">
        Aún no hay tareas. Crea la primera con el formulario superior.
      </div>
    );
  }

  async function handleChanged() {
    onMutated();
    await mutate();
  }

  return (
    <ul className="task-list" aria-label="Listado de tareas">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} onChanged={handleChanged} />
      ))}
    </ul>
  );
}