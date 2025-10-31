export function getAuthToken(): string | null {
  // Prefer sessionStorage (per-tab). Fall back to localStorage to preserve existing "remembered" sessions.
  return sessionStorage.getItem('token') || localStorage.getItem('token');
}

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const base = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_URL) ? (import.meta as any).env.VITE_API_URL : '';
  const fullUrl = url.startsWith('http') ? url : `${base.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(fullUrl, { ...options, headers });
  if (!res.ok) {
    // Try to parse JSON error body first, otherwise fall back to text
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await res.json().catch(() => null);
      const message = body && (body.error || body.message) ? (body.error || body.message) : JSON.stringify(body);
      throw new Error(message || `Request failed: ${res.status}`);
    }
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}


