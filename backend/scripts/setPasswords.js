// SOLO PARA DEMOSTRACIÓN: asigna una contraseña a los usuarios de ejemplo de datos_demo.sql.
// Se niega a ejecutarse en producción.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from '../src/db.js';

if (process.env.NODE_ENV === 'production') {
  console.error('npm run seed solo es para desarrollo. En producción usa npm run crear-admin.');
  process.exit(1);
}
const pass = process.env.DEMO_PASSWORD || 'Tenaris2026!';
const hash = await bcrypt.hash(pass, 10);
const [r] = await pool.query("UPDATE usuarios SET password_hash = ? WHERE password_hash LIKE '%REEMPLA%'", [hash]);
console.log(`Contraseña de ejemplo asignada a ${r.affectedRows} usuarios de demostración: ${pass}`);
await pool.end();
