const BASE = import.meta.env.VITE_API_URL || '/api';

export const getToken = () => localStorage.getItem('tt_token');
export const setToken = (t) => (t ? localStorage.setItem('tt_token', t) : localStorage.removeItem('tt_token'));

export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken();
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/auth/login') {
    setToken(null);
    window.dispatchEvent(new Event('tt-logout'));
  }
  if (!res.ok) throw new Error(data.error || 'No se pudo conectar con el servidor');
  return data;
}
