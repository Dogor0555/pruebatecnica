'use client';

import { useState, FormEvent } from 'react';
import { api, ApiError } from '@/lib/api';

type Props = {
  onCreated: () => void;
};

export function TaskForm({ onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('El título es obligatorio.');
      return;
    }

    setSubmitting(true);
    try {
      await api.create({
        title: trimmedTitle,
        description: description.trim(),
      });
      setTitle('');
      setDescription('');
      onCreated();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'No se pudo crear la tarea. Inténtalo de nuevo.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} aria-label="Crear tarea">
      <input
        type="text"
        placeholder="Título de la tarea (obligatorio)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        required
      />
      <textarea
        placeholder="Descripción (opcional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={1000}
      />
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
      <div className="form-row">
        <button
          type="submit"
          className="button button-primary"
          disabled={submitting || !title.trim()}
        >
          {submitting ? <span className="spinner" /> : null}
          {submitting ? 'Creando...' : 'Crear tarea'}
        </button>
      </div>
    </form>
  );
}