'use client';

import { useState } from 'react';
import type { Task } from '@/types/task';
import { api, ApiError } from '@/lib/api';

type Props = {
  task: Task;
  onChanged: () => void;
};

export function TaskItem({ task, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setError(null);
    setBusy(true);
    try {
      await api.update(task.id, { isCompleted: !task.isCompleted });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`¿Eliminar la tarea "${task.title}"?`)) return;
    setError(null);
    setBusy(true);
    try {
      await api.remove(task.id);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar.');
      setBusy(false);
    }
  }

  return (
    <li className={`task-item ${task.isCompleted ? 'completed' : ''}`}>
      <input
        type="checkbox"
        className="task-checkbox"
        checked={task.isCompleted}
        onChange={toggle}
        disabled={busy}
        aria-label={`Marcar ${task.title} como ${
          task.isCompleted ? 'pendiente' : 'completada'
        }`}
      />
      <div className="task-body">
        <p className="task-title">{task.title}</p>
        {task.description ? (
          <p className="task-description">{task.description}</p>
        ) : null}
        <div className="task-meta">
          <span className={`badge ${task.isCompleted ? '' : 'badge-warn'}`}>
            {task.isCompleted ? 'Completada' : 'Pendiente'}
          </span>{' '}
          · #{task.id} · {new Date(task.createdAt).toLocaleString()}
        </div>
        {error && (
          <div
            className="error-banner"
            style={{ marginTop: 8 }}
            role="alert"
          >
            {error}
          </div>
        )}
      </div>
      <div className="task-actions">
        <button
          type="button"
          className="button button-danger"
          onClick={remove}
          disabled={busy}
          aria-label={`Eliminar ${task.title}`}
        >
          Eliminar
        </button>
      </div>
    </li>
  );
}