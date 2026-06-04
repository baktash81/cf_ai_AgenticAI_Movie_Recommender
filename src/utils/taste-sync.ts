import type { MoviePreferences } from '../types/movie-preferences';
import type { Env } from '../types/movie-agent-state';

/** Minimum hours between automatic taste → preferences sync */
export const TASTE_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** Minimum movie feedback count before taste can influence preferences */
export const MIN_FEEDBACK_FOR_SYNC = 2;

export interface TasteProfileRow {
  genre_scores: string;
  actor_scores: string;
  director_scores: string;
  decade_scores: string;
  avg_rating_preference: number;
  total_feedback_count: number;
  profile_strength: number;
  last_computed_at: string;
}

export interface FeedbackBreakdown {
  love: number;
  like: number;
  dislike: number;
  not_interested: number;
  total: number;
}

export interface TasteSummary {
  topGenres: Array<{ name: string; score: number }>;
  topActors: Array<{ name: string; score: number }>;
  topDirectors: Array<{ name: string; score: number }>;
  preferredDecades: Array<{ name: string; score: number }>;
  avgRatingPreference: number;
  profileStrength: number;
  totalMoviesRated: number;
}

export interface SyncResult {
  synced: boolean;
  preferences: MoviePreferences | null;
  summary: TasteSummary;
  feedbackBreakdown: FeedbackBreakdown;
  lastSyncedAt: string | null;
}

function parseScores(json: string): Record<string, number> {
  try {
    return JSON.parse(json || '{}');
  } catch {
    return {};
  }
}

function topEntries(
  scores: Record<string, number>,
  minScore: number,
  limit: number
): Array<{ name: string; score: number }> {
  return Object.entries(scores)
    .filter(([, score]) => score >= minScore)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, score]) => ({ name, score }));
}

function lowEntryNames(scores: Record<string, number>, maxScore: number, limit: number): string[] {
  return Object.entries(scores)
    .filter(([, score]) => score <= maxScore)
    .sort((a, b) => a[1] - b[1])
    .slice(0, limit)
    .map(([name]) => name);
}

function mergeUnique(existing: string[], added: string[], cap: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of [...existing, ...added]) {
    const key = item.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(key);
    if (result.length >= cap) break;
  }
  return result;
}

export function buildTasteSummary(profile: TasteProfileRow | null): TasteSummary {
  if (!profile) {
    return {
      topGenres: [],
      topActors: [],
      topDirectors: [],
      preferredDecades: [],
      avgRatingPreference: 7.0,
      profileStrength: 0,
      totalMoviesRated: 0,
    };
  }

  const genreScores = parseScores(profile.genre_scores);
  const actorScores = parseScores(profile.actor_scores);
  const directorScores = parseScores(profile.director_scores);
  const decadeScores = parseScores(profile.decade_scores);

  return {
    topGenres: topEntries(genreScores, 0.52, 5),
    topActors: topEntries(actorScores, 0.52, 5),
    topDirectors: topEntries(directorScores, 0.52, 3),
    preferredDecades: topEntries(decadeScores, 0.52, 3),
    avgRatingPreference: profile.avg_rating_preference || 7.0,
    profileStrength: profile.profile_strength || 0,
    totalMoviesRated: profile.total_feedback_count || 0,
  };
}

export function mergeTasteIntoPreferences(
  existing: MoviePreferences | null,
  profile: TasteProfileRow
): MoviePreferences {
  const base: MoviePreferences = existing || {
    favoriteGenres: [],
    dislikedGenres: [],
    favoriteActors: [],
    favoriteDirectors: [],
    preferredLanguages: ['en'],
    minRating: 0,
    preferredDecades: [],
    avoidAdultContent: true,
    preferenceStyle: 'balanced',
  };

  const genreScores = parseScores(profile.genre_scores);
  const actorScores = parseScores(profile.actor_scores);
  const directorScores = parseScores(profile.director_scores);
  const decadeScores = parseScores(profile.decade_scores);

  const tasteFavoriteGenres = topEntries(genreScores, 0.55, 6).map((g) => g.name);
  const tasteDislikedGenres = lowEntryNames(genreScores, 0.38, 4).filter(
    (g) => !tasteFavoriteGenres.includes(g)
  );

  const merged: MoviePreferences = {
    ...base,
    favoriteGenres: mergeUnique(base.favoriteGenres, tasteFavoriteGenres, 10),
    dislikedGenres: mergeUnique(base.dislikedGenres, tasteDislikedGenres, 8),
    favoriteActors: mergeUnique(base.favoriteActors, topEntries(actorScores, 0.55, 6).map((a) => a.name), 10),
    favoriteDirectors: mergeUnique(
      base.favoriteDirectors,
      topEntries(directorScores, 0.55, 4).map((d) => d.name),
      8
    ),
    preferredDecades: mergeUnique(
      base.preferredDecades || [],
      topEntries(decadeScores, 0.55, 4).map((d) => d.name),
      6
    ),
    minRating: Math.max(
      base.minRating || 0,
      profile.avg_rating_preference > 0 ? Math.round(profile.avg_rating_preference * 10) / 10 : 0
    ),
    lastUpdated: Date.now(),
    tasteSyncedAt: new Date().toISOString(),
    tasteProfileComputedAt: profile.last_computed_at,
    tasteDerived: true,
  };

  return merged;
}

