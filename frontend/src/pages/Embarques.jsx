import { useState } from 'react';
import { api } from '../api.js';
import { useFetch } from '../hooks.js';
import { nivel } from '../roles.js';
import { ESTADO, Tag, Err, fecha } from '../components/ui.jsx';

const VACIO = { nodo_origen_id: '', nodo_destino_id: '', producto_id: '', cantidad_tubos: '', eta: '' };

export default function Embarques({ user }) {
  const [filtro, setFiltro] = useState('');
  const lista = useFetch(`/embarques${filtro ? `?estado=${filtro}` : ''}`, 15000);
  const nodos = useFetch('/nodos');
  const productos = useFetch('/productos');
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const puedeEditar = nivel(user.rol) >= 3;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function crear(e) {
    e.preventDefault(); setError('');
    try {
      await api('/embarques', { method: 'POST', body: { ...form, eta: form.eta || undefined } });
      setForm(VACIO); lista.reload();
    } catch (err) { setError(err.message); }
  }

  async function cambiarEstado(id, estado) {
    setError(''); setAviso('');
    try {
      const r = await api(`/embarques/${id}`, { method: 'PUT', body: { estado } });
      if (r.advertencia) setAviso(r.advertencia);
      lista.reload();
    }
    catch (err) { setError(err.message); }
  }

  return (
    <section>
      <div className="tools">
        <label>Estado
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(ESTADO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>
      <Err msg={error || lista.error} />
      {aviso && <p role="status" className="mute">⚠ {aviso}</p>}
      <div className="wrap">
        <table>
          <thead><tr><th>Folio</th><th>Origen</th><th>Destino</th><th>Producto</th><th>Tubos</th><th>Avance</th><th>ETA</th><th>Estado</th></tr></thead>
          <tbody>
            {(lista.data || []).map((e) => (
              <tr key={e.id}>
                <td>{e.folio}</td><td>{e.origen}</td><td>{e.destino}</td><td>{e.producto}</td>
                <td>{e.cantidad_tubos}</td>
                <td style={{ minWidth: 90 }}><div className="bar"><i style={{ width: `${e.avance_pct}%` }} /></div></td>
                <td>{fecha(e.eta)}</td>
                <td>
                  {puedeEditar ? (
                    <select value={e.estado} onChange={(ev) => cambiarEstado(e.id, ev.target.value)} aria-label={`Estado de ${e.folio}`}>
                      {Object.entries(ESTADO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  ) : <Tag estado={e.estado} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {puedeEditar && (
        <form className="form" onSubmit={crear}>
          <h2>Nuevo embarque</h2>
          <div className="grid">
            <label>Origen
              <select value={form.nodo_origen_id} onChange={set('nodo_origen_id')} required>
                <option value="">Selecciona…</option>
                {(nodos.data || []).map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
              </select>
            </label>
            <label>Destino
              <select value={form.nodo_destino_id} onChange={set('nodo_destino_id')} required>
                <option value="">Selecciona…</option>
                {(nodos.data || []).map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
              </select>
            </label>
            <label>Producto
              <select value={form.producto_id} onChange={set('producto_id')} required>
                <option value="">Selecciona…</option>
                {(productos.data || []).map((p) => <option key={p.id} value={p.id}>{p.descripcion}</option>)}
              </select>
            </label>
            <label>Cantidad de tubos
              <input type="number" min="1" value={form.cantidad_tubos} onChange={set('cantidad_tubos')} required />
            </label>
            <label>Fecha estimada
              <input type="datetime-local" value={form.eta} onChange={set('eta')} />
            </label>
          </div>
          <button className="btn">Crear embarque</button>
        </form>
      )}
    </section>
  );
}
