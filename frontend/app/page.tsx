'use client';

import { useState } from 'react';
import { TaskForm } from '@/components/TaskForm';
import { TaskList } from '@/components/TaskList';

export default function HomePage() {
  const [refreshKey, setRefreshKey] = useState(0);

  function bump() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <main className="container">
      <header className="header">
        <h1>Tasks</h1>
        <p>Cliente web que consume la API REST del backend.</p>
        <div className="backend-status">
          API:&nbsp;
          <code>{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}</code>
        </div>
      </header>

      <section className="card" aria-label="Crear nueva tarea">
        <h2 className="section-title">Nueva tarea</h2>
        <TaskForm onCreated={bump} />
      </section>

      <section className="card" aria-label="Listado">
        <h2 className="section-title">Mis tareas</h2>
        <TaskList refreshKey={refreshKey} onMutated={bump} />
      </section>
    </main>
  );
}