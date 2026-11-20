// Crea (o restablece) el primer usuario administrador SIN usar los datos de demostración.
// Uso:  ADMIN_CORREO=correo@dominio.com ADMIN_PASSWORD='contraseña-larga' npm run crear-admin
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { pool } from '../src/db.js';

const correo = (process.env.ADMIN_CORREO || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';
const nombre = process.env.ADMIN_NOMBRE || 'Administrador';
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) { console.error('Define ADMIN_CORREO con un correo válido.'); process.exit(1); }
if (password.length < 12) { console.error('ADMIN_PASSWORD debe tener al menos 12 caracteres.'); process.exit(1); }

const hash = await bcrypt.hash(password, 12);
const [r] = await pool.query(
  `INSERT INTO usuarios (id, nombre, correo, password_hash, rol, area) VALUES (?,?,?,?, 'administrador', 'Desarrollo')
   ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), rol = 'administrador', activo = 1`,
  [randomUUID(), nombre, correo, hash]);
console.log(r.affectedRows === 1 ? `Administrador creado: ${correo}` : `Contraseña restablecida para: ${correo}`);
await pool.end();
