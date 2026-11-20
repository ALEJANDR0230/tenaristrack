import { useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';
import ThemeToggle from './components/ThemeToggle.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Embarques from './pages/Embarques.jsx';
import Sensores from './pages/Sensores.jsx';
import Incidencias from './pages/Incidencias.jsx';
import Usuarios from './pages/Usuarios.jsx';

const TABS = [
  { id: 'dash', label: 'Gemelo digital', Page: Dashboard },
  { id: 'emb', label: 'Embarques', Page: Embarques },
  { id: 'sen', label: 'Sensores', Page: Sensores },
  { id: 'inc', label: 'Incidencias', Page: Incidencias },
  { id: 'usr', label: 'Usuarios', Page: Usuarios, solo: ['administrador'] }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [listo, setListo] = useState(!getToken());
  const [tab, setTab] = useState('dash');
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    api('/config').then((c) => setDemo(!!c.demo)).catch(() => {});
  }, []);

  useEffect(() => {
    if (getToken()) api('/auth/me').then(setUser).catch(() => setToken(null)).finally(() => setListo(true));
    const salir = () => setUser(null);
    window.addEventListener('tt-logout', salir);
    return () => window.removeEventListener('tt-logout', salir);
  }, []);

  if (!listo) return <p className="mute" style={{ padding: 24 }}>Cargando…</p>;
  if (!user) return <Login onLogin={setUser} />;

  const tabs = TABS.filter((t) => !t.solo || t.solo.includes(user.rol));
  const Actual = (tabs.find((t) => t.id === tab) || tabs[0]).Page;

  return (
    <>
      {demo && <div role="note" className="demo-banner">Datos simulados con fines académicos: no provienen de TenarisTamsa.</div>}
      <header>
        <div>
          <h1>TenarisTrack</h1>
          <small>Torre de control logística · Tamsa 1, 2 y 3</small>
        </div>
        <div className="quien">
          <span>{user.nombre} · {user.rol}</span>
          <ThemeToggle />
          <button className="btn small claro" onClick={() => { setToken(null); setUser(null); }}>Salir</button>
        </div>
      </header>
      <nav className="tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={t.id === tab} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </nav>
      <main><div className="view"><Actual user={user} /></div></main>
    </>
  );
}
