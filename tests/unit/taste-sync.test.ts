import { describe, it, expect } from 'vitest';
import {
  buildTasteSummary,
  mergeTasteIntoPreferences,
  shouldSyncTasteToPreferences,
  type TasteProfileRow,
} from '../../src/utils/taste-sync';
import type { MoviePreferences } from '../../src/types/movie-preferences';

const sampleProfile: TasteProfileRow = {
  genre_scores: JSON.stringify({ Action: 0.72, Horror: 0.32, 'Sci-Fi': 0.68 }),
  actor_scores: JSON.stringify({ 'Tom Hanks': 0.8 }),
  director_scores: JSON.stringify({ 'Christopher Nolan': 0.85 }),
  decade_scores: JSON.stringify({ '2010s': 0.7 }),
  avg_rating_preference: 7.5,
  total_feedback_count: 5,
  profile_strength: 0.1,
  last_computed_at: '2026-06-03T12:00:00Z',
};

describe('taste-sync', () => {
  it('buildTasteSummary returns top scored genres', () => {
    const summary = buildTasteSummary(sampleProfile);
    expect(summary.topGenres.map((g) => g.name)).toContain('Action');
    expect(summary.totalMoviesRated).toBe(5);
  });

  it('mergeTasteIntoPreferences adds taste genres without removing manual prefs', () => {
    const existing: MoviePreferences = {
      favoriteGenres: ['Comedy'],
      dislikedGenres: [],
      favoriteActors: [],
      favoriteDirectors: [],
      preferredLanguages: ['en'],
      minRating: 6,
      avoidAdultContent: true,
      preferenceStyle: 'balanced',
    };

    const merged = mergeTasteIntoPreferences(existing, sampleProfile);
    expect(merged.favoriteGenres).toContain('Comedy');
    expect(merged.favoriteGenres).toContain('Action');
    expect(merged.favoriteDirectors).toContain('Christopher Nolan');
    expect(merged.minRating).toBeGreaterThanOrEqual(7.5);
    expect(merged.tasteSyncedAt).toBeDefined();
    expect(merged.tasteDerived).toBe(true);
  });

  it('shouldSyncTasteToPreferences when never synced', () => {
    expect(shouldSyncTasteToPreferences(null, sampleProfile)).toBe(true);
  });

  it('shouldSyncTasteToPreferences when taste updated after sync', () => {
    const prefs: MoviePreferences = {
      favoriteGenres: [],
      dislikedGenres: [],
      favoriteActors: [],
      favoriteDirectors: [],
      preferredLanguages: ['en'],
      minRating: 0,
      avoidAdultContent: true,
      preferenceStyle: 'balanced',
      tasteSyncedAt: '2026-06-01T00:00:00Z',
    };
    expect(shouldSyncTasteToPreferences(prefs, sampleProfile)).toBe(true);
  });

  it('should not sync with insufficient feedback', () => {
    const weak = { ...sampleProfile, total_feedback_count: 1 };
    expect(shouldSyncTasteToPreferences(null, weak)).toBe(false);
  });
});
