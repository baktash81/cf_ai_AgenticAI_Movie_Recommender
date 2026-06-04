const DEFAULT_API = 'https://movie-recommendation-system.baktash-ansari1381.workers.dev';
const DEFAULT_SITE = 'https://movie.baktashans.com';

export function getApiBase(): string {
  return (process.env.MOVIE_API_BASE_URL ?? DEFAULT_API).replace(/\/$/, '');
}

export function getSiteUrl(): string {
  return (process.env.MOVIE_SITE_URL ?? DEFAULT_SITE).replace(/\/$/, '');
}

/** @deprecated use getApiBase() — kept for imports */
export const API_BASE = DEFAULT_API;
/** @deprecated use getSiteUrl() */
export const SITE_URL = DEFAULT_SITE;

export interface ApiResponse<T = unknown> {
  status: number;
  ok: boolean;
  data: T;
  headers: Headers;
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<ApiResponse<T>> {
  const { token, headers: customHeaders, ...init } = options;
  const url = path.startsWith('http') ? path : `${getApiBase()}${path.startsWith('/') ? path : `/${path}`}`;

  const headers = new Headers(customHeaders);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, { ...init, headers });
  let data: T;
  const text = await response.text();
  try {
    data = text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    data = { raw: text } as T;
  }

  return {
    status: response.status,
    ok: response.ok,
    data,
    headers: response.headers,
  };
}

export async function pollUntil<T>(
  fn: () => Promise<{ done: boolean; value?: T }>,
  options: { intervalMs?: number; timeoutMs?: number } = {}
): Promise<T> {
  const intervalMs = options.intervalMs ?? 1500;
  const timeoutMs = options.timeoutMs ?? 90_000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const result = await fn();
    if (result.done) {
      return result.value as T;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(`pollUntil timed out after ${timeoutMs}ms`);
}

export function uniqueEmail(prefix = 'moviemind-test'): string {
  const slug = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${slug}@test.baktashans.com`;
}
