import { Router } from 'express';
import { pool } from '../db.js';
import { ah, httpError, entero, uuid, opcion, nuevoId, nuevoFolio, ESTADOS_EMBARQUE } from '../utils.js';
import { minNivel } from '../middleware/auth.js';

const router = Router();

const SELECT = `SELECT e.id, e.folio, e.nodo_origen_id, e.nodo_destino_id, o.nombre AS origen, d.nombre AS destino,
       e.producto_id, p.descripcion AS producto, e.cantidad_tubos, e.avance_pct, e.estado, e.eta
  FROM embarques e
  JOIN nodos o ON o.id = e.nodo_origen_id
  JOIN nodos d ON d.id = e.nodo_destino_id
  JOIN productos p ON p.id = e.producto_id`;

router.get('/', ah(async (req, res) => {
  const { estado } = req.query;
  let where = '', params = [];
  if (estado) { where = 'WHERE e.estado = ?'; params = [opcion(estado, ESTADOS_EMBARQUE, 'estado')]; }
  const [rows] = await pool.query(`${SELECT} ${where} ORDER BY e.creado_en DESC, e.folio`, params);
  res.json(rows);
}));

router.get('/:id', ah(async (req, res) => {
  const [rows] = await pool.query(`${SELECT} WHERE e.id = ?`, [uuid(req.params.id, 'id')]);
  if (!rows[0]) throw httpError(404, 'Embarque no encontrado');
  const [historial] = await pool.query(
    'SELECT estado_previo, estado_nuevo, cambiado_en FROM embarques_historial WHERE embarque_id = ? ORDER BY cambiado_en DESC', [rows[0].id]);
  res.json({ ...rows[0], historial });
}));

router.post('/', minNivel(3), ah(async (req, res) => {
  const b = req.body || {};
  const origen = uuid(b.nodo_origen_id, 'nodo_origen_id'), destino = uuid(b.nodo_destino_id, 'nodo_destino_id');
  if (origen === destino) throw httpError(400, 'El origen y el destino deben ser distintos');
  const producto = uuid(b.producto_id, 'producto_id'), cantidad = entero(b.cantidad_tubos, 'cantidad_tubos');
  const eta = b.eta ? new Date(b.eta) : null;
  if (eta && isNaN(eta)) throw httpError(400, 'La fecha estimada (eta) no es válida');
  // Validar que existan (evita un error 500 por la clave foránea)
  const [[nn]] = await pool.query('SELECT COUNT(*) AS n FROM nodos WHERE id IN (?, ?) AND activo = 1', [origen, destino]);
  if (nn.n !== 2) throw httpError(400, 'El nodo de origen o el de destino no existe o está inactivo');
  const [[pp]] = await pool.query('SELECT COUNT(*) AS n FROM productos WHERE id = ?', [producto]);
  if (pp.n !== 1) throw httpError(400, 'El producto no existe');
  const id = nuevoId();
  for (let intento = 0; intento < 5; intento++) {
    const folio = nuevoFolio();
    try {
      await pool.query(
        `INSERT INTO embarques (id, folio, nodo_origen_id, nodo_destino_id, producto_id, cantidad_tubos, estado, salida_en, eta, creado_por)
         VALUES (?,?,?,?,?,?, 'en_ruta', NOW(), ?, ?)`, [id, folio, origen, destino, producto, cantidad, eta, req.user.id]);
      return res.status(201).json({ id, folio });
    } catch (e) {
      if (e.code !== 'ER_DUP_ENTRY') throw e; // folio repetido (casi imposible): se genera otro
    }
  }
  throw httpError(500, 'No se pudo generar un folio único');
}));

// Cambia estado y/o avance. Al marcar "entregado" mueve el inventario del origen al destino
// (misma transacción) y avisa si el origen tenía menos tubos de los que lleva el embarque.
router.put('/:id', minNivel(3), ah(async (req, res) => {
  const id = uuid(req.params.id, 'id');
  const { estado, avance_pct } = req.body || {};
  if (estado !== undefined) opcion(estado, ESTADOS_EMBARQUE, 'estado');
  const cx = await pool.getConnection();
  try {
    await cx.beginTransaction();
    const [[e]] = await cx.query('SELECT * FROM embarques WHERE id = ? FOR UPDATE', [id]);
    if (!e) throw httpError(404, 'Embarque no encontrado');
    const nuevo = estado ?? e.estado;
    let avance = avance_pct !== undefined ? entero(avance_pct, 'avance_pct', 0, 100) : e.avance_pct;
    if (nuevo === 'entregado') avance = 100;
    await cx.query('UPDATE embarques SET estado = ?, avance_pct = ? WHERE id = ?', [nuevo, avance, id]);
    let advertencia = null;
    if (nuevo === 'entregado' && e.estado !== 'entregado') {
      const [[inv]] = await cx.query(
        'SELECT cantidad_tubos FROM inventarios WHERE nodo_id = ? AND producto_id = ? FOR UPDATE', [e.nodo_origen_id, e.producto_id]);
      const disponible = inv ? inv.cantidad_tubos : 0;
      if (disponible < e.cantidad_tubos) {
        advertencia = `El inventario del origen (${disponible} tubos) era menor que el embarque (${e.cantidad_tubos}); quedó en 0.`;
      }
      await cx.query(
        `UPDATE inventarios SET cantidad_tubos = GREATEST(CAST(cantidad_tubos AS SIGNED) - ?, 0)
          WHERE nodo_id = ? AND producto_id = ?`, [e.cantidad_tubos, e.nodo_origen_id, e.producto_id]);
      await cx.query(
        `INSERT INTO inventarios (id, nodo_id, producto_id, cantidad_tubos) VALUES (?,?,?,?)
         ON DUPLICATE KEY UPDATE cantidad_tubos = cantidad_tubos + VALUES(cantidad_tubos)`,
        [nuevoId(), e.nodo_destino_id, e.producto_id, e.cantidad_tubos]);
    }
    await cx.commit();
    res.json({ ok: true, ...(advertencia ? { advertencia } : {}) });
  } catch (err) {
    await cx.rollback();
    throw err;
  } finally {
    cx.release();
  }
}));

export default router;
