import { useState } from 'react';
import { api } from '../api.js';
import { useFetch } from '../hooks.js';
import { nivel } from '../roles.js';
import { Err, fecha } from '../components/ui.jsx';

function Tarjeta({ s, puedeRegistrar, onSaved, onError }) {
  const [valor, setValor] = useState('');
  const fuera = s.ultima_lectura != null &&
    ((s.umbral_max != null && s.ultima_lectura > s.umbral_max) || (s.umbral_min != null && s.ultima_lectura < s.umbral_min));

  async function registrar(e) {
    e.preventDefault();
    try {
      const r = await api(`/sensores/${s.id}/lecturas`, { method: 'POST', body: { valor: Number(valor) } });
      setValor(''); onError(r.incidencia_creada ? 'Lectura fuera de umbral: se abrió una incidencia de prioridad alta.' : '');
      onSaved();
    } catch (err) { onError(err.message); }
  }

  return (
    <div className={`card ${fuera ? 'alerta' : ''}`}>
      <small className="mute">{s.nombre}</small>
      <div><b>{s.ultima_lectura ?? '—'} {s.unidad}</b></div>
      <small className="mute">Rango: {s.umbral_min ?? '—'} a {s.umbral_max ?? '—'} · {fecha(s.ultima_fecha)}</small>
      {fuera && <div className="fuera">Fuera de umbral</div>}
      {puedeRegistrar && (
        <form className="inline" onSubmit={registrar}>
          <input type="number" step="any" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Nueva lectura" required aria-label={`Nueva lectura de ${s.nombre}`} />
          <button className="btn small">Registrar</button>
        </form>
      )}
    </div>
  );
}

export default function Sensores({ user }) {
  const sensores = useFetch('/sensores', 5000);
  const [aviso, setAviso] = useState('');
  return (
    <section>
      <Err msg={sensores.error} />
      {aviso && <p className="aviso" role="status">{aviso}</p>}
      <div className="grid2">
        {(sensores.data || []).map((s) => (
          <Tarjeta key={s.id} s={s} puedeRegistrar={nivel(user.rol) >= 2} onSaved={sensores.reload} onError={setAviso} />
        ))}
      </div>
    </section>
  );
}
