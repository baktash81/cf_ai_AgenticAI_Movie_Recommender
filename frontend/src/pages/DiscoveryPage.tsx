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

  const { data: discoveryData, isLoading: isLoadingDiscovery, refetch } = useQuery({
    queryKey: ['discovery'],
    queryFn: discoveryApi.get,
  });

  const { data: collectionsData, isLoading: isLoadingCollections } = useQuery({
    queryKey: ['collections'],
    queryFn: () => collectionsApi.list(),
  });

  const isLoading = isLoadingDiscovery || isLoadingCollections;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-primary-500 animate-spin mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Loading discoveries...</p>
      </div>
    );
  }

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
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Compass className="h-6 w-6 text-primary-500" />
            Discover
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Explore curated collections and personalized picks
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Refresh"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-10">
          {/* Discovery sections */}
          {discoveryData?.sections.map((section) => (
            <DiscoverySectionComponent 
              key={section.id} 
              section={section}
            />
          ))}

          {/* Seasonal Collections */}
          {collectionsData?.seasonal && collectionsData.seasonal.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary-500" />
                  Seasonal Picks
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {collectionsData.seasonal.map((collection) => (
                  <CollectionCard
                    key={collection.collection_id}
                    collection={collection}
                    onSelect={setSelectedCollection}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Genre Collections */}
          {collectionsData?.collections && collectionsData.collections.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Film className="h-5 w-5 text-primary-500" />
                  Browse by Collection
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {collectionsData.collections.slice(0, 6).map((collection) => (
                  <CollectionCard
                    key={collection.collection_id}
                    collection={collection}
                    onSelect={setSelectedCollection}
                    compact
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Taste Profile */}
          <TasteProfile />

          {/* Saved Collections */}
          {collectionsData?.saved && collectionsData.saved.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
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

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {(section.items as Movie[]).slice(0, 10).map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6"
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
          
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="max-w-3xl">
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur text-white text-sm rounded-full mb-3">
                {collection.collection_type}
              </span>
              <h1 className="text-3xl font-bold text-white mb-2">{collection.title}</h1>
              {collection.description && (
                <p className="text-gray-200 text-lg">{collection.description}</p>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}
    </div>
  );
}
