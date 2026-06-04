import { describe, expect, it } from 'vitest';
import {
  getSeasonalCriteria,
  parseCollectionCriteria,
  formatCollectionForApi,
} from '../../src/utils/collection-hydrate';

describe('collection-hydrate', () => {
  it('returns TMDB criteria for seasonal collections without stored criteria', () => {
    const criteria = getSeasonalCriteria('halloween');
    expect(criteria).toMatchObject({
      genres: ['Horror', 'Thriller'],
      sortBy: 'popularity',
    });
  });

  it('falls back to seasonal criteria when row has no criteria JSON', () => {
    const criteria = parseCollectionCriteria({
      collection_id: 'seasonal-christmas',
      title: 'Holiday',
      collection_type: 'seasonal',
      season: 'christmas',
      movies: '[]',
    });
    expect(criteria?.genres).toContain('Family');
  });

  it('formats API payload with preview posters and count', () => {
    const formatted = formatCollectionForApi(
      {
        collection_id: 'genre-action',
        title: 'Action',
        collection_type: 'genre',
        movies: '[]',
      },
      [
        {
          id: '1',
          title: 'Test',
          posterUrl: 'https://example.com/p1.jpg',
          backdropUrl: 'https://example.com/b1.jpg',
        },
      ]
    );
    expect(formatted.movieCount).toBe(1);
    expect(formatted.previewPosters).toEqual(['https://example.com/p1.jpg']);
    expect(formatted.coverUrl).toBe('https://example.com/b1.jpg');
  });
});
