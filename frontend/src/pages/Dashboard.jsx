import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useFetch } from '../hooks.js';
import Twin from '../components/Twin.jsx';
import { Tag, Err } from '../components/ui.jsx';

export default function Dashboard() {
  const kpis = useFetch('/dashboard/kpis', 10000);
  const nodos = useFetch('/nodos', 10000);
  const rutas = useFetch('/rutas');
  const embarques = useFetch('/embarques', 10000);
  const [sel, setSel] = useState(null);
  const [det, setDet] = useState(null);

  useEffect(() => { if (!sel && nodos.data?.length) setSel(nodos.data[0].id); }, [nodos.data, sel]);
  useEffect(() => {
    if (sel) api(`/nodos/${sel}`).then(setDet).catch(() => setDet(null));
  }, [sel, nodos.data]);

  const k = kpis.data;
  const error = kpis.error || nodos.error || rutas.error || embarques.error;

  return (
    <section>
      <Err msg={error} />
      <div className="kpis">
        <div className="kpi"><b>{k?.embarques_activos ?? '—'}</b><span>Embarques activos</span></div>
        <div className="kpi"><b>{k?.nivel_servicio_pct != null ? `${k.nivel_servicio_pct}%` : '—'}</b><span>Nivel de servicio</span></div>
        <div className="kpi"><b>{k?.retrasados ?? '—'}</b><span>Retrasados</span></div>
        <div className="kpi"><b>{k ? k.inventario_total.toLocaleString() : '—'}</b><span>Tubos en inventario</span></div>
        <div className="kpi"><b>{k?.incidencias_abiertas ?? '—'}</b><span>Incidencias abiertas</span></div>
      </div>
      <div className="twin">
        <Twin nodos={nodos.data || []} rutas={rutas.data || []} embarques={embarques.data || []} sel={sel} onSelect={setSel} />
        <aside className="side">
          {det ? (
            <>
              <h2>{det.nombre}</h2>
              <small className="mute">{det.tipo}</small>
              <dl>
                <dt>Inventario</dt><dd>{det.inventario_tubos.toLocaleString()} tubos</dd>
                <dt>Ocupación</dt><dd>{det.ocupacion_pct}%</dd>
              </dl>
              <div className="bar"><i style={{ width: `${Math.min(det.ocupacion_pct, 100)}%` }} /></div>
              <p><b>Productos</b></p>
              {det.inventarios.length ? det.inventarios.map((i) => (
                <div key={i.producto_id}>{i.producto}: {i.cantidad_tubos.toLocaleString()}</div>
              )) : <small className="mute">Sin inventario.</small>}
              <p><b>Embarques vinculados</b></p>
              {det.embarques.length ? det.embarques.map((e) => (
                <div key={e.id}>{e.folio} <Tag estado={e.estado} /></div>
              )) : <small className="mute">Sin embarques activos.</small>}
            </>
          ) : <small className="mute">Selecciona un nodo del mapa.</small>}
        </aside>
      </div>
    </section>
  );
}
