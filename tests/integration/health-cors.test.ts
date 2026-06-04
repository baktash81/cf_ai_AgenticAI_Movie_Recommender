import { describe, expect, it } from 'vitest';
import { api } from '../helpers/client';

describe('health & CORS', () => {
  it('GET /health returns ok status', async () => {
    const res = await api<{ status: string; service: string; timestamp: string }>('/health');
    expect(res.status).toBe(200);
    expect(res.data.status).toBe('ok');
    expect(res.data.service).toBe('movie-recommendation');
    expect(res.data.timestamp).toBeTruthy();
  });

  it('OPTIONS preflight returns CORS headers', async () => {
    const { getApiBase } = await import('../helpers/client');
    const response = await fetch(`${getApiBase()}/trending`, {
      method: 'OPTIONS',
    });
    expect(response.status).toBeLessThan(300);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
  });

  it('unknown route returns 404 with path', async () => {
    const res = await api<{ error: string; path: string }>('/this-route-does-not-exist-xyz');
    expect(res.status).toBe(404);
    expect(res.data.error).toBe('Not found');
    expect(res.data.path).toContain('this-route-does-not-exist');
  });

  it('unsupported method on auth returns error', async () => {
    const res = await api('/auth/login', { method: 'DELETE' });
    expect([404, 405]).toContain(res.status);
  });
});
