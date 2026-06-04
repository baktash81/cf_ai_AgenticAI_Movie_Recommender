import type { MovieBrowseParams } from '../../../types';
import type { BrowseFilterState } from './types';

export interface BrowseParamsResult {
  params: MovieBrowseParams;
  warnings: string[];
}

export function buildBrowseParams(
  filters: BrowseFilterState,
  page: number,
  limit = 24
): BrowseParamsResult {
  const warnings: string[] = [];
  const hasTitleSearch = filters.q.trim().length > 0;
  const hasActor = filters.actor.trim().length > 0;
  const hasDirector = filters.director.trim().length > 0;

  if (hasActor && hasDirector) {
    warnings.push('Actor and director filters cannot be combined — actor search is used first.');
  }

  let year: number | undefined;
  let yearFrom: string | undefined;
  let yearTo: string | undefined;

  if (filters.yearMode === 'exact' && filters.year) {
    year = parseInt(filters.year, 10);
  } else if (filters.yearMode === 'range') {
    yearFrom = filters.yearFrom || undefined;
    yearTo = filters.yearTo || undefined;
  } else if (filters.yearMode === 'decade' && filters.decade) {
    const start = parseInt(filters.decade, 10);
    if (!Number.isNaN(start)) {
      yearFrom = String(start);
      yearTo = String(start + 9);
    }
  }

  let runtimeMin = filters.runtimeMin ? parseInt(filters.runtimeMin, 10) : undefined;
  let runtimeMax = filters.runtimeMax ? parseInt(filters.runtimeMax, 10) : undefined;

  if (filters.runtimePreset === 'short') {
    runtimeMin = undefined;
    runtimeMax = 90;
  } else if (filters.runtimePreset === 'standard') {
    runtimeMin = 90;
    runtimeMax = 150;
  } else if (filters.runtimePreset === 'long') {
    runtimeMin = 150;
    runtimeMax = undefined;
  } else if (filters.runtimePreset === 'epic') {
    runtimeMin = 150;
    runtimeMax = undefined;
  }

  if (hasTitleSearch && filters.includeGenres.length > 0) {
    warnings.push('Title search ignores genre filters — clear the search box to filter by genre.');
  }

  const params: MovieBrowseParams = {
    q: hasTitleSearch ? filters.q.trim() : undefined,
    genres: !hasTitleSearch && filters.includeGenres.length ? filters.includeGenres.join(',') : undefined,
    excludeGenres: filters.excludeGenres.length ? filters.excludeGenres.join(',') : undefined,
    genreMatch: filters.genreMatch,
    year,
    yearFrom,
    yearTo,
    minRating: filters.minRating ? parseFloat(filters.minRating) : undefined,
    maxRating: filters.maxRating ? parseFloat(filters.maxRating) : undefined,
    // maxRating only on discover path
    minVotes: filters.minVotes ? parseInt(filters.minVotes, 10) : undefined,
    language: filters.language || undefined,
    runtimeMin,
    runtimeMax,
    actor: hasActor ? filters.actor.trim() : undefined,
    director: !hasActor && hasDirector ? filters.director.trim() : undefined,
    sortBy: hasTitleSearch ? undefined : filters.sortBy,
    sortOrder: filters.sortOrder,
    page,
    limit,
  };

  return { params, warnings };
}

export function countActiveFilters(filters: BrowseFilterState): number {
  let n = 0;
  if (filters.q.trim()) n++;
  if (filters.includeGenres.length) n++;
  if (filters.excludeGenres.length) n++;
  if (filters.yearMode !== 'any') n++;
  if (filters.minRating || filters.maxRating) n++;
  if (filters.minVotes) n++;
  if (filters.language) n++;
  if (filters.runtimePreset || filters.runtimeMin || filters.runtimeMax) n++;
  if (filters.actor.trim()) n++;
  if (filters.director.trim()) n++;
  return n;
}

export function getActiveFilterChips(filters: BrowseFilterState): Array<{ id: string; label: string; clear: Partial<BrowseFilterState> }> {
  const chips: Array<{ id: string; label: string; clear: Partial<BrowseFilterState> }> = [];

  if (filters.q.trim()) {
    chips.push({ id: 'q', label: `“${filters.q.trim()}”`, clear: { q: '' } });
  }
  filters.includeGenres.forEach((g) => {
    chips.push({
      id: `inc-${g}`,
      label: g,
      clear: { includeGenres: filters.includeGenres.filter((x) => x !== g) },
    });
  });
  filters.excludeGenres.forEach((g) => {
    chips.push({
      id: `exc-${g}`,
      label: `Not ${g}`,
      clear: { excludeGenres: filters.excludeGenres.filter((x) => x !== g) },
    });
  });
  if (filters.yearMode === 'exact' && filters.year) {
    chips.push({ id: 'year', label: `Year ${filters.year}`, clear: { yearMode: 'any', year: '' } });
  }
  if (filters.yearMode === 'range' && (filters.yearFrom || filters.yearTo)) {
    chips.push({
      id: 'range',
      label: `${filters.yearFrom || '…'}–${filters.yearTo || '…'}`,
      clear: { yearMode: 'any', yearFrom: '', yearTo: '' },
    });
  }
  if (filters.yearMode === 'decade' && filters.decade) {
    chips.push({
      id: 'decade',
      label: `${filters.decade}s`,
      clear: { yearMode: 'any', decade: '' },
    });
  }
  if (filters.minRating) {
    chips.push({ id: 'minR', label: `Rating ≥ ${filters.minRating}`, clear: { minRating: '' } });
  }
  if (filters.maxRating) {
    chips.push({ id: 'maxR', label: `Rating ≤ ${filters.maxRating}`, clear: { maxRating: '' } });
  }
  if (filters.minVotes) {
    chips.push({ id: 'votes', label: `≥ ${filters.minVotes} votes`, clear: { minVotes: '' } });
  }
  if (filters.language) {
    chips.push({ id: 'lang', label: filters.language.toUpperCase(), clear: { language: '' } });
  }
  if (filters.runtimePreset) {
    const labels = { short: 'Under 90m', standard: '90–150m', long: '150m+', epic: 'Epic 150m+' };
    chips.push({ id: 'rt', label: labels[filters.runtimePreset], clear: { runtimePreset: '', runtimeMin: '', runtimeMax: '' } });
  } else if (filters.runtimeMin || filters.runtimeMax) {
    chips.push({
      id: 'rt-custom',
      label: `${filters.runtimeMin || '0'}–${filters.runtimeMax || '∞'} min`,
      clear: { runtimeMin: '', runtimeMax: '' },
    });
  }
  if (filters.actor.trim()) {
    chips.push({ id: 'actor', label: `Actor: ${filters.actor}`, clear: { actor: '' } });
  }
  if (filters.director.trim()) {
    chips.push({ id: 'dir', label: `Director: ${filters.director}`, clear: { director: '' } });
  }

  return chips;
}
