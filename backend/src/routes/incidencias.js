import { Router } from 'express';
import { pool } from '../db.js';
import { ah, httpError, uuid, texto, opcion, nuevoId, PRIORIDADES, ESTADOS_INCIDENCIA } from '../utils.js';
import { minNivel } from '../middleware/auth.js';

const router = Router();

router.get('/', ah(async (req, res) => {
  const { estado } = req.query;
  let where = '', params = [];
  if (estado) { where = 'WHERE i.estado = ?'; params = [opcion(estado, ESTADOS_INCIDENCIA, 'estado')]; }
  const [rows] = await pool.query(
    `SELECT i.id, i.titulo, i.descripcion, i.prioridad, i.estado, i.creada_en, i.resuelta_en,
            n.nombre AS nodo, e.folio AS embarque, ur.nombre AS reportada_por, ua.nombre AS asignada_a, i.asignada_a AS asignada_a_id
       FROM incidencias i
       LEFT JOIN nodos n ON n.id = i.nodo_id
       LEFT JOIN embarques e ON e.id = i.embarque_id
       LEFT JOIN usuarios ur ON ur.id = i.reportada_por
       LEFT JOIN usuarios ua ON ua.id = i.asignada_a
       ${where}
       ORDER BY (i.estado = 'resuelta'), FIELD(i.prioridad, 'alta', 'media', 'baja'), i.creada_en DESC`, params);
  res.json(rows);
}));

router.post('/', minNivel(2), ah(async (req, res) => {
  const b = req.body || {};
  const nodo = b.nodo_id ? uuid(b.nodo_id, 'nodo_id') : null;
  const embarque = b.embarque_id ? uuid(b.embarque_id, 'embarque_id') : null;
  if (nodo) {
    const [[n]] = await pool.query('SELECT COUNT(*) AS n FROM nodos WHERE id = ?', [nodo]);
    if (!n.n) throw httpError(400, 'El nodo indicado no existe');
  }
  if (embarque) {
    const [[n]] = await pool.query('SELECT COUNT(*) AS n FROM embarques WHERE id = ?', [embarque]);
    if (!n.n) throw httpError(400, 'El embarque indicado no existe');
  }
  const id = nuevoId();
  await pool.query(
    `INSERT INTO incidencias (id, titulo, descripcion, prioridad, nodo_id, embarque_id, reportada_por) VALUES (?,?,?,?,?,?,?)`,
    [id, texto(b.titulo, 'titulo', 150), texto(b.descripcion, 'descripcion', 2000, false),
     opcion(b.prioridad || 'media', PRIORIDADES, 'prioridad'), nodo, embarque, req.user.id]);
  res.status(201).json({ id });
}));

// Asignar, cambiar prioridad o resolver (coordinador o superior)
router.put('/:id', minNivel(3), ah(async (req, res) => {
  const id = uuid(req.params.id, 'id');
  const b = req.body || {};
  const sets = [], params = [];
  if (b.estado !== undefined) {
    opcion(b.estado, ESTADOS_INCIDENCIA, 'estado');
    sets.push('estado = ?'); params.push(b.estado);
    sets.push(b.estado === 'resuelta' ? 'resuelta_en = NOW()' : 'resuelta_en = NULL');
  }
  if (b.prioridad !== undefined) { sets.push('prioridad = ?'); params.push(opcion(b.prioridad, PRIORIDADES, 'prioridad')); }
  if (b.asignada_a !== undefined) {
    if (b.asignada_a !== null) {
      const a = uuid(b.asignada_a, 'asignada_a');
      const [[u]] = await pool.query('SELECT COUNT(*) AS n FROM usuarios WHERE id = ? AND activo = 1', [a]);
      if (!u.n) throw httpError(400, 'El usuario asignado no existe o está inactivo');
      sets.push('asignada_a = ?'); params.push(a);
    } else { sets.push('asignada_a = NULL'); }
  }
  if (!sets.length) throw httpError(400, 'No hay campos para actualizar');
  const [r] = await pool.query(`UPDATE incidencias SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
  if (!r.affectedRows) throw httpError(404, 'Incidencia no encontrada');
  res.json({ ok: true });
}));

export default router;
