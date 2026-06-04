import { api, uniqueEmail } from './client';
import { VALID_PASSWORD } from './fixtures';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TestUser {
  id: string;
  email: string;
  name?: string;
}

export class TestSession {
  readonly email: string;
  readonly password = VALID_PASSWORD;
  user!: TestUser;
  tokens!: AuthTokens;

  constructor(email?: string) {
    this.email = email ?? uniqueEmail();
  }

  async register(name = 'MovieMind Test User') {
    const res = await api<{ user: TestUser; tokens: AuthTokens; error?: string }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ email: this.email, password: this.password, name }),
      }
    );
    if (res.status !== 201) {
      throw new Error(`Register failed (${res.status}): ${JSON.stringify(res.data)}`);
    }
    this.user = res.data.user;
    this.tokens = res.data.tokens;
    return res;
  }

  get accessToken() {
    if (!this.tokens?.accessToken) {
      throw new Error('Not authenticated — call register() or login() first');
    }
    return this.tokens.accessToken;
  }

  auth<T = unknown>(path: string, init: RequestInit = {}) {
    return api<T>(path, { ...init, token: this.accessToken });
  }
}
