// Gemelo digital: mapa esquemático con nodos, rutas y unidades en movimiento

// Camino más corto (por km) entre dos nodos usando SOLO las rutas registradas.
// Primero respeta el sentido de cada ruta; si no hay camino, la recorre en ambos sentidos.
export function caminoPorRutas(origen, destino, rutas) {
  const buscar = (bidireccional) => {
    const ady = {};
    for (const r of rutas) {
      const km = Number(r.distancia_km) || 1;
      (ady[r.nodo_origen_id] ||= []).push([r.nodo_destino_id, km]);
      if (bidireccional) (ady[r.nodo_destino_id] ||= []).push([r.nodo_origen_id, km]);
    }
    const dist = { [origen]: 0 }, prev = {}, pend = new Set([origen]);
    while (pend.size) {
      let u = null;
      for (const x of pend) if (u === null || dist[x] < dist[u]) u = x;
      pend.delete(u);
      if (u === destino) break;
      for (const [v, km] of ady[u] || []) {
        if (dist[v] === undefined || dist[u] + km < dist[v]) { dist[v] = dist[u] + km; prev[v] = u; pend.add(v); }
      }
    }
    if (dist[destino] === undefined) return null;
    const camino = [destino];
    while (camino[0] !== origen) camino.unshift(prev[camino[0]]);
    return camino;
  };
  return origen === destino ? [origen] : buscar(false) || buscar(true);
}
export default function Twin({ nodos, rutas, embarques, sel, onSelect }) {
  const byId = Object.fromEntries(nodos.map((n) => [n.id, n]));
  const color = (o) => (o > 75 ? 'var(--bad)' : o > 60 ? 'var(--warn)' : 'var(--ok)');
  // Cada unidad sigue las rutas registradas (puede pasar por varios nodos); sin camino no se dibuja
  const viajes = embarques
    .filter((e) => ['en_ruta', 'retrasado'].includes(e.estado) && byId[e.nodo_origen_id] && byId[e.nodo_destino_id])
    .map((e) => ({ e, camino: caminoPorRutas(e.nodo_origen_id, e.nodo_destino_id, rutas) }))
    .filter((v) => v.camino && v.camino.length > 1);
  return (
    <svg viewBox="0 0 640 380" role="img" aria-label="Mapa esquemático de complejos, patios y rutas">
      {rutas.map((r) => {
        const a = byId[r.nodo_origen_id], b = byId[r.nodo_destino_id];
        return a && b ? <line key={r.id} className="route" x1={a.pos_x} y1={a.pos_y} x2={b.pos_x} y2={b.pos_y} /> : null;
      })}
      {viajes.map(({ e, camino }, i) => {
        const puntos = camino.map((id) => byId[id]);
        const trazo = puntos.map((p, k) => `${k ? 'L' : 'M'}${p.pos_x} ${p.pos_y}`).join(' ');
        const largo = puntos.slice(1).reduce((s, p, k) => s + Math.hypot(p.pos_x - puntos[k].pos_x, p.pos_y - puntos[k].pos_y), 0);
        const atrasado = e.estado === 'retrasado';
        return (
          <circle key={e.id} r="5" fill={atrasado ? 'var(--bad)' : 'var(--steel)'}>
            <animateMotion dur={`${(atrasado ? 16 : 6 + (i % 4) * 1.5) + largo / 80}s`} repeatCount="indefinite" path={trazo} />
            <title>{e.folio}</title>
          </circle>
        );
      })}
      {nodos.map((n) => (
        <g key={n.id} className={`node ${n.id === sel ? 'sel' : ''}`} tabIndex={0} role="button" aria-label={n.nombre}
          onClick={() => onSelect(n.id)} onKeyDown={(ev) => ev.key === 'Enter' && onSelect(n.id)}>
          <rect x={n.pos_x - 64} y={n.pos_y - 22} width="128" height="44" rx="6" />
          <text x={n.pos_x} y={n.pos_y + 5}>{n.nombre}</text>
          <circle cx={n.pos_x + 64} cy={n.pos_y - 22} r="7" fill={color(n.ocupacion_pct)} />
        </g>
      ))}
    </svg>
  );
}
