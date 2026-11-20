export const ESTADO = {
  en_ruta: 'En ruta', en_patio: 'En patio', en_aduana: 'En aduana', retrasado: 'Retrasado', entregado: 'Entregado'
};
export const Tag = ({ estado }) => <span className={`tag st-${estado}`}>{ESTADO[estado] || estado}</span>;
export const fecha = (d) => (d ? new Date(d).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—');
export const Err = ({ msg }) => (msg ? <p className="err" role="alert">{msg}</p> : null);
