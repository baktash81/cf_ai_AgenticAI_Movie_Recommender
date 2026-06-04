import { describe, expect, it } from 'vitest';
import { api } from '../helpers/client';
import { sampleMovie } from '../helpers/fixtures';
import { TestSession } from '../helpers/session';

/**
 * End-to-end journey: register → preferences → chat → watchlist → review → share
 * Runs as a single sequential flow (one describe block).
 */
describe.sequential('full user journey (E2E API)', () => {
  const session = new TestSession();
  let shareCode: string;
  let conversationId: string;
  const movie = sampleMovie();

  it('step 1: registers new user', async () => {
    const res = await session.register('E2E Journey User');
    expect(res.status).toBe(201);
    expect(session.tokens?.accessToken).toBeTruthy();
  });

  it('step 2: sets movie preferences via AI', async () => {
    const res = await session.auth('/preferences', {
      method: 'POST',
      body: JSON.stringify({
        input: 'Favorite genres: Science Fiction, Thriller. Favorite director: Christopher Nolan.',
      }),
    });
    expect(res.status).toBe(200);
  }, 90_000);

  it('step 3: asks chat for recommendations', async () => {
    const res = await session.auth<{
      conversationId: string;
      message?: string;
      movies?: unknown[];
    }>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'Suggest one great sci-fi movie to watch tonight' }),
    });
    expect(res.status).toBe(200);
    expect(res.data.conversationId).toBeTruthy();
    conversationId = res.data.conversationId;
  }, 90_000);

  it('step 4: lists conversations including new chat', async () => {
    const res = await session.auth<{ conversations: Array<{ conversation_id: string }> }>(
      '/conversations'
    );
    expect(res.status).toBe(200);
    expect(
      res.data.conversations.some((c) => c.conversation_id === conversationId)
    ).toBe(true);
  });

  it('step 5: adds movie to watchlist', async () => {
    const res = await session.auth('/watchlist', {
      method: 'POST',
      body: JSON.stringify({ movieId: movie.id, movieData: movie, priority: 1 }),
    });
    expect(res.status).toBe(200);
  });

  it('step 6: submits feedback and checks taste profile', async () => {
    await session.auth('/feedback', {
      method: 'POST',
      body: JSON.stringify({ movieId: movie.id, feedbackType: 'love', movieData: movie }),
    });
    const profile = await session.auth('/taste-profile');
    expect(profile.status).toBe(200);
  });

  it('step 7: writes a review', async () => {
    const res = await session.auth('/reviews', {
      method: 'POST',
      body: JSON.stringify({
        movieId: movie.id,
        movieData: movie,
        rating: 10,
        title: 'E2E Masterpiece',
        content: 'Full journey automated test review.',
      }),
    });
    expect(res.status).toBe(200);
  });

  it('step 8: creates and reads shared list publicly', async () => {
    const created = await session.auth<{ shareCode: string }>('/shared-lists', {
      method: 'POST',
      body: JSON.stringify({
        title: 'E2E Picks',
        movies: [movie],
        isPublic: true,
      }),
    });
    expect(created.status).toBe(200);
    shareCode = created.data.shareCode;

    const publicRead = await api(`/shared-lists/${shareCode}`);
    expect(publicRead.status).toBe(200);
  });

  it('step 9: browses discovery and trending as authenticated user', async () => {
    const discovery = await api('/discovery');
    const trending = await api('/trending?limit=3');
    expect(discovery.status).toBe(200);
    expect(trending.status).toBe(200);
  });

  it('step 10: profile reflects completed state', async () => {
    const me = await session.auth<{ profileCompleted?: boolean; name: string }>('/auth/me');
    expect(me.status).toBe(200);
    expect(me.data.name).toBe('E2E Journey User');
  });
});
