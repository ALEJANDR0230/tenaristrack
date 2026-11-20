import { useEffect, useState } from 'react';

// Interruptor de modo claro / oscuro. Recuerda la elección en el navegador.
export default function ThemeToggle() {
  const [tema, setTema] = useState(document.documentElement.dataset.theme || 'light');

  useEffect(() => {
    document.documentElement.dataset.theme = tema;
    try { localStorage.setItem('tt_theme', tema); } catch { /* sin almacenamiento */ }
  }, [tema]);

  const oscuro = tema === 'dark';
  return (
    <button type="button" className="theme-toggle" aria-pressed={oscuro}
      onClick={() => setTema(oscuro ? 'light' : 'dark')}
      title={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
      <span aria-hidden="true">{oscuro ? '☀' : '☾'}</span>
      {oscuro ? 'Modo claro' : 'Modo oscuro'}
    </button>
  );
}
