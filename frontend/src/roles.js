// Misma jerarquía que el backend y el diagrama de casos de uso
const NIVEL = { consulta: 1, operador: 2, coordinador: 3, product_owner: 4, administrador: 4 };
export const nivel = (rol) => NIVEL[rol] || 0;
