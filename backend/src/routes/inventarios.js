import { Router } from 'express';
import { pool } from '../db.js';
import { ah, httpError, entero, uuid, nuevoId } from '../utils.js';
import { minNivel } from '../middleware/auth.js';

const router = Router();

router.get('/', ah(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT i.id, i.nodo_id, n.nombre AS nodo, i.producto_id, p.descripcion AS producto, i.cantidad_tubos, i.actualizado_en
       FROM inventarios i JOIN nodos n ON n.id = i.nodo_id JOIN productos p ON p.id = i.producto_id ORDER BY n.codigo, p.descripcion`);
  res.json(rows);
}));

// Crea o actualiza el inventario de un producto en un nodo (operador o superior)
router.put('/', minNivel(2), ah(async (req, res) => {
  const b = req.body || {};
  const nodo = uuid(b.nodo_id, 'nodo_id'), producto = uuid(b.producto_id, 'producto_id');
  const cantidad = entero(b.cantidad_tubos, 'cantidad_tubos', 0);
  const [[n]] = await pool.query('SELECT COUNT(*) AS n FROM nodos WHERE id = ?', [nodo]);
  const [[p]] = await pool.query('SELECT COUNT(*) AS n FROM productos WHERE id = ?', [producto]);
  if (!n.n) throw httpError(404, 'Nodo no encontrado');
  if (!p.n) throw httpError(404, 'Producto no encontrado');
  await pool.query(
    `INSERT INTO inventarios (id, nodo_id, producto_id, cantidad_tubos) VALUES (?,?,?,?)
     ON DUPLICATE KEY UPDATE cantidad_tubos = VALUES(cantidad_tubos)`, [nuevoId(), nodo, producto, cantidad]);
  res.json({ ok: true });
}));

export default router;
