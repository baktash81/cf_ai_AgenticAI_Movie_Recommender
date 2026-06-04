import { describe, expect, it, beforeAll } from 'vitest';
import { api } from '../helpers/client';
import { sampleMovie } from '../helpers/fixtures';
import { TestSession } from '../helpers/session';

describe('protected API — conversations', () => {
  const session = new TestSession();
  let conversationId: string;

  beforeAll(async () => {
    await session.register();
  });

  it('lists conversations (empty or more)', async () => {
    const res = await session.auth<{ conversations: unknown[] }>('/conversations');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.conversations)).toBe(true);
  });

  it('creates a conversation', async () => {
    const res = await session.auth<{ conversationId: string; title: string }>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test Conversation' }),
    });
    expect(res.status).toBe(201);
    expect(res.data.conversationId).toBeTruthy();
    conversationId = res.data.conversationId;
  });

  it('gets conversation with messages', async () => {
    const res = await session.auth<{ conversation_id: string; messages: unknown[] }>(
      `/conversations/${conversationId}`
    );
    expect(res.status).toBe(200);
    expect(res.data.conversation?.conversation_id || res.data.conversation_id).toBe(conversationId);
  });

  it('updates conversation title', async () => {
    const res = await session.auth(`/conversations/${conversationId}`, {
      method: 'PUT',
      body: JSON.stringify({ title: 'Renamed Conversation' }),
    });
    expect(res.status).toBe(200);
  });

  it('deletes conversation', async () => {
    const res = await session.auth(`/conversations/${conversationId}`, { method: 'DELETE' });
    expect([200, 204]).toContain(res.status);
  });
});

describe('protected API — watchlist CRUD', () => {
  const session = new TestSession();
  const movie = sampleMovie();

  beforeAll(async () => {
    await session.register();
  });

  it('adds movie to watchlist', async () => {
    const res = await session.auth<{ success: boolean; watchlistId: string }>('/watchlist', {
      method: 'POST',
      body: JSON.stringify({
        movieId: movie.id,
        movieData: movie,
        priority: 1,
        notes: 'Must watch',
        tags: ['sci-fi', 'test'],
      }),
    });
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.watchlistId).toBeTruthy();
  });

  it('lists watchlist with added movie', async () => {
    const res = await session.auth<{ items: Array<{ movieId: string }>; totalCount: number }>(
      '/watchlist'
    );
    expect(res.status).toBe(200);
    expect(res.data.totalCount).toBeGreaterThanOrEqual(1);
    expect(
      res.data.items.some(
        (i: { movie_id?: string; movieId?: string }) =>
          String(i.movie_id ?? i.movieId) === movie.id
      )
    ).toBe(true);
  });

  it('updates watchlist item', async () => {
    const res = await session.auth<{ success: boolean }>(`/watchlist/${movie.id}`, {
      method: 'PUT',
      body: JSON.stringify({ priority: 2, notes: 'Updated note' }),
    });
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });

  it('rejects watchlist add without movieData', async () => {
    const res = await session.auth('/watchlist', {
      method: 'POST',
      body: JSON.stringify({ movieId: '999' }),
    });
    expect(res.status).toBe(400);
  });

  it('removes movie from watchlist', async () => {
    const res = await session.auth<{ success: boolean }>(`/watchlist/${movie.id}`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });
});

describe('protected API — feedback & taste profile', () => {
  const session = new TestSession();
  const movieId = '27205';

  beforeAll(async () => {
    await session.register();
  });

  it('submits like feedback', async () => {
    const res = await session.auth<{ success: boolean; tasteProfileUpdated: boolean }>(
      '/feedback',
      {
        method: 'POST',
        body: JSON.stringify({
          movieId,
          feedbackType: 'like',
          rating: 9,
          movieData: sampleMovie(),
        }),
      }
    );
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });

  it('gets feedback for movie', async () => {
    const res = await session.auth<{ feedback: { feedback_type: string } | null }>(
      `/feedback/${movieId}`
    );
    expect(res.status).toBe(200);
    expect(res.data.feedback).toBeTruthy();
  });

  it('updates feedback to love', async () => {
    const res = await session.auth('/feedback', {
      method: 'POST',
      body: JSON.stringify({ movieId, feedbackType: 'love', movieData: sampleMovie() }),
    });
    expect(res.status).toBe(200);
  });

  it('rejects feedback without movieId', async () => {
    const res = await session.auth('/feedback', {
      method: 'POST',
      body: JSON.stringify({ feedbackType: 'like' }),
    });
    expect(res.status).toBe(400);
  });

  it('gets taste profile', async () => {
    const res = await session.auth<{ profile: unknown; summary: { topGenres: unknown[] } }>(
      '/taste-profile'
    );
    expect(res.status).toBe(200);
    expect(res.data.summary).toBeTruthy();
  });
});

