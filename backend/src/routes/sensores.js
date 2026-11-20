import { Router } from 'express';
import { pool } from '../db.js';
import { ah, httpError, entero, uuid, nuevoId } from '../utils.js';
import { minNivel } from '../middleware/auth.js';

const router = Router();

router.get('/', ah(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT s.id, s.nombre, s.tipo, s.unidad, s.umbral_min, s.umbral_max, s.nodo_id, s.embarque_id,
       (SELECT l.valor FROM lecturas l WHERE l.sensor_id = s.id ORDER BY l.registrada_en DESC LIMIT 1) AS ultima_lectura,
       (SELECT l.registrada_en FROM lecturas l WHERE l.sensor_id = s.id ORDER BY l.registrada_en DESC LIMIT 1) AS ultima_fecha
     FROM sensores s WHERE s.activo = 1 ORDER BY s.nombre`);
  res.json(rows);
}));

router.get('/:id/lecturas', ah(async (req, res) => {
  const limite = entero(req.query.limite ?? 50, 'limite', 1, 500);
  const [rows] = await pool.query(
    'SELECT valor, registrada_en FROM lecturas WHERE sensor_id = ? ORDER BY registrada_en DESC LIMIT ?',
    [uuid(req.params.id, 'id'), limite]);
  res.json(rows);
}));

// Registra una lectura. Si excede el umbral, abre una incidencia de prioridad alta (alerta temprana)
// y evita duplicarla mientras exista una abierta con el mismo título.
router.post('/:id/lecturas', minNivel(2), ah(async (req, res) => {
  const id = uuid(req.params.id, 'id');
  const valor = Number(req.body?.valor);
  if (!Number.isFinite(valor)) throw httpError(400, 'El campo "valor" debe ser numérico');
  const [[s]] = await pool.query('SELECT * FROM sensores WHERE id = ? AND activo = 1', [id]);
  if (!s) throw httpError(404, 'Sensor no encontrado');
  await pool.query('INSERT INTO lecturas (id, sensor_id, valor) VALUES (?, ?, ?)', [nuevoId(), id, valor]);
  const fuera = (s.umbral_max !== null && valor > s.umbral_max) || (s.umbral_min !== null && valor < s.umbral_min);
  let alerta = false;
  if (fuera) {
    const titulo = `Lectura fuera de umbral: ${s.nombre}`;
    const [[abierta]] = await pool.query(
      "SELECT id FROM incidencias WHERE titulo = ? AND estado <> 'resuelta' LIMIT 1", [titulo]);
    if (!abierta) {
      await pool.query(
        `INSERT INTO incidencias (id, titulo, descripcion, prioridad, nodo_id, embarque_id, reportada_por)
         VALUES (?, ?, ?, 'alta', ?, ?, ?)`,
        [nuevoId(), titulo, `Valor ${valor} ${s.unidad} fuera del rango permitido.`, s.nodo_id, s.embarque_id, req.user.id]);
      alerta = true;
    }
  }
  res.status(201).json({ ok: true, fuera_de_umbral: fuera, incidencia_creada: alerta });
}));

export default router;
