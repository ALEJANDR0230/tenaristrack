import { Router } from 'express';
import { pool } from '../db.js';
import { ah, httpError, entero, uuid, texto, opcion, nuevoId } from '../utils.js';
import { soloRoles } from '../middleware/auth.js';

const router = Router();
const admins = soloRoles('product_owner', 'administrador');
const TIPOS_NODO = ['complejo', 'patio', 'puerto', 'frontera', 'terminal'];
const MEDIOS = ['camion', 'ferrocarril', 'mixto'];
const FAMILIAS = ['OCTG', 'Line Pipe', 'Casing', 'Sin costura'];

function duplicado(e, mensaje) {
  if (e.code === 'ER_DUP_ENTRY') throw httpError(409, mensaje);
  throw e;
}

// ---------- Nodos ----------
router.get('/nodos', ah(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM v_ocupacion_nodos ORDER BY codigo');
  res.json(rows);
}));

router.get('/nodos/:id', ah(async (req, res) => {
  const id = uuid(req.params.id, 'id');
  const [[nodo]] = await pool.query('SELECT * FROM v_ocupacion_nodos WHERE id = ?', [id]);
  if (!nodo) throw httpError(404, 'Nodo no encontrado');
  const [inventarios] = await pool.query(
    `SELECT i.producto_id, p.descripcion AS producto, i.cantidad_tubos
       FROM inventarios i JOIN productos p ON p.id = i.producto_id WHERE i.nodo_id = ? ORDER BY p.descripcion`, [id]);
  const [embarques] = await pool.query(
    `SELECT id, folio, estado, avance_pct FROM embarques
      WHERE (nodo_origen_id = ? OR nodo_destino_id = ?) AND estado <> 'entregado' ORDER BY creado_en DESC, folio`, [id, id]);
  res.json({ ...nodo, inventarios, embarques });
}));

function datosNodo(b) {
  return [
    texto(b.codigo, 'codigo', 10), texto(b.nombre, 'nombre', 80), opcion(b.tipo, TIPOS_NODO, 'tipo'),
    entero(b.capacidad_max, 'capacidad_max'), entero(b.pos_x ?? 0, 'pos_x', -32768, 32767), entero(b.pos_y ?? 0, 'pos_y', -32768, 32767)
  ];
}

router.post('/nodos', admins, ah(async (req, res) => {
  const id = nuevoId();
  try {
    await pool.query(
      'INSERT INTO nodos (id, codigo, nombre, tipo, capacidad_max, pos_x, pos_y) VALUES (?,?,?,?,?,?,?)', [id, ...datosNodo(req.body || {})]);
  } catch (e) { duplicado(e, 'Ya existe un nodo con ese código'); }
  res.status(201).json({ id });
}));

router.put('/nodos/:id', admins, ah(async (req, res) => {
  const id = uuid(req.params.id, 'id');
  let r;
  try {
    [r] = await pool.query(
      'UPDATE nodos SET codigo=?, nombre=?, tipo=?, capacidad_max=?, pos_x=?, pos_y=? WHERE id=?', [...datosNodo(req.body || {}), id]);
  } catch (e) { duplicado(e, 'Ya existe un nodo con ese código'); }
  if (!r.affectedRows) throw httpError(404, 'Nodo no encontrado');
  res.json({ ok: true });
}));

// ---------- Rutas ----------
router.get('/rutas', ah(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT r.*, o.codigo AS origen_codigo, o.nombre AS origen, d.codigo AS destino_codigo, d.nombre AS destino
       FROM rutas r JOIN nodos o ON o.id = r.nodo_origen_id JOIN nodos d ON d.id = r.nodo_destino_id
      ORDER BY o.codigo, d.codigo`);
  res.json(rows);
}));

router.post('/rutas', admins, ah(async (req, res) => {
  const b = req.body || {};
  const o = uuid(b.nodo_origen_id, 'nodo_origen_id'), d = uuid(b.nodo_destino_id, 'nodo_destino_id');
  if (o === d) throw httpError(400, 'El origen y el destino deben ser distintos');
  const km = Number(b.distancia_km), h = Number(b.tiempo_est_horas);
  if (!Number.isFinite(km) || km <= 0 || !Number.isFinite(h) || h <= 0) throw httpError(400, 'La distancia y el tiempo deben ser números positivos');
  const [[n]] = await pool.query('SELECT COUNT(*) AS n FROM nodos WHERE id IN (?, ?)', [o, d]);
  if (n.n !== 2) throw httpError(400, 'El nodo de origen o el de destino no existe');
  const id = nuevoId();
  try {
    await pool.query(
      'INSERT INTO rutas (id, nodo_origen_id, nodo_destino_id, distancia_km, tiempo_est_horas, medio) VALUES (?,?,?,?,?,?)',
      [id, o, d, km, h, opcion(b.medio || 'camion', MEDIOS, 'medio')]);
  } catch (e) { duplicado(e, 'Ya existe una ruta entre esos nodos'); }
  res.status(201).json({ id });
}));

// ---------- Productos ----------
router.get('/productos', ah(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM productos ORDER BY descripcion');
  res.json(rows);
}));

router.post('/productos', admins, ah(async (req, res) => {
  const b = req.body || {};
  const id = nuevoId();
  try {
    await pool.query('INSERT INTO productos (id, descripcion, familia) VALUES (?,?,?)',
      [id, texto(b.descripcion, 'descripcion', 100), opcion(b.familia, FAMILIAS, 'familia')]);
  } catch (e) { duplicado(e, 'Ya existe un producto con esa descripción'); }
  res.status(201).json({ id });
}));

export default router;
