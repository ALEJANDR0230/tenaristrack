import { randomUUID, randomInt } from 'node:crypto';

// Envuelve handlers async para que los errores lleguen al manejador global (Express 4)
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

export function entero(valor, nombre, min = 1, max = 2147483647) {
  const n = Number(valor);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw httpError(400, `El campo "${nombre}" debe ser un entero entre ${min} y ${max}`);
  }
  return n;
}

// ---- Identificadores no secuenciales (UUID v4) ----
export const nuevoId = () => randomUUID();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function uuid(valor, nombre) {
  if (typeof valor !== 'string' || !UUID_RE.test(valor)) {
    throw httpError(400, `El campo "${nombre}" no es un identificador válido`);
  }
  return valor.toLowerCase();
}
// Folio legible pero no adivinable: EMB- + 8 caracteres aleatorios (alfabeto Crockford, sin I, L, O, U)
const ALFABETO = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export function nuevoFolio() {
  let s = '';
  for (let i = 0; i < 8; i++) s += ALFABETO[randomInt(ALFABETO.length)];
  return `EMB-${s}`;
}

export function texto(valor, nombre, max = 255, obligatorio = true) {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    if (obligatorio) throw httpError(400, `El campo "${nombre}" es obligatorio`);
    return null;
  }
  const s = String(valor).trim();
  if (s.length > max) throw httpError(400, `El campo "${nombre}" excede ${max} caracteres`);
  return s;
}

export function opcion(valor, lista, nombre) {
  if (!lista.includes(valor)) throw httpError(400, `El campo "${nombre}" debe ser uno de: ${lista.join(', ')}`);
  return valor;
}

export const ESTADOS_EMBARQUE = ['en_ruta', 'en_patio', 'en_aduana', 'retrasado', 'entregado'];
export const PRIORIDADES = ['baja', 'media', 'alta'];
export const ESTADOS_INCIDENCIA = ['abierta', 'en_atencion', 'resuelta'];
export const ROLES = ['administrador', 'product_owner', 'coordinador', 'operador', 'consulta'];
