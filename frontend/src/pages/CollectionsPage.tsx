import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { 
  Film, Calendar, Sparkles, Grid, List, Loader2, 
  Bookmark
} from 'lucide-react';
import { collectionsApi } from '../services/api';
import CollectionCard from '../components/discovery/CollectionCard';
import MovieCard from '../components/chat/MovieCard';
import type { CuratedCollection, CollectionType } from '../types';

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | CollectionType;

export default function CollectionsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedCollection, setSelectedCollection] = useState<CuratedCollection | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['collections'],
    queryFn: () => collectionsApi.list(),
  });

  const filterOptions: { value: FilterType; label: string; icon: React.ElementType }[] = [
    { value: 'all', label: 'All', icon: Grid },
    { value: 'seasonal', label: 'Seasonal', icon: Calendar },
    { value: 'genre', label: 'Genres', icon: Film },
    { value: 'decade', label: 'Decades', icon: Sparkles },
    { value: 'curated', label: 'Curated', icon: Bookmark },
  ];

  // Combine all collections
  const allCollections = [
    ...(data?.collections || []),
    ...(data?.seasonal || []),
  ];

  // Filter collections
  const filteredCollections = filterType === 'all'
    ? allCollections
    : allCollections.filter(c => c.collection_type === filterType);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-primary-500 animate-spin mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Loading collections...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Film className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Failed to load collections.</p>
      </div>
    );
  }

  // If a collection is selected, show its movies
  if (selectedCollection) {
    return (
      <CollectionMovies
        collection={selectedCollection}
        onBack={() => setSelectedCollection(null)}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Film className="h-6 w-6 text-primary-500" />
            Collections
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {allCollections.length} curated collections
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-gray-700 shadow text-primary-600'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-white dark:bg-gray-700 shadow text-primary-600'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {filterOptions.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setFilterType(value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
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

      {/* Saved collections section */}
      {data?.saved && data.saved.length > 0 && filterType === 'all' && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-primary-500" />
            Saved Collections
          </h2>
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-3'
          }>
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

      {/* Main collections */}
      {filteredCollections.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
          <Film className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            No collections found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Try a different filter
          </p>
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
          : 'space-y-4'
        }>
          {filteredCollections.map((collection) => (
            <CollectionCard
              key={collection.collection_id}
              collection={collection}
              onSelect={setSelectedCollection}
              compact={viewMode === 'list'}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CollectionMoviesProps {
  collection: CuratedCollection;
  onBack: () => void;
}

function CollectionMovies({ collection, onBack }: CollectionMoviesProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['collection', collection.collection_id],
    queryFn: () => collectionsApi.get(collection.collection_id),
    initialData: { collection },
  });

  const movies = data?.collection.movies || collection.movies;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6"
      >
        ← Back to Collections
      </button>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg mb-8">
        <div className="aspect-[3/1] bg-gray-200 dark:bg-gray-700 relative">
          {movies[0]?.backdropUrl ? (
            <img
              src={movies[0].backdropUrl}
              alt={collection.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary-600 to-primary-800" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur text-white text-sm rounded-full mb-2">
              {collection.collection_type}
            </span>
            <h1 className="text-2xl font-bold text-white">{collection.title}</h1>
            {collection.description && (
              <p className="text-gray-200 mt-1">{collection.description}</p>
            )}
            <p className="text-gray-300 mt-2 text-sm">{movies.length} movies</p>
          </div>
        </div>
      </div>

      {/* Movies */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-primary-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}
    </div>
  );
}
