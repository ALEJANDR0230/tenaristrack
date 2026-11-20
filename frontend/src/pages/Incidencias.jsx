import { useState } from 'react';
import { api } from '../api.js';
import { useFetch } from '../hooks.js';
import { nivel } from '../roles.js';
import { Err, fecha } from '../components/ui.jsx';

const VACIO = { titulo: '', descripcion: '', prioridad: 'media', nodo_id: '' };

export default function Incidencias({ user }) {
  const [filtro, setFiltro] = useState('');
  const lista = useFetch(`/incidencias${filtro ? `?estado=${filtro}` : ''}`, 10000);
  const nodos = useFetch('/nodos');
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function crear(e) {
    e.preventDefault(); setError('');
    try {
      await api('/incidencias', { method: 'POST', body: { ...form, nodo_id: form.nodo_id || undefined } });
      setForm(VACIO); lista.reload();
    } catch (err) { setError(err.message); }
  }

  async function actualizar(id, cambios) {
    setError('');
    try { await api(`/incidencias/${id}`, { method: 'PUT', body: cambios }); lista.reload(); }
    catch (err) { setError(err.message); }
  }

  return (
    <section>
      <div className="tools">
        <label>Estado
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todas</option><option value="abierta">Abiertas</option>
            <option value="en_atencion">En atención</option><option value="resuelta">Resueltas</option>
          </select>
        </label>
      </div>
      <Err msg={error || lista.error} />
      {(lista.data || []).map((i) => (
        <div key={i.id} className={`alert ${i.prioridad} ${i.estado === 'resuelta' ? 'hecha' : ''}`}>
          <b>{i.titulo}</b>
          {i.descripcion && <div>{i.descripcion}</div>}
          <small className="mute">
            Prioridad {i.prioridad} · {i.estado.replace('_', ' ')} · {i.nodo || i.embarque || 'General'} ·
            Reportó {i.reportada_por || '—'} · Asignada a {i.asignada_a || '—'} · {fecha(i.creada_en)}
          </small>
          {nivel(user.rol) >= 3 && i.estado !== 'resuelta' && (
            <div className="acciones">
              {i.estado === 'abierta' && (
                <button className="btn small" onClick={() => actualizar(i.id, { estado: 'en_atencion', asignada_a: user.id })}>Atender yo</button>
              )}
              <button className="btn small ok" onClick={() => actualizar(i.id, { estado: 'resuelta' })}>Resolver</button>
            </div>
          )}
        </div>
      ))}
      {lista.data?.length === 0 && <p className="mute">No hay incidencias.</p>}

      {nivel(user.rol) >= 2 && (
        <form className="form" onSubmit={crear}>
          <h2>Registrar incidencia</h2>
          <div className="grid">
            <label>Título<input value={form.titulo} onChange={set('titulo')} required maxLength={150} /></label>
            <label>Prioridad
              <select value={form.prioridad} onChange={set('prioridad')}>
                <option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option>
              </select>
            </label>
            <label>Nodo (opcional)
              <select value={form.nodo_id} onChange={set('nodo_id')}>
                <option value="">General</option>
                {(nodos.data || []).map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
              </select>
            </label>
          </div>
          <label>Descripción<textarea rows="2" value={form.descripcion} onChange={set('descripcion')} /></label>
          <button className="btn">Registrar</button>
        </form>
      )}
    </section>
  );
}
