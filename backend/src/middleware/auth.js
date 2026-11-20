import jwt from 'jsonwebtoken';
import { httpError } from '../utils.js';

// Jerarquía definida en el diagrama de casos de uso: cada rol incluye los permisos del anterior
export const NIVEL = { consulta: 1, operador: 2, coordinador: 3, product_owner: 4, administrador: 4 };

export function autenticar(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return next(httpError(401, 'Se requiere iniciar sesión'));
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    next();
  } catch {
    next(httpError(401, 'Sesión inválida o expirada'));
  }
}

// Permite el acceso a partir de un nivel mínimo (1 consulta ... 3 coordinador)
export const minNivel = (n) => (req, res, next) =>
  (NIVEL[req.user?.rol] || 0) >= n ? next() : next(httpError(403, 'No tienes permiso para esta acción'));

// Permite el acceso solo a roles específicos
export const soloRoles = (...roles) => (req, res, next) =>
  roles.includes(req.user?.rol) ? next() : next(httpError(403, 'No tienes permiso para esta acción'));
