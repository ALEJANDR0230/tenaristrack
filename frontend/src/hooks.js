import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

// Carga datos de la API y los refresca cada "ms" milisegundos (si se indica)
export function useFetch(path, ms) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(
    () => api(path).then((d) => { setData(d); setError(''); }).catch((e) => setError(e.message)),
    [path]
  );
  useEffect(() => {
    load();
    if (!ms) return undefined;
    const t = setInterval(load, ms);
    return () => clearInterval(t);
  }, [load, ms]);
  return { data, error, reload: load };
}
