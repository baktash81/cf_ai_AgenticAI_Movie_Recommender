import { describe, expect, it, beforeAll } from 'vitest';
import { pollUntil } from '../helpers/client';
import { TestSession } from '../helpers/session';

describe('chat API', () => {
  const session = new TestSession();

  beforeAll(async () => {
    await session.register();
  }, 60_000);

  it('rejects empty message', async () => {
    const res = await session.auth('/chat', {
      method: 'POST',
      body: JSON.stringify({ message: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('processes a recommendation chat message', async () => {
    const res = await session.auth<{
      message?: string;
      conversationId?: string;
      messageId?: string;
      type?: string;
      movies?: unknown[];
      searchId?: string;
      error?: string;
    }>('/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Recommend 2 popular science fiction movies from the 2010s',
      }),
    });

    expect(res.status).toBe(200);
    expect(res.data.error).toBeUndefined();
    expect(res.data.conversationId).toBeTruthy();
    expect(res.data.message || res.data.movies || res.data.searchId).toBeTruthy();
  }, 90_000);

  it('continues conversation with conversationId', async () => {
    const first = await session.auth<{ conversationId: string }>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'What are the top 3 action movies?' }),
    });
    expect(first.status).toBe(200);
    const conversationId = first.data.conversationId;
    expect(conversationId).toBeTruthy();

    const second = await session.auth<{ conversationId: string; message?: string }>('/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Which of those has the highest rating?',
        conversationId,
      }),
    });
    expect(second.status).toBe(200);
    expect(second.data.conversationId).toBe(conversationId);
  }, 120_000);
});

describe('recommend API workflow', () => {
  const session = new TestSession();

  beforeAll(async () => {
    await session.register();
  }, 60_000);

  it('starts a natural language recommendation search', async () => {
    const res = await session.auth<{ searchId: string }>('/recommend', {
      method: 'POST',
      body: JSON.stringify({ naturalLanguage: 'Comedy movies from the 90s with rating above 7' }),
    });
    expect(res.status).toBe(200);
    expect(res.data.searchId).toBeTruthy();

    const searchId = res.data.searchId;

    const status = await pollUntil<{ status: string }>(
      async () => {
        const s = await session.auth<{ status: string; progress?: number }>(`/status/${searchId}`);
        const done = s.data.status === 'completed' || s.data.status === 'failed';
        return { done, value: s.data };
      },
      { timeoutMs: 90_000 }
    );

    expect(['completed', 'failed']).toContain(status.status);

    if (status.status === 'completed') {
      const results = await session.auth<{ movies: unknown[]; count: number }>(
        `/recommendations/${searchId}`
      );
      expect(results.status).toBe(200);
      expect(results.data.count).toBeGreaterThanOrEqual(0);
    }
  }, 120_000);

  it('rejects recommend without auth or userId', async () => {
    const { api } = await import('../helpers/client');
    const res = await api('/recommend', {
      method: 'POST',
      body: JSON.stringify({ naturalLanguage: 'horror' }),
    });
    expect(res.status).toBe(401);
  });
});

describe('preferences API (AI)', () => {
  const session = new TestSession();

  beforeAll(async () => {
    await session.register();
  }, 60_000);

  it('rejects preferences analyze without input', async () => {
    const res = await session.auth('/preferences', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('analyzes and saves user preferences', async () => {
    const res = await session.auth<{ preferences?: unknown; confidence?: number }>(
      '/preferences',
      {
        method: 'POST',
        body: JSON.stringify({
          input:
            'I love Christopher Nolan films, science fiction, and thrillers. I dislike romantic comedies.',
        }),
      }
    );
    expect(res.status).toBe(200);
    expect(res.data.preferences || res.data).toBeTruthy();
  }, 90_000);

  it('retrieves saved preferences after analyze', async () => {
    const res = await session.auth('/preferences');
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.data).toBeTruthy();
    }
  });
});
