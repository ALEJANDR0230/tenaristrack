import { Router } from 'express';
import { pool } from '../db.js';
import { ah } from '../utils.js';

const router = Router();

router.get('/kpis', ah(async (req, res) => {
  const [[k]] = await pool.query('SELECT * FROM v_kpis');
  const [[inc]] = await pool.query("SELECT COUNT(*) AS abiertas FROM incidencias WHERE estado <> 'resuelta'");
  res.json({
    embarques_activos: Number(k.embarques_activos || 0),
    retrasados: Number(k.retrasados || 0),
    nivel_servicio_pct: k.nivel_servicio_pct === null ? null : Number(k.nivel_servicio_pct),
    inventario_total: Number(k.inventario_total || 0),
    incidencias_abiertas: Number(inc.abiertas || 0)
  });
}));

export default router;
