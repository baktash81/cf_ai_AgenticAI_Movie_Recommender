import { describe, expect, it } from 'vitest';
import { api } from '../helpers/client';

describe('public API — trending', () => {
  it('returns movies with default week window', async () => {
    const res = await api<{ movies: Array<{ id: string; title: string }>; timeWindow: string }>(
      '/trending?limit=5'
    );
    expect(res.status).toBe(200);
    expect(res.data.timeWindow).toBe('week');
    expect(res.data.movies.length).toBeGreaterThan(0);
    expect(res.data.movies[0]).toHaveProperty('title');
    expect(res.data.movies[0]).toHaveProperty('posterUrl');
  });

  it('supports day time window', async () => {
    const res = await api<{ movies: unknown[]; timeWindow: string }>('/trending?timeWindow=day&limit=3');
    expect(res.status).toBe(200);
    expect(res.data.timeWindow).toBe('day');
    expect(res.data.movies.length).toBeLessThanOrEqual(3);
  });

  it('respects limit parameter', async () => {
    const res = await api<{ movies: unknown[] }>('/trending?limit=2');
    expect(res.data.movies.length).toBeLessThanOrEqual(2);
  });
});

describe('public API — discovery', () => {
  it('returns discovery sections', async () => {
    const res = await api<{ sections: Array<{ id: string; title: string; items: unknown[] }> }>(
      '/discovery'
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.sections)).toBe(true);
    expect(res.data.sections.length).toBeGreaterThan(0);
    const trending = res.data.sections.find((s) => s.id === 'trending');
    expect(trending?.items?.length).toBeGreaterThan(0);
  });
});

describe('public API — collections', () => {
  it('lists curated and seasonal collections', async () => {
    const res = await api<{
      collections: Array<{ collection_id: string; title: string }>;
      seasonal: unknown[];
      saved: unknown[];
    }>('/collections');
    expect(res.status).toBe(200);
    expect(res.data.collections.length).toBeGreaterThan(0);
    expect(Array.isArray(res.data.seasonal)).toBe(true);
    expect(Array.isArray(res.data.saved)).toBe(true);
  });

  it('gets a specific collection by id', async () => {
    const list = await api<{ collections: Array<{ collection_id: string }> }>('/collections');
    const id = list.data.collections[0].collection_id;
    const res = await api<{ collection: { collection_id: string; title: string } }>(
      `/collections/${id}`
    );
    expect(res.status).toBe(200);
    expect(res.data.collection.collection_id).toBe(id);
  });
});

describe('public API — similar movies', () => {
  it('returns similar movies for Inception (27205)', async () => {
    const res = await api<{ sourceMovieId: string; similarMovies: Array<{ id: string }> }>(
      '/similar/27205'
    );
    expect(res.status).toBe(200);
    expect(res.data.sourceMovieId).toBe('27205');
    expect(res.data.similarMovies.length).toBeGreaterThan(0);
  });

  it('handles numeric movie id', async () => {
    const res = await api('/similar/603');
    expect(res.status).toBe(200);
  });
});

describe('public API — watch providers', () => {
  it('returns providers for a known movie', async () => {
    const res = await api<{ movieId: string; region: string; providers: unknown }>(
      '/watch-providers/27205?region=US'
    );
    expect(res.status).toBe(200);
    expect(res.data.movieId).toBeTruthy();
  });
});

describe('public API — person', () => {
  it('returns person details', async () => {
    const res = await api<{ person: { id: number; name: string }; movies: unknown[] }>(
      '/person/525'
    );
    expect(res.status).toBe(200);
    expect(res.data.person).toBeTruthy();
  });

  it('searches persons by query', async () => {
    const res = await api<{ results: Array<{ id: number; name: string }> }>(
      '/search/person?q=Nolan'
    );
    expect(res.status).toBe(200);
    expect(res.data.results.length).toBeGreaterThan(0);
  });
});

describe('public API — shared lists (public read)', () => {
  it('returns 404 for invalid share code', async () => {
    const res = await api('/shared-lists/INVALIDCODE000');
    expect([404, 400]).toContain(res.status);
  });
});
