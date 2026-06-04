import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  Film,
  Calendar,
  Sparkles,
  Grid,
  List,
  Loader2,
  Bookmark,
} from 'lucide-react';
import { collectionsApi } from '../services/api';
import CollectionCard from '../components/discovery/CollectionCard';
import MovieCard from '../components/chat/MovieCard';
import type { CuratedCollection, CollectionType } from '../types';
import { getCollectionCoverUrl, getCollectionTheme, typeLabel } from '../utils/collectionVisuals';

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | CollectionType;

function dedupeCollections(lists: CuratedCollection[][]): CuratedCollection[] {
  const map = new Map<string, CuratedCollection>();
  for (const list of lists) {
    for (const c of list) {
      if (!map.has(c.collection_id)) {
        map.set(c.collection_id, c);
      }
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
  );
}

export default function CollectionsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedCollection, setSelectedCollection] = useState<CuratedCollection | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['collections'],
    queryFn: () => collectionsApi.list(),
    staleTime: 1000 * 60 * 10,
  });

  const filterOptions: { value: FilterType; label: string; icon: React.ElementType }[] = [
    { value: 'all', label: 'All', icon: Grid },
    { value: 'seasonal', label: 'Seasonal', icon: Calendar },
    { value: 'genre', label: 'Genres', icon: Film },
    { value: 'decade', label: 'Decades', icon: Sparkles },
    { value: 'curated', label: 'Curated', icon: Bookmark },
  ];

  const savedIds = useMemo(
    () => new Set((data?.saved || []).map((c) => c.collection_id)),
    [data?.saved]
  );

  const allCollections = useMemo(
    () => dedupeCollections([data?.collections || [], data?.seasonal || []]),
    [data]
  );

  const seasonalHighlight = useMemo(
    () => (data?.seasonal || []).filter((c) => c.isCurrentSeason),
    [data?.seasonal]
  );

  const seasonalHighlightIds = useMemo(
    () => new Set(seasonalHighlight.map((c) => c.collection_id)),
    [seasonalHighlight]
  );

  const filteredCollections = useMemo(() => {
    let list =
      filterType === 'all'
        ? allCollections
        : allCollections.filter((c) => c.collection_type === filterType);
    if (filterType === 'all') {
      if (savedIds.size > 0) {
        list = list.filter((c) => !savedIds.has(c.collection_id));
      }
      if (seasonalHighlightIds.size > 0) {
        list = list.filter((c) => !seasonalHighlightIds.has(c.collection_id));
      }
    }
    return list;
  }, [allCollections, filterType, savedIds, seasonalHighlightIds]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-primary-500 animate-spin mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Loading collections…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Film className="h-12 w-12 text-gray-300 dark:text-gray-600" />
        <p className="text-gray-500 dark:text-gray-400">Failed to load collections.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  if (selectedCollection) {
    return (
      <CollectionMovies
        collection={selectedCollection}
        onBack={() => setSelectedCollection(null)}
      />
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="min-w-0">
          <h1 className="page-title">
            <Film className="h-5 w-5 sm:h-6 sm:w-6 text-primary-500 flex-shrink-0" />
            Collections
          </h1>
          <p className="page-subtitle">
            {allCollections.length} curated lists · posters loaded from TMDB
          </p>
        </div>

        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-gray-700 shadow text-primary-600'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            aria-label="Grid view"
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-white dark:bg-gray-700 shadow text-primary-600'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="scroll-tabs mb-6 sm:mb-8">
        {filterOptions.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilterType(value)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors min-h-[40px] ${
              filterType === value
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {filterType === 'all' && seasonalHighlight.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            In season now
          </h2>
          <div className={viewMode === 'grid' ? 'grid-collection-cards' : 'space-y-3'}>
            {seasonalHighlight.map((collection) => (
              <CollectionCard
                key={collection.collection_id}
                collection={collection}
                onSelect={setSelectedCollection}
                compact={viewMode === 'list'}
              />
            ))}
          </div>
        </section>
      )}

      {data?.saved && data.saved.length > 0 && filterType === 'all' && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-primary-500" />
            Saved collections
          </h2>
          <div className={viewMode === 'grid' ? 'grid-collection-cards' : 'space-y-3'}>
            {data.saved.map((collection) => (
              <CollectionCard
                key={collection.collection_id}
                collection={collection}
                onSelect={setSelectedCollection}
                compact={viewMode === 'list'}
              />
            ))}
          </div>
        </section>
      )}

      {filteredCollections.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
          <Film className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            No collections in this filter
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Try another category or check back later.
          </p>
        </div>
      ) : (
        <section>
          {filterType !== 'all' && (
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 capitalize">
              {filterType} collections
            </h2>
          )}
          <div className={viewMode === 'grid' ? 'grid-collection-cards' : 'space-y-4'}>
            {filteredCollections.map((collection) => (
              <CollectionCard
                key={collection.collection_id}
                collection={collection}
                onSelect={setSelectedCollection}
                compact={viewMode === 'list'}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

interface CollectionMoviesProps {
  collection: CuratedCollection;
  onBack: () => void;
}

function CollectionMovies({ collection, onBack }: CollectionMoviesProps) {
  const theme = getCollectionTheme(collection);
  const { data, isLoading } = useQuery({
    queryKey: ['collection', collection.collection_id],
    queryFn: () => collectionsApi.get(collection.collection_id),
    initialData: { collection },
  });

  const detail = data?.collection || collection;
  const movies = detail.movies || [];
  const cover = getCollectionCoverUrl(detail);
  const count = detail.movieCount ?? movies.length;

  return (
    <div className="page-container">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4 sm:mb-6 min-h-[44px]"
      >
        ← Back to collections
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg mb-8 border border-gray-200 dark:border-gray-700">
        <div className="aspect-[3/1] min-h-[120px] relative overflow-hidden">
          {cover ? (
            <img src={cover} alt={detail.title} className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${theme.gradient}`} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
            <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur text-white text-sm rounded-full mb-2">
              {typeLabel(detail)}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white">{detail.title}</h1>
            {detail.description && (
              <p className="text-gray-200 mt-1 text-sm sm:text-base max-w-2xl">{detail.description}</p>
            )}
            <p className="text-gray-300 mt-2 text-sm">
              {count} {count === 1 ? 'title' : 'titles'}
            </p>
          </div>
        </div>
      </div>

      {isLoading && movies.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-primary-500 animate-spin" />
        </div>
      ) : movies.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No titles found for this collection yet.
        </div>
      ) : (
        <div className="grid-movie-cards">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} variant="grid" />
          ))}
        </div>
      )}
    </div>
  );
}
