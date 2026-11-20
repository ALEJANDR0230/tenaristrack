import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { ah, httpError, uuid, texto, opcion, nuevoId, ROLES } from '../utils.js';
import { soloRoles } from '../middleware/auth.js';

const router = Router();
const AREAS = ['Demanda', 'Almacenes', 'Transporte', 'Comercio Exterior', 'Desarrollo'];

// Los coordinadores necesitan ver usuarios para asignar incidencias: lista mínima
router.get('/asignables', ah(async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id, nombre, rol FROM usuarios WHERE activo = 1 AND rol IN ('coordinador','product_owner','administrador') ORDER BY nombre");
  res.json(rows);
}));

router.get('/', soloRoles('administrador'), ah(async (req, res) => {
  const [rows] = await pool.query('SELECT id, nombre, correo, rol, area, activo, creado_en FROM usuarios ORDER BY creado_en, nombre');
  res.json(rows);
}));

router.post('/', soloRoles('administrador'), ah(async (req, res) => {
  const b = req.body || {};
  const password = texto(b.password, 'password', 100);
  if (password.length < 8) throw httpError(400, 'La contraseña debe tener al menos 8 caracteres');
  const correo = texto(b.correo, 'correo', 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw httpError(400, 'El correo no tiene un formato válido');
  const hash = await bcrypt.hash(password, 12);
  const id = nuevoId();
  try {
    await pool.query('INSERT INTO usuarios (id, nombre, correo, password_hash, rol, area) VALUES (?,?,?,?,?,?)',
      [id, texto(b.nombre, 'nombre', 100), correo, hash, opcion(b.rol, ROLES, 'rol'),
       b.area ? opcion(b.area, AREAS, 'area') : null]);
    res.status(201).json({ id });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') throw httpError(409, 'Ya existe un usuario con ese correo');
    throw e;
  }
}));

router.put('/:id/activo', soloRoles('administrador'), ah(async (req, res) => {
  const id = uuid(req.params.id, 'id');
  if (id === req.user.id) throw httpError(400, 'No puedes desactivar tu propio usuario');
  const [r] = await pool.query('UPDATE usuarios SET activo = ? WHERE id = ?', [req.body?.activo ? 1 : 0, id]);
  if (!r.affectedRows) throw httpError(404, 'Usuario no encontrado');
  res.json({ ok: true });
}));

export default router;
