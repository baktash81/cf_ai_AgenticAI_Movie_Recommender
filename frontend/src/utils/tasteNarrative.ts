import type { TasteProfileSummary } from '../types';

export interface FeedbackBreakdown {
  love: number;
  like: number;
  dislike: number;
  not_interested: number;
  total: number;
}

export function buildTasteNarrative(
  summary: TasteProfileSummary,
  breakdown: FeedbackBreakdown
): string {
  if (summary.totalMoviesRated === 0) {
    return 'Rate movies on Discover or in chat to build your taste profile. We will learn your favorite genres, actors, and eras over time.';
  }

  const parts: string[] = [];

  if (summary.topGenres.length > 0) {
    const genres = summary.topGenres.slice(0, 3).map((g) => g.name);
    parts.push(`You gravitate toward ${genres.join(', ')}`);
  }

  if (summary.topDirectors.length > 0) {
    parts.push(`directors like ${summary.topDirectors[0].name}`);
  } else if (summary.topActors.length > 0) {
    parts.push(`actors like ${summary.topActors[0].name}`);
  }

  if (summary.preferredDecades.length > 0) {
    parts.push(`especially films from the ${summary.preferredDecades[0].name}`);
  }

  let sentence = parts.length > 0 ? `${parts.join(', ')}.` : 'Your taste is still taking shape.';

  if (summary.avgRatingPreference > 0) {
    sentence += ` You tend to prefer titles rated ${summary.avgRatingPreference.toFixed(1)} or higher on TMDB.`;
  }

  if (breakdown.love > 0 || breakdown.like > 0) {
    const positive = breakdown.love + breakdown.like;
    sentence += ` So far you have reacted positively to ${positive} movie${positive === 1 ? '' : 's'}`;
    if (breakdown.love > 0) {
      sentence += ` (${breakdown.love} loved`;
      if (breakdown.like > 0) sentence += `, ${breakdown.like} liked`;
      sentence += ')';
    }
    sentence += '.';
  }

  return sentence;
}

export function formatLastSynced(lastSyncedAt: string | null): string | null {
  if (!lastSyncedAt) return null;
  try {
    const date = new Date(lastSyncedAt);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}
