import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { pool } from './db.js';
import { autenticar } from './middleware/auth.js';
import auth from './routes/auth.js';
import dashboard from './routes/dashboard.js';
import catalogo from './routes/catalogo.js';
import embarques from './routes/embarques.js';
import inventarios from './routes/inventarios.js';
import sensores from './routes/sensores.js';
import incidencias from './routes/incidencias.js';
import usuarios from './routes/usuarios.js';

const PROD = process.env.NODE_ENV === 'production';

// ---- Comprobaciones de arranque (seguridad) ----
const secreto = process.env.JWT_SECRET || '';
if (!secreto) {
  console.error('Falta JWT_SECRET en las variables de entorno');
  process.exit(1);
}
if (PROD && (secreto.length < 32 || /cambia_esto|secret|password/i.test(secreto))) {
  console.error('JWT_SECRET es débil: en producción debe tener al menos 32 caracteres aleatorios.');
  process.exit(1);
}

const app = express();
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

// Cabeceras de seguridad. La interfaz se sirve desde el mismo origen y no usa recursos externos.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],   // React aplica algunos estilos en línea
      imgSrc: ["'self'", 'data:'],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  hsts: PROD ? { maxAge: 15552000, includeSubDomains: true } : false
}));

// CORS: sin CORS_ORIGIN solo se permite el mismo origen (no se refleja cualquier origen).
if (process.env.CORS_ORIGIN) app.use(cors({ origin: process.env.CORS_ORIGIN.split(',').map((s) => s.trim()) }));
app.use(express.json({ limit: '100kb' }));

// Límite general de solicitudes por IP
app.use('/api', rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_API || 300),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }
}));

// Registro mínimo de solicitudes (sin cuerpos ni cabeceras, para no guardar datos sensibles)
app.use('/api', (req, res, next) => {
  const t = Date.now();
  res.on('finish', () => console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode} ${Date.now() - t}ms`));
  next();
});

app.get('/api/health', async (req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true, db: true }); }
  catch { res.status(503).json({ ok: false, db: false }); }
});

// Configuración pública de la interfaz: identifica los datos simulados (riesgo R01)
app.get('/api/config', (req, res) => res.json({ demo: process.env.DEMO_MODE === 'true' }));

app.use('/api/auth', auth);
app.use('/api', autenticar); // todo lo que sigue requiere sesión
app.use('/api/dashboard', dashboard);
app.use('/api', catalogo);
app.use('/api/embarques', embarques);
app.use('/api/inventarios', inventarios);
app.use('/api/sensores', sensores);
app.use('/api/incidencias', incidencias);
app.use('/api/usuarios', usuarios);
app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// ---- Interfaz web (frontend compilado) ----
const aqui = path.dirname(fileURLToPath(import.meta.url));
const dist = process.env.FRONTEND_DIST || path.resolve(aqui, '../../frontend/dist');
if (fs.existsSync(path.join(dist, 'index.html'))) {
  app.use(express.static(dist, { index: false, maxAge: '1h', setHeaders: (res, f) => { if (f.endsWith('index.html')) res.setHeader('Cache-Control', 'no-store'); } }));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
} else {
  app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
}

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo de la solicitud no es JSON válido' });
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = Number(process.env.PORT || 4000);
const server = app.listen(PORT, () => console.log(`TenarisTrack escuchando en el puerto ${PORT} (${PROD ? 'producción' : 'desarrollo'})`));

// Cierre ordenado (docker stop / reinicios)
for (const s of ['SIGTERM', 'SIGINT']) {
  process.on(s, () => {
    console.log(`Recibido ${s}; cerrando…`);
    server.close(async () => { await pool.end().catch(() => {}); process.exit(0); });
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
