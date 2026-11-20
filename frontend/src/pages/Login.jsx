import { useState } from 'react';
import { api, setToken } from '../api.js';
import { Err } from '../components/ui.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';

export default function Login({ onLogin }) {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setCargando(true); setError('');
    try {
      const { token, user } = await api('/auth/login', { method: 'POST', body: { correo, password } });
      setToken(token);
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="login">
      <div className="login-tema"><ThemeToggle /></div>
      <form onSubmit={enviar} className="login-card">
        <h1>TenarisTrack</h1>
        <p className="mute">Torre de control logística · Tamsa 1, 2 y 3</p>
        <label>Correo
          <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required autoFocus />
        </label>
        <label>Contraseña
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <Err msg={error} />
        <button className="btn" disabled={cargando}>{cargando ? 'Entrando…' : 'Iniciar sesión'}</button>
      </form>
    </div>
  );
}
