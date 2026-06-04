import type { MovieBrowseParams } from '../../../types';

export type GenreMatchMode = 'any' | 'all';
export type YearMode = 'any' | 'exact' | 'range' | 'decade';

export interface BrowseFilterState {
  q: string;
  includeGenres: string[];
  excludeGenres: string[];
  genreMatch: GenreMatchMode;
  yearMode: YearMode;
  year: string;
  yearFrom: string;
  yearTo: string;
  decade: string;
  minRating: string;
  maxRating: string;
  minVotes: string;
  language: string;
  runtimeMin: string;
  runtimeMax: string;
  runtimePreset: '' | 'short' | 'standard' | 'long' | 'epic';
  actor: string;
  director: string;
  sortBy: MovieBrowseParams['sortBy'];
  sortOrder: 'asc' | 'desc';
}

export const DEFAULT_BROWSE_FILTERS: BrowseFilterState = {
  q: '',
  includeGenres: [],
  excludeGenres: [],
  genreMatch: 'any',
  yearMode: 'any',
  year: '',
  yearFrom: '',
  yearTo: '',
  decade: '',
  minRating: '',
  maxRating: '',
  minVotes: '',
  language: '',
  runtimeMin: '',
  runtimeMax: '',
  runtimePreset: '',
  actor: '',
  director: '',
  sortBy: 'popularity',
  sortOrder: 'desc',
};
