const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export async function api(path, { method = 'GET', body, authenticated = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('busbook:token');
  if (authenticated && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${BASE}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error('Cannot reach the server. Check your connection.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = Array.isArray(data.details)
      ? ` (${data.details.map((d) => d.message || d).join(', ')})`
      : '';
    const error = new Error(`${data.error || `Request failed (${response.status})`}${details}`);
    error.status = response.status;
    error.code = data.result;
    throw error;
  }
  return data;
}