describe('protected API — watch history', () => {
  const session = new TestSession();

  beforeAll(async () => {
    await session.register();
  });

  it('adds to watch history', async () => {
    const res = await session.auth<{ success: boolean; historyId: string }>('/watch-history', {
      method: 'POST',
      body: JSON.stringify({ movieId: '603', movieData: sampleMovie({ id: '603', title: 'The Matrix' }) }),
    });
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });

  it('lists watch history', async () => {
    const res = await session.auth<{ items: unknown[]; totalCount: number }>(
      '/watch-history?limit=10'
    );
    expect(res.status).toBe(200);
    expect(res.data.totalCount).toBeGreaterThanOrEqual(1);
  });
});

describe('protected API — reviews', () => {
  const session = new TestSession();
  const movieId = '155';
  let reviewId: string;

  beforeAll(async () => {
    await session.register();
  });

  it('creates a review', async () => {
    const res = await session.auth<{ success: boolean; reviewId: string }>('/reviews', {
      method: 'POST',
      body: JSON.stringify({
        movieId,
        movieData: sampleMovie({ id: movieId, title: 'The Dark Knight' }),
        rating: 9,
        title: 'Great film',
        content: 'Automated test review — excellent movie.',
        containsSpoilers: false,
        isPublic: true,
      }),
    });
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
    reviewId = res.data.reviewId;
  });

  it('lists reviews for movie', async () => {
    const res = await session.auth<{ reviews: unknown[]; totalCount: number }>(
      `/reviews/movie/${movieId}`
    );
    expect(res.status).toBe(200);
    expect(res.data.totalCount).toBeGreaterThanOrEqual(1);
  });

  it('lists user reviews', async () => {
    const res = await session.auth<{ reviews: unknown[] }>('/reviews/user');
    expect(res.status).toBe(200);
    expect(res.data.reviews.length).toBeGreaterThanOrEqual(1);
  });

  it('votes review helpful', async () => {
    const res = await session.auth<{ success: boolean; helpfulCount: number }>(
      `/reviews/${reviewId}/vote`,
      {
        method: 'POST',
        body: JSON.stringify({ isHelpful: true }),
      }
    );
    expect(res.status).toBe(200);
    expect(res.data.success).toBe(true);
  });
});

describe('protected API — shared lists', () => {
  const session = new TestSession();
  let shareCode: string;

  beforeAll(async () => {
    await session.register();
  });

  it('creates a shared list', async () => {
    const res = await session.auth<{ success: boolean; shareCode: string; shareUrl: string }>(
      '/shared-lists',
      {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test List',
          description: 'Automated test',
          movies: [sampleMovie()],
          isPublic: true,
        }),
      }
    );
    expect(res.status).toBe(200);
    expect(res.data.shareCode).toBeTruthy();
    shareCode = res.data.shareCode;
  });

  it('reads shared list without auth (public)', async () => {
    const res = await api<{ list: { title: string; movies: unknown[] } }>(
      `/shared-lists/${shareCode}`
    );
    expect(res.status).toBe(200);
    expect(res.data.list.title).toBe('Test List');
  });

  it('lists my shared lists', async () => {
    const res = await session.auth<{ lists: unknown[] }>('/my-shared-lists');
    expect(res.status).toBe(200);
    expect(res.data.lists.length).toBeGreaterThanOrEqual(1);
  });
});

describe('protected API — collection save', () => {
  const session = new TestSession();

  beforeAll(async () => {
    await session.register();
  });

  it('saves and unsaves a collection', async () => {
    const list = await api<{ collections: Array<{ collection_id: string }> }>('/collections');
    const id = list.data.collections[0].collection_id;

    const save = await session.auth<{ success: boolean; saved: boolean }>(
      `/collections/${id}/save`,
      { method: 'POST', body: JSON.stringify({ save: true }) }
    );
    expect(save.status).toBe(200);
    expect(save.data.saved).toBe(true);

    const unsave = await session.auth<{ saved: boolean }>(`/collections/${id}/save`, {
      method: 'POST',
      body: JSON.stringify({ save: false }),
    });
    expect(unsave.data.saved).toBe(false);
  });
});

describe('protected API — user isolation', () => {
  it('users cannot see each other watchlists', async () => {
    const userA = new TestSession();
    const userB = new TestSession();
    await userA.register();
    await userB.register();

    const movie = sampleMovie({ id: '999001', title: 'Isolation Test Film' });
    await userA.auth('/watchlist', {
      method: 'POST',
      body: JSON.stringify({ movieId: movie.id, movieData: movie }),
    });

    const listB = await userB.auth<{ items: Array<{ movieId: string }> }>('/watchlist');
    expect(
      listB.data.items.some(
        (i: { movie_id?: string; movieId?: string }) =>
          String(i.movie_id ?? i.movieId) === movie.id
      )
    ).toBe(false);
  });
});
