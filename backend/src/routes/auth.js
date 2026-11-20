import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { pool } from '../db.js';
import { ah, httpError } from '../utils.js';
import { autenticar } from '../middleware/auth.js';

const router = Router();

// Limita los intentos de inicio de sesión (mitiga fuerza bruta). Configurable con RATE_LIMIT_LOGIN.
const limitarLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_LOGIN || 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' }
});

// Hash falso: se compara aunque el usuario no exista para que el tiempo de respuesta sea parecido
// y no se pueda saber qué correos están registrados.
const HASH_FALSO = bcrypt.hashSync('contrasena-falsa-para-igualar-tiempos', 10);

router.post('/login', limitarLogin, ah(async (req, res) => {
  const { correo, password } = req.body || {};
  if (typeof correo !== 'string' || typeof password !== 'string' || !correo || !password) {
    throw httpError(400, 'Correo y contraseña son obligatorios');
  }
  const [rows] = await pool.query(
    'SELECT id, nombre, correo, password_hash, rol, area FROM usuarios WHERE correo = ? AND activo = 1', [correo.trim().toLowerCase()]);
  const u = rows[0];
  let ok = false;
  try { ok = await bcrypt.compare(password, u ? u.password_hash : HASH_FALSO) && !!u; } catch { ok = false; }
  if (!ok) throw httpError(401, 'Credenciales inválidas');
  const user = { id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol, area: u.area };
  const token = jwt.sign({ id: u.id, nombre: u.nombre, rol: u.rol }, process.env.JWT_SECRET, { expiresIn: '8h', algorithm: 'HS256' });
  res.json({ token, user });
}));

router.get('/me', autenticar, ah(async (req, res) => {
  const [rows] = await pool.query('SELECT id, nombre, correo, rol, area FROM usuarios WHERE id = ? AND activo = 1', [req.user.id]);
  if (!rows[0]) throw httpError(401, 'Usuario no encontrado');
  res.json(rows[0]);
}));

export default router;
