import { useState } from 'react';
import { api } from '../api.js';
import { useFetch } from '../hooks.js';
import { Err } from '../components/ui.jsx';

const ROLES = ['consulta', 'operador', 'coordinador', 'product_owner', 'administrador'];
const AREAS = ['Demanda', 'Almacenes', 'Transporte', 'Comercio Exterior', 'Desarrollo'];
const VACIO = { nombre: '', correo: '', password: '', rol: 'consulta', area: '' };

export default function Usuarios({ user }) {
  const lista = useFetch('/usuarios');
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function crear(e) {
    e.preventDefault(); setError('');
    try { await api('/usuarios', { method: 'POST', body: { ...form, area: form.area || undefined } }); setForm(VACIO); lista.reload(); }
    catch (err) { setError(err.message); }
  }

  async function alternar(u) {
    setError('');
    try { await api(`/usuarios/${u.id}/activo`, { method: 'PUT', body: { activo: !u.activo } }); lista.reload(); }
    catch (err) { setError(err.message); }
  }

  return (
    <section>
      <Err msg={error || lista.error} />
      <div className="wrap">
        <table>
          <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Área</th><th>Estado</th><th /></tr></thead>
          <tbody>
            {(lista.data || []).map((u) => (
              <tr key={u.id}>
                <td>{u.nombre}</td><td>{u.correo}</td><td>{u.rol}</td><td>{u.area || '—'}</td>
                <td>{u.activo ? 'Activo' : 'Inactivo'}</td>
                <td>{u.id !== user.id && <button className="btn small" onClick={() => alternar(u)}>{u.activo ? 'Desactivar' : 'Activar'}</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form className="form" onSubmit={crear}>
        <h2>Nuevo usuario</h2>
        <div className="grid">
          <label>Nombre<input value={form.nombre} onChange={set('nombre')} required /></label>
          <label>Correo<input type="email" value={form.correo} onChange={set('correo')} required /></label>
          <label>Contraseña (mín. 8)<input type="password" minLength={8} value={form.password} onChange={set('password')} required /></label>
          <label>Rol<select value={form.rol} onChange={set('rol')}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></label>
          <label>Área
            <select value={form.area} onChange={set('area')}>
              <option value="">Sin área</option>{AREAS.map((a) => <option key={a}>{a}</option>)}
            </select>
          </label>
        </div>
        <button className="btn">Crear usuario</button>
      </form>
    </section>
  );
}
