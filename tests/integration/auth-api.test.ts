import { describe, expect, it } from 'vitest';
import { api } from '../helpers/client';
import { INVALID_EMAILS, INVALID_PASSWORDS, VALID_PASSWORD } from '../helpers/fixtures';
import { TestSession } from '../helpers/session';

describe('auth API — registration validation', () => {
  it('rejects missing email and password', async () => {
    const res = await api('/auth/register', { method: 'POST', body: JSON.stringify({}) });
    expect(res.status).toBe(400);
    expect(res.data).toMatchObject({ error: expect.stringContaining('required') });
  });

  it.each(INVALID_EMAILS.filter((e) => e !== ''))('rejects invalid email: %s', async (email) => {
    const res = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password: VALID_PASSWORD }),
    });
    expect(res.status).toBe(400);
    expect((res.data as { error: string }).error).toMatch(/email/i);
  });

  it.each(Object.values(INVALID_PASSWORDS))('rejects weak password', async (password) => {
    const session = new TestSession();
    const res = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: session.email, password }),
    });
    expect(res.status).toBe(400);
    expect((res.data as { error: string }).error).toBeTruthy();
  });

  it('registers a new user successfully', async () => {
    const session = new TestSession();
    const res = await session.register();
    expect(res.status).toBe(201);
    expect(session.user.email).toBe(session.email.toLowerCase());
    expect(session.tokens.accessToken).toBeTruthy();
    expect(session.tokens.refreshToken).toBeTruthy();
  });

  it('rejects duplicate email registration', async () => {
    const session = new TestSession();
    await session.register();
    const dup = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: session.email, password: VALID_PASSWORD }),
    });
    expect(dup.status).toBe(409);
  });
});

describe('auth API — login', () => {
  it('rejects missing credentials', async () => {
    const res = await api('/auth/login', { method: 'POST', body: JSON.stringify({}) });
    expect(res.status).toBe(400);
  });

  it('rejects wrong password', async () => {
    const session = new TestSession();
    await session.register();
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: session.email, password: 'WrongPass123!' }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects unknown email', async () => {
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: `nobody-${Date.now()}@test.baktashans.com`,
        password: VALID_PASSWORD,
      }),
    });
    expect(res.status).toBe(401);
  });

  it('logs in with correct credentials', async () => {
    const session = new TestSession();
    await session.register();
    const res = await api<{ user: { id: string }; tokens: { accessToken: string } }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email: session.email, password: session.password }),
      }
    );
    expect(res.status).toBe(200);
    expect(res.data.user.id).toBe(session.user.id);
    expect(res.data.tokens.accessToken).toBeTruthy();
  });
});

describe('auth API — session & tokens', () => {
  it('GET /auth/me requires authentication', async () => {
    const res = await api('/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /auth/me returns user when authenticated', async () => {
    const session = new TestSession();
    await session.register();
    const res = await session.auth<{ id: string; email: string }>('/auth/me');
    expect(res.status).toBe(200);
    expect(res.data.email).toBe(session.email.toLowerCase());
  });

  it('rejects invalid bearer token', async () => {
    const res = await api('/auth/me', { token: 'invalid.jwt.token' });
    expect(res.status).toBe(401);
  });

  it('refreshes access token', async () => {
    const session = new TestSession();
    await session.register();
    const oldRefresh = session.tokens.refreshToken;

    const res = await api<{ tokens: { accessToken: string; refreshToken: string } }>(
      '/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken: session.tokens.refreshToken }),
      }
    );
    expect(res.status).toBe(200);
    expect(res.data.tokens.accessToken).toBeTruthy();
    expect(res.data.tokens.refreshToken).toBeTruthy();

    // New access token must authenticate
    const me = await api<{ email: string }>('/auth/me', {
      token: res.data.tokens.accessToken,
    });
    expect(me.status).toBe(200);
    expect(me.data.email).toBe(session.email.toLowerCase());

    // Refresh token rotation: old refresh token must not be reusable
    const reused = await api('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: oldRefresh }),
    });
    expect(reused.status).toBe(401);

    // New refresh token must work for a second refresh
    const second = await api('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: res.data.tokens.refreshToken }),
    });
    expect(second.status).toBe(200);
    expect(second.data.tokens.accessToken).toBeTruthy();
  });

  it('rejects invalid refresh token', async () => {
    const res = await api('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: 'not-a-real-token' }),
    });
    expect([400, 401]).toContain(res.status);
  });

  it('updates user profile', async () => {
    const session = new TestSession();
    await session.register();
    const res = await session.auth<{ name: string }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated Test Name' }),
    });
    expect(res.status).toBe(200);
    expect(res.data.name).toBe('Updated Test Name');
  });

  it('logout succeeds when authenticated', async () => {
    const session = new TestSession();
    await session.register();
    const res = await session.auth('/auth/logout', { method: 'POST' });
    expect([200, 204]).toContain(res.status);
  });
});

describe('auth API — protected route enforcement', () => {
  const protectedRoutes: Array<{ method: string; path: string; body?: object }> = [
    { method: 'POST', path: '/chat', body: { message: 'hi' } },
    { method: 'GET', path: '/conversations' },
    { method: 'GET', path: '/watchlist' },
    { method: 'GET', path: '/preferences' },
    { method: 'POST', path: '/preferences', body: { input: 'I like sci-fi' } },
    { method: 'GET', path: '/taste-profile' },
    { method: 'POST', path: '/recommend', body: { naturalLanguage: 'horror films' } },
  ];

  it.each(protectedRoutes)('$method $path returns 401 without token', async ({ method, path, body }) => {
    const res = await api(path, {
      method,
      body: body ? JSON.stringify(body) : undefined,
    });
    expect(res.status).toBe(401);
  });
});
