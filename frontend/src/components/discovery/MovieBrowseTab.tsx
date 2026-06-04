import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search, SlidersHorizontal, ChevronLeft, ChevronRight, Loader2, X,
} from 'lucide-react';
import { moviesBrowseApi } from '../../services/api';
import type { Movie, MovieBrowseParams } from '../../types';
import MovieBrowseCard from './MovieBrowseCard';
import MovieDetailDrawer from './MovieDetailDrawer';

const SORT_OPTIONS: { value: MovieBrowseParams['sortBy']; label: string }[] = [
  { value: 'popularity', label: 'Popularity' },
  { value: 'rating', label: 'Rating' },
  { value: 'release_date', label: 'Release date' },
  { value: 'revenue', label: 'Box office' },
  { value: 'title', label: 'Title A–Z' },
];

export default function MovieBrowseTab() {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  const [genres, setGenres] = useState<string[]>([]);
  const [year, setYear] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [minRating, setMinRating] = useState('');
  const [minVotes, setMinVotes] = useState('');
  const [language, setLanguage] = useState('');
  const [runtimeMin, setRuntimeMin] = useState('');
  const [runtimeMax, setRuntimeMax] = useState('');
  const [actor, setActor] = useState('');
  const [director, setDirector] = useState('');
  const [sortBy, setSortBy] = useState<MovieBrowseParams['sortBy']>('popularity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: genreList } = useQuery({
    queryKey: ['movie-genres'],
    queryFn: moviesBrowseApi.genres,
    staleTime: 1000 * 60 * 60 * 24,
  });

  const browseParams = useMemo((): MovieBrowseParams => ({
    q: debouncedQ || undefined,
    genres: genres.length ? genres.join(',') : undefined,
    year: year ? parseInt(year, 10) : undefined,
    yearFrom: yearFrom || undefined,
    yearTo: yearTo || undefined,
    minRating: minRating ? parseFloat(minRating) : undefined,
    minVotes: minVotes ? parseInt(minVotes, 10) : undefined,
    language: language || undefined,
    runtimeMin: runtimeMin ? parseInt(runtimeMin, 10) : undefined,
    runtimeMax: runtimeMax ? parseInt(runtimeMax, 10) : undefined,
    actor: actor.trim() || undefined,
    director: director.trim() || undefined,
    sortBy: debouncedQ ? undefined : sortBy,
    sortOrder,
    page,
    limit: 24,
  }), [debouncedQ, genres, year, yearFrom, yearTo, minRating, minVotes, language, runtimeMin, runtimeMax, actor, director, sortBy, sortOrder, page]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['movies-browse', browseParams],
    queryFn: () => moviesBrowseApi.browse(browseParams),
    staleTime: 1000 * 60 * 2,
  });

  const toggleGenre = (name: string) => {
    setGenres((prev) =>
      prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]
    );
    setPage(1);
  };

  const clearFilters = () => {
    setSearchInput('');
    setDebouncedQ('');
    setGenres([]);
    setYear('');
    setYearFrom('');
    setYearTo('');
    setMinRating('');
    setMinVotes('');
    setLanguage('');
    setRuntimeMin('');
    setRuntimeMax('');
    setActor('');
    setDirector('');
    setSortBy('popularity');
    setSortOrder('desc');
    setPage(1);
  };

  const hasFilters = genres.length > 0 || year || yearFrom || yearTo || minRating || minVotes
    || language || runtimeMin || runtimeMax || actor || director || debouncedQ;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Search and filter millions of films from TMDB. Tap a poster for cast, facts, ratings, and watchlist.
      </p>

      {/* Search bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by title…"
            className="input-field pl-10 w-full"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`btn-secondary flex items-center justify-center gap-2 shrink-0 ${showAdvanced ? 'ring-2 ring-primary-500' : ''}`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </button>
      </div>

      {/* Sort row */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-gray-500 dark:text-gray-400">Sort</label>
        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value as MovieBrowseParams['sortBy']); setPage(1); }}
          disabled={!!debouncedQ}
          className="input-field w-auto min-w-[140px] text-sm py-2"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={sortOrder}
          onChange={(e) => { setSortOrder(e.target.value as 'asc' | 'desc'); setPage(1); }}
          disabled={!!debouncedQ}
          className="input-field w-auto min-w-[100px] text-sm py-2"
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
        {hasFilters && (
          <button type="button" onClick={clearFilters} className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 ml-auto">
            <X className="h-4 w-4" /> Clear all
          </button>
        )}
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="card space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Advanced search</h3>
          <div className="flex flex-wrap gap-2">
            <p className="w-full text-xs text-gray-500 dark:text-gray-400 mb-1">Genres</p>
            {genreList?.genres.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleGenre(g.name)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  genres.includes(g.name)
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Year</label>
              <input type="number" value={year} onChange={(e) => { setYear(e.target.value); setPage(1); }} placeholder="2020" className="input-field text-sm" min={1900} max={2030} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">From year</label>
              <input type="number" value={yearFrom} onChange={(e) => { setYearFrom(e.target.value); setPage(1); }} placeholder="1990" className="input-field text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">To year</label>
              <input type="number" value={yearTo} onChange={(e) => { setYearTo(e.target.value); setPage(1); }} placeholder="2024" className="input-field text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Min rating</label>
              <input type="number" value={minRating} onChange={(e) => { setMinRating(e.target.value); setPage(1); }} placeholder="7" className="input-field text-sm" min={0} max={10} step={0.5} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Min votes</label>
              <input type="number" value={minVotes} onChange={(e) => { setMinVotes(e.target.value); setPage(1); }} placeholder="100" className="input-field text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Language</label>
              <input type="text" value={language} onChange={(e) => { setLanguage(e.target.value); setPage(1); }} placeholder="en" className="input-field text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Runtime min (m)</label>
              <input type="number" value={runtimeMin} onChange={(e) => { setRuntimeMin(e.target.value); setPage(1); }} className="input-field text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Runtime max (m)</label>
              <input type="number" value={runtimeMax} onChange={(e) => { setRuntimeMax(e.target.value); setPage(1); }} className="input-field text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 block mb-1">Actor</label>
              <input type="text" value={actor} onChange={(e) => { setActor(e.target.value); setPage(1); }} placeholder="Tom Hanks" className="input-field text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 block mb-1">Director</label>
              <input type="text" value={director} onChange={(e) => { setDirector(e.target.value); setPage(1); }} placeholder="Christopher Nolan" className="input-field text-sm" />
            </div>
          </div>
        </div>
      )}

      {/* Results meta */}
      {data && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {data.totalResults.toLocaleString()} movies found
          {data.totalPages > 1 && ` · Page ${data.page} of ${data.totalPages}`}
          {isFetching && !isLoading && ' · Updating…'}
        </p>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 text-primary-500 animate-spin" />
        </div>
      ) : data?.movies.length === 0 ? (
        <div className="text-center py-16 card">
          <p className="text-gray-500 dark:text-gray-400">No movies match your search. Try fewer filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
          {data?.movies.map((movie) => (
            <MovieBrowseCard
              key={movie.id}
              movie={movie}
              onClick={() => setSelectedMovie(movie)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            type="button"
            disabled={page <= 1 || isFetching}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="btn-secondary flex items-center gap-1 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page} / {data.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= data.totalPages || isFetching}
            onClick={() => setPage((p) => p + 1)}
            className="btn-secondary flex items-center gap-1 disabled:opacity-50"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <MovieDetailDrawer movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
    </div>
  );
}
