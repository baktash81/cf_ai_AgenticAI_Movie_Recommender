import type { BrowseFilterState } from './types';
import { DEFAULT_BROWSE_FILTERS } from './types';

export interface FilterPreset {
  id: string;
  label: string;
  description: string;
  icon: string;
  patch: Partial<BrowseFilterState>;
}

export const QUICK_PRESETS: FilterPreset[] = [
  {
    id: 'top-rated',
    label: 'Top rated',
    description: '8+ with 500+ votes',
    icon: '⭐',
    patch: { minRating: '8', minVotes: '500', sortBy: 'rating', sortOrder: 'desc', yearMode: 'any' },
  },
  {
    id: 'hidden-gems',
    label: 'Hidden gems',
    description: 'High rating, fewer votes',
    icon: '💎',
    patch: { minRating: '7.5', minVotes: '50', maxRating: '', sortBy: 'rating', sortOrder: 'desc' },
  },
  {
    id: 'new-releases',
    label: 'Recent',
    description: 'Last 3 years',
    icon: '🆕',
    patch: {
      yearMode: 'range',
      yearFrom: String(new Date().getFullYear() - 2),
      yearTo: String(new Date().getFullYear()),
      sortBy: 'release_date',
      sortOrder: 'desc',
    },
  },
  {
    id: 'short-films',
    label: 'Under 2h',
    description: 'Quick watches',
    icon: '⏱️',
    patch: { runtimePreset: 'short', runtimeMin: '', runtimeMax: '' },
  },
  {
    id: 'classics',
    label: 'Classics',
    description: 'Before 2000',
    icon: '🎬',
    patch: { yearMode: 'range', yearFrom: '1950', yearTo: '1999', minRating: '7', sortBy: 'rating', sortOrder: 'desc' },
  },
  {
    id: 'blockbusters',
    label: 'Blockbusters',
    description: 'Big box office',
    icon: '🍿',
    patch: { sortBy: 'revenue', sortOrder: 'desc', minVotes: '200' },
  },
];

export const DECADE_OPTIONS = ['2020', '2010', '2000', '1990', '1980', '1970', '1960'];

export const LANGUAGE_OPTIONS = [
  { code: '', label: 'Any language' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'hi', label: 'Hindi' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'it', label: 'Italian' },
  { code: 'zh', label: 'Chinese' },
];

export const GENRE_GROUPS: Array<{ label: string; genres: string[] }> = [
  { label: 'Action & thrill', genres: ['Action', 'Adventure', 'Thriller', 'Crime'] },
  { label: 'Drama & romance', genres: ['Drama', 'Romance', 'History'] },
  { label: 'Laughs & family', genres: ['Comedy', 'Family', 'Animation'] },
  { label: 'Sci-fi & fantasy', genres: ['Science Fiction', 'Fantasy', 'Mystery'] },
  { label: 'Fear & edge', genres: ['Horror', 'War', 'Western'] },
  { label: 'Other', genres: ['Documentary', 'Music', 'TV Movie'] },
];

export function applyPreset(base: BrowseFilterState, preset: FilterPreset): BrowseFilterState {
  return { ...DEFAULT_BROWSE_FILTERS, ...preset.patch, q: base.q };
}
