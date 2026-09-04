import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tasks — Cliente',
  description: 'Cliente web para la API de gestión de tareas',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}