import { describe, expect, it } from 'vitest';
import {
  extractBearerToken,
  generateId,
  isValidEmail,
  isValidPassword,
  verifyPassword,
  hashPassword,
  createJWT,
  verifyJWT,
  generateTokens,
  rowToUser,
} from '../../src/utils/auth';
import type { UserRow } from '../../src/types/auth';
import { INVALID_EMAILS, INVALID_PASSWORDS, VALID_PASSWORD } from '../helpers/fixtures';

describe('auth utils — email validation', () => {
  it.each([
    ['user@example.com', true],
    ['baktash.ansari1381@gmail.com', true],
    ['name+tag@domain.co.uk', true],
  ])('accepts valid email: %s', (email, expected) => {
    expect(isValidEmail(email)).toBe(expected);
  });

  it.each(INVALID_EMAILS)('rejects invalid email: %s', (email) => {
    expect(isValidEmail(email)).toBe(false);
  });
});

describe('auth utils — password validation', () => {
  it('accepts a strong password', () => {
    expect(isValidPassword(VALID_PASSWORD)).toEqual({ valid: true });
  });

  it.each(Object.entries(INVALID_PASSWORDS))('rejects %s', (_name, password) => {
    const result = isValidPassword(password);
    expect(result.valid).toBe(false);
    expect(result.message).toBeTruthy();
  });

  it('requires minimum 8 characters message', () => {
    expect(isValidPassword('Ab1!').message).toContain('8 characters');
  });
});

describe('auth utils — bearer token extraction', () => {
  it('extracts token from Bearer header', () => {
    expect(extractBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
  });

  it.each([null, '', 'Basic xyz', 'bearer lowercase'])(
    'returns null for invalid header: %s',
    (header) => {
      expect(extractBearerToken(header)).toBeNull();
    }
  );
});

describe('auth utils — id generation', () => {
  it('generates unique UUIDs', () => {
    const a = generateId();
    const b = generateId();
    expect(a).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(a).not.toBe(b);
  });
});

describe('auth utils — password hashing', () => {
  it('hashes and verifies password correctly', async () => {
    const hash = await hashPassword('MySecret99!');
    expect(hash).not.toBe('MySecret99!');
    expect(await verifyPassword('MySecret99!', hash)).toBe(true);
    expect(await verifyPassword('WrongPass99!', hash)).toBe(false);
  });

  it('returns false for malformed hash', async () => {
    expect(await verifyPassword('x', 'not-valid-base64!!!')).toBe(false);
  });
});

describe('auth utils — JWT lifecycle', () => {
  const secret = 'test-jwt-secret-for-unit-tests';

  it('creates and verifies JWT', async () => {
    const token = await createJWT({ sub: 'user-1', email: 'a@b.com' }, secret, 3600);
    const payload = await verifyJWT(token, secret);
    expect(payload?.sub).toBe('user-1');
    expect(payload?.email).toBe('a@b.com');
  });

  it('rejects wrong secret', async () => {
    const token = await createJWT({ sub: 'u', email: 'x@y.com' }, secret, 3600);
    expect(await verifyJWT(token, 'wrong-secret')).toBeNull();
  });

  it('rejects malformed token', async () => {
    expect(await verifyJWT('bad.token', secret)).toBeNull();
  });

  it('generateTokens returns access and refresh', async () => {
    const user = rowToUser({
      id: 'id-1',
      email: 'test@test.com',
      name: 'Test',
      avatar_url: null,
      profile_completed: 0,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      password_hash: 'x',
    } as UserRow);

    const tokens = await generateTokens(user, secret);
    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();
    expect(tokens.expiresIn).toBeGreaterThan(0);
  });
});

describe('auth utils — rowToUser', () => {
  it('maps database row to User', () => {
    const user = rowToUser({
      id: 'uuid',
      email: 'e@mail.com',
      name: 'Name',
      avatar_url: 'http://img',
      profile_completed: 1,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
      password_hash: 'hash',
    } as UserRow);

    expect(user).toMatchObject({
      id: 'uuid',
      email: 'e@mail.com',
      name: 'Name',
      avatarUrl: 'http://img',
      profileCompleted: true,
    });
  });
});
