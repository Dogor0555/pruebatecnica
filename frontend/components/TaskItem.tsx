'use client';

import { useEffect, useState } from 'react';
import type { Task } from '@/types/task';
import { api, ApiError } from '@/lib/api';

type Props = {
  task: Task;
  onChanged: () => void;
};

export function TaskItem({ task, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description);

  // Si cambia la tarea desde fuera (refetch) y no estamos editando,
  // sincronizamos los inputs por si el usuario abre el modo edición.
  useEffect(() => {
    if (!isEditing) {
      setEditTitle(task.title);
      setEditDescription(task.description);
    }
  }, [task, isEditing]);

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

  function startEdit() {
    setEditTitle(task.title);
    setEditDescription(task.description);
    setError(null);
    setIsEditing(true);
  }

  function cancelEdit() {
    setEditTitle(task.title);
    setEditDescription(task.description);
    setError(null);
    setIsEditing(false);
  }

  async function saveEdit() {
    setError(null);
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setError('El título no puede estar vacío.');
      return;
    }

    const payload: { title: string; description: string } = {
      title: trimmed,
      description: editDescription,
    };

    setBusy(true);
    try {
      await api.update(task.id, payload);
      setIsEditing(false);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar.');
    } finally {
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
        disabled={busy || isEditing}
        aria-label={`Marcar ${task.title} como ${
          task.isCompleted ? 'pendiente' : 'completada'
        }`}
      />

      <div className="task-body">
        {isEditing ? (
          <form
            className="edit-form"
            onSubmit={(e) => {
              e.preventDefault();
              saveEdit();
            }}
          >
            <input
              type="text"
              className="edit-title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              maxLength={200}
              autoFocus
              required
              aria-label="Título"
            />
            <textarea
              className="edit-description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              maxLength={1000}
              placeholder="Descripción (opcional)"
              aria-label="Descripción"
            />
            <div className="edit-actions">
              <button
                type="button"
                className="button button-ghost"
                onClick={cancelEdit}
                disabled={busy}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="button button-primary"
                disabled={busy || !editTitle.trim()}
              >
                {busy ? <span className="spinner" /> : null}
                {busy ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        ) : (
          <>
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
          </>
        )}

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
        {!isEditing && (
          <button
            type="button"
            className="button button-ghost"
            onClick={startEdit}
            disabled={busy}
            aria-label={`Editar ${task.title}`}
          >
            Editar
          </button>
        )}
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