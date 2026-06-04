import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search, SlidersHorizontal, ChevronLeft, ChevronRight, Loader2, X,
  ArrowUpDown, AlertCircle,
} from 'lucide-react';
import { moviesBrowseApi } from '../../services/api';
import type { Movie } from '../../types';
import MovieBrowseCard from './MovieBrowseCard';
import MovieDetailDrawer from './MovieDetailDrawer';
import BrowseFiltersPanel from './browseFilters/BrowseFiltersPanel';
import {
  DEFAULT_BROWSE_FILTERS,
  type BrowseFilterState,
} from './browseFilters/types';
import {
  buildBrowseParams,
  countActiveFilters,
  getActiveFilterChips,
} from './browseFilters/buildBrowseParams';
import { applyPreset, QUICK_PRESETS } from './browseFilters/presets';

const SORT_OPTIONS: { value: BrowseFilterState['sortBy']; label: string }[] = [
  { value: 'popularity', label: 'Popularity' },
  { value: 'rating', label: 'Rating' },
  { value: 'release_date', label: 'Release date' },
  { value: 'revenue', label: 'Box office' },
  { value: 'title', label: 'Title' },
];

export default function MovieBrowseTab() {
  const [draftFilters, setDraftFilters] = useState<BrowseFilterState>(DEFAULT_BROWSE_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<BrowseFilterState>(DEFAULT_BROWSE_FILTERS);
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const q = draftFilters.q.trim();
      setDebouncedQ(q);
      if (q !== appliedFilters.q.trim()) {
        setAppliedFilters((prev) => ({ ...prev, q }));
        setPage(1);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [draftFilters.q, appliedFilters.q]);

  const filtersForQuery = useMemo(
    () => ({ ...appliedFilters, q: debouncedQ }),
    [appliedFilters, debouncedQ]
  );

  const { params: browseParams, warnings } = useMemo(
    () => buildBrowseParams(filtersForQuery, page, 24),
    [filtersForQuery, page]
  );

  const activeCount = countActiveFilters(appliedFilters);
  const chips = getActiveFilterChips(appliedFilters);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['movies-browse', browseParams],
    queryFn: () => moviesBrowseApi.browse(browseParams),
    staleTime: 1000 * 60 * 2,
  });

  const applyFilters = () => {
    setAppliedFilters({ ...draftFilters, q: debouncedQ });
    setPage(1);
    setMobileFiltersOpen(false);
  };

  const resetFilters = () => {
    setDraftFilters(DEFAULT_BROWSE_FILTERS);
    setAppliedFilters(DEFAULT_BROWSE_FILTERS);
    setDebouncedQ('');
    setPage(1);
  };

  const removeChip = (clear: Partial<BrowseFilterState>) => {
    const next = { ...appliedFilters, ...clear };
    setAppliedFilters(next);
    setDraftFilters(next);
    setPage(1);
  };

  const applyQuickPreset = (presetId: string) => {
    const preset = QUICK_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const next = applyPreset(appliedFilters, preset);
    setDraftFilters(next);
    setAppliedFilters(next);
    setPage(1);
    setMobileFiltersOpen(false);
  };

  const sortDisabled = !!debouncedQ;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Search TMDB’s full catalog. Use filters to narrow by genre, year, rating, runtime, and more — then tap a poster for details.
      </p>

      <div className="lg:grid lg:grid-cols-[minmax(280px,320px)_1fr] gap-6 items-start">
        {/* Desktop filters sidebar */}
        <aside className="hidden lg:block lg:sticky lg:top-20 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-hide pr-1">
          <BrowseFiltersPanel
            draft={draftFilters}
            onDraftChange={setDraftFilters}
            onApply={applyFilters}
            onReset={resetFilters}
            activeCount={activeCount}
            isFetching={isFetching}
          />
        </aside>

        <div className="min-w-0 space-y-4">
          {/* Search + mobile filters toggle */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              <input
                type="search"
                value={draftFilters.q}
                onChange={(e) => setDraftFilters({ ...draftFilters, q: e.target.value })}
                placeholder="Search by movie title…"
                className="input-field pl-10 w-full shadow-sm"
              />
              {draftFilters.q && (
                <button
                  type="button"
                  onClick={() => {
                    setDraftFilters({ ...draftFilters, q: '' });
                    setAppliedFilters({ ...appliedFilters, q: '' });
                    setDebouncedQ('');
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden btn-secondary flex items-center justify-center gap-2 shrink-0 relative"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-primary-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </button>
          </div>

          {/* Quick presets (main column) */}
          <div className="flex flex-wrap gap-2">
            {QUICK_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                title={preset.description}
                onClick={() => applyQuickPreset(preset.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all"
              >
                <span>{preset.icon}</span>
                {preset.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
            <ArrowUpDown className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Sort</span>
            <select
              value={appliedFilters.sortBy}
              onChange={(e) => {
                const sortBy = e.target.value as BrowseFilterState['sortBy'];
                const next = { ...appliedFilters, sortBy };
                setAppliedFilters(next);
                setDraftFilters({ ...draftFilters, sortBy });
                setPage(1);
              }}
              disabled={sortDisabled}
              className="input-field w-auto min-w-[130px] text-sm py-2 disabled:opacity-50"
              title={sortDisabled ? 'Sorting is set by relevance when searching titles' : undefined}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={appliedFilters.sortOrder}
              onChange={(e) => {
                const sortOrder = e.target.value as 'asc' | 'desc';
                const next = { ...appliedFilters, sortOrder };
                setAppliedFilters(next);
                setDraftFilters({ ...draftFilters, sortOrder });
                setPage(1);
              }}
              disabled={sortDisabled}
              className="input-field w-auto min-w-[110px] text-sm py-2 disabled:opacity-50"
            >
              <option value="desc">High → low</option>
              <option value="asc">Low → high</option>
            </select>
            {sortDisabled && (
              <span className="text-xs text-gray-400">Title search uses relevance order</span>
            )}
          </div>

          {/* Active filter chips */}
          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-gray-500 w-full sm:w-auto">Active:</span>
              {chips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => removeChip(chip.clear)}
                  className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-200 border border-primary-200 dark:border-primary-800 hover:bg-primary-200 dark:hover:bg-primary-900/60 transition-colors"
                >
                  {chip.label}
                  <X className="h-3 w-3 opacity-70" />
                </button>
              ))}
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-gray-500 hover:text-red-600 dark:hover:text-red-400 underline"
              >
                Clear all
              </button>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="flex gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <ul className="list-disc list-inside space-y-0.5">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {data && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {data.totalResults.toLocaleString()}
              </span>{' '}
              movies
              {data.totalPages > 1 && ` · page ${data.page} of ${data.totalPages}`}
              {isFetching && !isLoading && ' · updating…'}
            </p>
          )}

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 text-primary-500 animate-spin" />
            </div>
          ) : data?.movies.length === 0 ? (
            <div className="text-center py-16 card border-2 border-dashed border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-300 font-medium mb-1">No matches</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Loosen filters, try a different decade, or search by title only.
              </p>
              <button type="button" onClick={resetFilters} className="btn-primary">
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
              {data?.movies.map((movie) => (
                <MovieBrowseCard
                  key={movie.id}
                  movie={movie}
                  onClick={() => setSelectedMovie(movie)}
                />
              ))}
            </div>
          )}

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                type="button"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn-secondary flex items-center gap-1 min-w-[100px] justify-center disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400 tabular-nums px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                {page} / {data.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= data.totalPages || isFetching}
                onClick={() => setPage((p) => p + 1)}
                className="btn-secondary flex items-center gap-1 min-w-[100px] justify-center disabled:opacity-40"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile filters sheet */}
      {mobileFiltersOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileFiltersOpen(false)}
            aria-hidden
          />
          <div className="relative bg-gray-50 dark:bg-gray-900 rounded-t-2xl max-h-[92vh] overflow-y-auto p-4 pb-8 shadow-2xl">
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4" />
            <BrowseFiltersPanel
              draft={draftFilters}
              onDraftChange={setDraftFilters}
              onApply={applyFilters}
              onReset={resetFilters}
              activeCount={countActiveFilters(draftFilters)}
              isFetching={isFetching}
            />
          </div>
        </div>
      )}

      <MovieDetailDrawer movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
    </div>
  );
}