export function shouldSyncTasteToPreferences(
  preferences: MoviePreferences | null,
  profile: TasteProfileRow | null
): boolean {
  if (!profile || (profile.total_feedback_count || 0) < MIN_FEEDBACK_FOR_SYNC) {
    return false;
  }

  const syncedAt = preferences?.tasteSyncedAt
    ? new Date(preferences.tasteSyncedAt).getTime()
    : 0;
  const tasteComputedAt = profile.last_computed_at
    ? new Date(profile.last_computed_at).getTime()
    : 0;
  const now = Date.now();

  if (!syncedAt) return true;
  if (tasteComputedAt > syncedAt) return true;
  if (now - syncedAt >= TASTE_SYNC_INTERVAL_MS) return true;

  return false;
}

export async function fetchFeedbackBreakdown(
  env: Env,
  userId: string
): Promise<FeedbackBreakdown> {
  const rows = await env.MOVIE_DB.prepare(`
    SELECT feedback_type, COUNT(*) as count
    FROM movie_feedback
    WHERE user_id = ?
    GROUP BY feedback_type
  `)
    .bind(userId)
    .all<{ feedback_type: string; count: number }>();

  const breakdown: FeedbackBreakdown = {
    love: 0,
    like: 0,
    dislike: 0,
    not_interested: 0,
    total: 0,
  };

  for (const row of rows.results || []) {
    const type = row.feedback_type as keyof Omit<FeedbackBreakdown, 'total'>;
    if (type in breakdown && type !== 'total') {
      breakdown[type] = row.count;
      breakdown.total += row.count;
    }
  }

  return breakdown;
}

export async function storeUserPreferences(
  env: Env,
  userId: string,
  preferences: MoviePreferences
): Promise<void> {
  await env.MOVIE_DB.prepare(`
    INSERT INTO user_movie_preferences (user_id, preferences, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      preferences = excluded.preferences,
      updated_at = datetime('now')
  `)
    .bind(userId, JSON.stringify(preferences))
    .run();
}

export async function loadTasteProfile(
  env: Env,
  userId: string
): Promise<TasteProfileRow | null> {
  const row = await env.MOVIE_DB.prepare(`
    SELECT * FROM user_taste_profiles WHERE user_id = ?
  `)
    .bind(userId)
    .first();

  return row as TasteProfileRow | null;
}

export async function loadUserPreferences(
  env: Env,
  userId: string
): Promise<MoviePreferences | null> {
  const row = await env.MOVIE_DB.prepare(`
    SELECT preferences FROM user_movie_preferences WHERE user_id = ?
  `)
    .bind(userId)
    .first<{ preferences: string }>();

  if (!row?.preferences) return null;
  try {
    return JSON.parse(row.preferences) as MoviePreferences;
  } catch {
    return null;
  }
}

/** Sync taste profile scores into user_movie_preferences when due. */
export async function maybeSyncTasteToPreferences(
  env: Env,
  userId: string,
  force = false
): Promise<{ synced: boolean; preferences: MoviePreferences | null }> {
  const profile = await loadTasteProfile(env, userId);
  const existing = await loadUserPreferences(env, userId);

  if (!profile || (profile.total_feedback_count || 0) < MIN_FEEDBACK_FOR_SYNC) {
    return { synced: false, preferences: existing };
  }

  if (!force && !shouldSyncTasteToPreferences(existing, profile)) {
    return { synced: false, preferences: existing };
  }

  const merged = mergeTasteIntoPreferences(existing, profile);
  await storeUserPreferences(env, userId, merged);
  return { synced: true, preferences: merged };
}

export async function getTasteProfilePayload(
  env: Env,
  userId: string,
  options?: { sync?: boolean }
): Promise<SyncResult> {
  const doSync = options?.sync !== false;
  const syncResult = doSync
    ? await maybeSyncTasteToPreferences(env, userId)
    : { synced: false, preferences: await loadUserPreferences(env, userId) };

  const profile = await loadTasteProfile(env, userId);
  const summary = buildTasteSummary(profile);
  const feedbackBreakdown = await fetchFeedbackBreakdown(env, userId);
  const preferences = syncResult.preferences || (await loadUserPreferences(env, userId));

  return {
    synced: syncResult.synced,
    preferences,
    summary,
    feedbackBreakdown,
    lastSyncedAt: preferences?.tasteSyncedAt || null,
  };
}
