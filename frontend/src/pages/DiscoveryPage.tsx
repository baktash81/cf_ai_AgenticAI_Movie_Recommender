import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { 
  Sparkles, TrendingUp, Film, Calendar, Compass, 
  ChevronRight, Loader2, RefreshCw
} from 'lucide-react';
import { discoveryApi, collectionsApi } from '../services/api';
import MovieCard from '../components/chat/MovieCard';
import CollectionCard from '../components/discovery/CollectionCard';
import TasteProfile from '../components/discovery/TasteProfile';
import type { Movie, CuratedCollection, DiscoverySection } from '../types';

export default function DiscoveryPage() {
  const [selectedCollection, setSelectedCollection] = useState<CuratedCollection | null>(null);

  const { data: discoveryData, isLoading: isLoadingDiscovery, isFetching, refetch } = useQuery({
    queryKey: ['discovery'],
    queryFn: discoveryApi.get,
    staleTime: 1000 * 60 * 5,
  });

  // Saved collections only — loaded after main content (non-blocking)
  const { data: collectionsData } = useQuery({
    queryKey: ['collections'],
    queryFn: () => collectionsApi.list(),
    staleTime: 1000 * 60 * 5,
  });

  // If a collection is selected, show it in detail
  if (selectedCollection) {
    return (
      <CollectionDetail 
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
            <Compass className="h-5 w-5 sm:h-6 sm:w-6 text-primary-500 flex-shrink-0" />
            Discover
          </h1>
          <p className="page-subtitle">
            Explore curated collections and personalized picks
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="self-start sm:self-center p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Refresh"
        >
          <RefreshCw className={`h-5 w-5 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8 sm:space-y-10 min-w-0">
          {isLoadingDiscovery && !discoveryData ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 text-primary-500 animate-spin mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Loading discoveries...</p>
            </div>
          ) : (
            discoveryData?.sections.map((section) => (
              <DiscoverySectionComponent
                key={section.id}
                section={section}
              />
            ))
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Taste Profile */}
          <TasteProfile />

          {/* Saved Collections */}
          {collectionsData?.saved && collectionsData.saved.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Saved Collections
              </h3>
              <div className="space-y-2">
                {collectionsData.saved.map((collection) => (
                  <CollectionCard
                    key={collection.collection_id}
                    collection={collection}
                    onSelect={setSelectedCollection}
                    compact
                  />
                ))}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <a
                href="/watchlist"
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-gray-700 dark:text-gray-300">My Watchlist</span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </a>
              <a
                href="/profile"
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-gray-700 dark:text-gray-300">My Preferences</span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </a>
              <a
                href="/chat"
                className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
              >
                <span className="text-primary-700 dark:text-primary-300">Get Recommendations</span>
                <ChevronRight className="h-4 w-4 text-primary-400" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DiscoverySectionProps {
  section: DiscoverySection;
}

function DiscoverySectionComponent({ section }: DiscoverySectionProps) {
  const sectionIcons: Record<string, React.ElementType> = {
    trending: TrendingUp,
    personalized: Sparkles,
    collection: Film,
    recent: Calendar,
  };

  const Icon = sectionIcons[section.type] || Film;

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3 sm:mb-4">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
            <Icon className={`h-5 w-5 ${section.type === 'personalized' ? 'text-yellow-500' : 'text-primary-500'}`} />
            {section.title}
          </h2>
          {section.subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {section.subtitle}
            </p>
          )}
        </div>
        {section.viewAllLink && (
          <a
            href={section.viewAllLink}
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
          >
            View All
            <ChevronRight className="h-4 w-4" />
          </a>
        )}
      </div>

      <div className="grid-movie-cards">
        {(section.items as Movie[]).slice(0, 10).map((movie) => (
          <MovieCard key={movie.id} movie={movie} variant="grid" />
        ))}
      </div>
    </section>
  );
}

interface CollectionDetailProps {
  collection: CuratedCollection;
  onBack: () => void;
}

function CollectionDetail({ collection, onBack }: CollectionDetailProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['collection', collection.collection_id],
    queryFn: () => collectionsApi.get(collection.collection_id),
    initialData: { collection },
  });

  const movies = data?.collection.movies || collection.movies;

  return (
    <div className="page-container">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4 sm:mb-6 min-h-[44px]"
      >
        <ChevronRight className="h-4 w-4 rotate-180" />
        Back to Discovery
      </button>

      {/* Collection header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg mb-8">
        {/* Cover */}
        <div className="aspect-[21/9] bg-gray-200 dark:bg-gray-700 relative">
          {collection.cover_image_url || movies[0]?.backdropUrl ? (
            <img
              src={collection.cover_image_url || movies[0]?.backdropUrl}
              alt={collection.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary-500 to-primary-700" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8">
            <div className="max-w-3xl">
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur text-white text-xs sm:text-sm rounded-full mb-2 sm:mb-3">
                {collection.collection_type}
              </span>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2">{collection.title}</h1>
              {collection.description && (
                <p className="text-gray-200 text-sm sm:text-base md:text-lg line-clamp-3">{collection.description}</p>
              )}
              <p className="text-gray-300 mt-3">{movies.length} movies</p>
            </div>
          </div>
        </div>
      </div>

      {/* Movies grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-primary-500 animate-spin" />
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
