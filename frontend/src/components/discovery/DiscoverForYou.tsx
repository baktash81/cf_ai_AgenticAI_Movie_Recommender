import { useQuery } from '@tanstack/react-query';
import { Sparkles, TrendingUp, Film, Calendar } from 'lucide-react';
import { discoveryApi } from '../../services/api';
import MovieCard from '../chat/MovieCard';
import type { Movie, DiscoverySection } from '../../types';

export default function DiscoverForYou() {
  const { data: discoveryData, isLoading } = useQuery({
    queryKey: ['discovery'],
    queryFn: discoveryApi.get,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading && !discoveryData) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-gray-500 dark:text-gray-400">Loading discoveries...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      {discoveryData?.sections.map((section) => (
        <DiscoverySectionBlock key={section.id} section={section} />
      ))}
    </div>
  );
}

function DiscoverySectionBlock({ section }: { section: DiscoverySection }) {
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
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{section.subtitle}</p>
          )}
        </div>
      </div>
      <div className="grid-movie-cards">
        {(section.items as Movie[]).slice(0, 10).map((movie) => (
          <MovieCard key={movie.id} movie={movie} variant="grid" />
        ))}
      </div>
    </section>
  );
}
