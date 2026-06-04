/** Collect TMDB ids from all assistant messages that included movies in this conversation */
export function collectShownMovieIds(
  historyRows: Array<{ movies_data?: string | null }>
): string[] {
  const ids = new Set<string>();
  for (const row of historyRows) {
    if (!row.movies_data) continue;
    try {
      const movies = JSON.parse(row.movies_data) as Array<{ id?: string }>;
      for (const m of movies) {
        if (m?.id) ids.add(String(m.id));
      }
    } catch {
      /* ignore parse errors */
    }
  }
  return Array.from(ids);
}

export function getLatestMoviesFromHistory(
  historyRows: Array<{ movies_data?: string | null }>
): Array<{ id: string; title: string; releaseDate?: string; rating?: number; genres?: string[]; actors?: string[]; director?: string }> | null {
  for (const row of historyRows) {
    if (!row.movies_data) continue;
    try {
      return JSON.parse(row.movies_data);
    } catch {
      continue;
    }
  }
  return null;
}

export function normalizeSuggestedFollowUps(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map((s) => s.trim())
    .slice(0, 4);
}

export function attachExcludeIds(
  criteria: Record<string, unknown>,
  shownIds: string[],
  llmExclude?: string[]
): Record<string, unknown> {
  const merged = new Set<string>([...(llmExclude || []), ...shownIds]);
  if (merged.size === 0) return criteria;
  return {
    ...criteria,
    excludeMovieIds: Array.from(merged).slice(0, 40),
  };
}

/** How many movies to return from TMDB search (default 20) */
export function inferResultLimit(userMessage: string, criteriaLimit?: unknown): number {
  if (typeof criteriaLimit === 'number' && criteriaLimit >= 1 && criteriaLimit <= 40) {
    return Math.round(criteriaLimit);
  }

  const t = userMessage.toLowerCase().trim();

  const explicitCount = t.match(/\b(\d{1,2})\s+(movies?|films?)\b/);
  if (explicitCount) {
    return Math.min(Math.max(parseInt(explicitCount[1], 10), 1), 40);
  }

  if (
    /\b(just |only )?(one|1)\s+(movie|film)\b/.test(t) ||
    /\b(just |only )?(one|1)\s+[\w-]+\s+(movie|film)\b/.test(t) ||
    /\b(a|an)\s+[\w-]+\s+(movie|film)\b/.test(t) ||
    /\b(give|recommend|show|suggest|pick|choose)\s+(me\s+)?(just\s+)?(one|a|an)\b/.test(t) ||
    /\bsingle\s+(movie|film|pick|recommendation)\b/.test(t)
  ) {
    return 1;
  }

  // Singular "movie" / "film" without plural list wording
  const wantsPlural =
    /\bmovies\b|\bfilms\b|\blist\b|\bseveral\b|\bsome\b|\bfew\b|\bmultiple\b|\ball\b/i.test(t);
  if (!wantsPlural && /\b(movie|film)\b/.test(t)) {
    return 1;
  }

  if (/\b(two|2|couple)\s+(of\s+)?(movies?|films?)\b/.test(t)) return 2;
  if (/\b(three|3)\s+(movies?|films?)\b/.test(t)) return 3;
  if (/\b(few|several)\s+(movies?|films?)\b/.test(t)) return 5;

  return 20;
}

export function applyResultLimitToCriteria(
  criteria: Record<string, unknown>,
  userMessage: string
): Record<string, unknown> {
  const limit = inferResultLimit(userMessage, criteria.limit);
  return { ...criteria, limit };
}
