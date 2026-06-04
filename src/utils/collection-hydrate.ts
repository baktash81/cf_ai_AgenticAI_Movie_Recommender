import type { Env } from '../types/movie-agent-state';
import type { MovieCriteria, MovieResult } from '../types/movie';
import { TMDBAPI } from '../tools/movie-apis/tmdb';

export interface CollectionRow {
  collection_id: string;
  title: string;
  description?: string;
  cover_image_url?: string;
  collection_type: string;
  criteria?: string | null;
  movies?: string;
  season?: string | null;
  display_order?: number;
  is_active?: boolean;
  [key: string]: unknown;
}

/** TMDB search criteria when seasonal rows have no stored criteria */
export function getSeasonalCriteria(season: string | null | undefined): MovieCriteria | null {
  if (!season) return null;
  const base = { limit: 12, sortBy: 'popularity' as const, sortOrder: 'desc' as const };
  switch (season) {
    case 'halloween':
      return { ...base, genres: ['Horror', 'Thriller'], minRating: 6.5, minVoteCount: 100 };
    case 'christmas':
      return { ...base, genres: ['Family', 'Comedy'], minRating: 6.5, minVoteCount: 200 };
    case 'summer':
      return { ...base, genres: ['Action', 'Adventure'], minRating: 7, minVoteCount: 300 };
    case 'valentine':
      return { ...base, genres: ['Romance', 'Comedy'], minRating: 6.5, minVoteCount: 100 };
    default:
      return { ...base, minRating: 7, minVoteCount: 100 };
  }
}

export function parseCollectionCriteria(collection: CollectionRow): MovieCriteria | null {
  if (collection.criteria) {
    try {
      const parsed = JSON.parse(collection.criteria);
      return { limit: 12, sortBy: 'popularity', sortOrder: 'desc', ...parsed };
    } catch {
      return null;
    }
  }
  if (collection.collection_type === 'seasonal') {
    return getSeasonalCriteria(collection.season ?? null);
  }
  return null;
}

export async function hydrateCollectionMovies(
  tmdb: TMDBAPI,
  collection: CollectionRow,
  options: { limit?: number; persist?: boolean; env?: Env } = {}
): Promise<MovieResult[]> {
  const limit = options.limit ?? 12;
  let movies: MovieResult[] = [];

  try {
    const stored = JSON.parse(collection.movies || '[]');
    if (Array.isArray(stored) && stored.length > 0) {
      return stored;
    }
  } catch {
    // ignore invalid JSON
  }

  const criteria = parseCollectionCriteria(collection);
  if (!criteria) {
    return [];
  }

  try {
    movies = await tmdb.searchMovies(
      { ...criteria, limit },
      { enrichDetails: false }
    );
  } catch (error) {
    console.error(`Hydrate failed for ${collection.collection_id}:`, error);
    return [];
  }

  if (options.persist && options.env && movies.length > 0) {
    try {
      await options.env.MOVIE_DB.prepare(`
        UPDATE curated_collections SET movies = ?, updated_at = datetime('now') WHERE collection_id = ?
      `)
        .bind(JSON.stringify(movies), collection.collection_id)
        .run();
    } catch (error) {
      console.error(`Cache persist failed for ${collection.collection_id}:`, error);
    }
  }

  return movies;
}

export async function hydrateCollectionsBatch(
  env: Env,
  tmdb: TMDBAPI,
  rows: CollectionRow[],
  batchSize = 4
): Promise<Map<string, MovieResult[]>> {
  const map = new Map<string, MovieResult[]>();

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (row) => {
        const movies = await hydrateCollectionMovies(tmdb, row, {
          limit: 12,
          persist: true,
          env,
        });
        return { id: row.collection_id, movies };
      })
    );
    for (const { id, movies } of results) {
      map.set(id, movies);
    }
  }

  return map;
}

export function formatCollectionForApi(
  row: CollectionRow,
  movies: MovieResult[],
  extras: { isSaved?: boolean; isCurrentSeason?: boolean } = {}
) {
  const coverUrl =
    row.cover_image_url ||
    movies.find((m) => m.backdropUrl)?.backdropUrl ||
    movies.find((m) => m.posterUrl)?.posterUrl;

  return {
    ...row,
    movies,
    movieCount: movies.length,
    previewPosters: movies.slice(0, 4).map((m) => m.posterUrl).filter(Boolean),
    coverUrl,
    criteria: row.criteria
      ? (() => {
          try {
            return JSON.parse(row.criteria as string);
          } catch {
            return null;
          }
        })()
      : null,
    isSaved: extras.isSaved ?? false,
    isCurrentSeason: extras.isCurrentSeason ?? false,
  };
}
