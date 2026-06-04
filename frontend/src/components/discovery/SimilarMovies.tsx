import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Film, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { Movie } from '../../types';
import { similarMoviesApi } from '../../services/api';
import MovieCard from '../chat/MovieCard';

interface Props {
  movie: Movie;
  isOpen: boolean;
  onClose: () => void;
}

export default function SimilarMoviesModal({ movie, isOpen, onClose }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['similar-movies', movie.id],
    queryFn: () => similarMoviesApi.get(movie.id),
    enabled: isOpen,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative min-h-screen flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4 flex items-start sm:items-center justify-between gap-3 z-10">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                More Like "{movie.title}"
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Movies similar to ones you might enjoy
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-3 sm:p-6 overflow-y-auto max-h-[calc(95vh-72px)] sm:max-h-[calc(90vh-80px)]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-primary-500 animate-spin mb-4" />
                <p className="text-gray-500 dark:text-gray-400">Finding similar movies...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <Film className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  Couldn't find similar movies. Please try again.
                </p>
              </div>
            ) : data?.similarMovies && data.similarMovies.length > 0 ? (
              <div className="grid-movie-cards">
                {data.similarMovies.map((similarMovie) => (
                  <MovieCard key={similarMovie.id} movie={similarMovie} variant="grid" />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Film className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No similar movies found.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline similar movies carousel (for use on movie detail page)
interface CarouselProps {
  movieId: string;
  onMovieSelect?: (movie: Movie) => void;
}

export function SimilarMoviesCarousel({ movieId, onMovieSelect }: CarouselProps) {
  const [scrollPosition, setScrollPosition] = useState(0);
  
  const { data, isLoading } = useQuery({
    queryKey: ['similar-movies', movieId],
    queryFn: () => similarMoviesApi.get(movieId),
  });

  const handleScroll = (direction: 'left' | 'right') => {
    const container = document.getElementById(`similar-carousel-${movieId}`);
    if (container) {
      const scrollAmount = 300;
      const newPosition = direction === 'left' 
        ? Math.max(0, scrollPosition - scrollAmount)
        : scrollPosition + scrollAmount;
      container.scrollTo({ left: newPosition, behavior: 'smooth' });
      setScrollPosition(newPosition);
    }
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex-shrink-0 w-32 h-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data?.similarMovies || data.similarMovies.length === 0) {
    return null;
  }

  return (
    <div className="relative group">
      {/* Scroll buttons */}
      <button
        type="button"
        onClick={() => handleScroll('left')}
        className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 min-h-[44px] min-w-[44px] items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
        disabled={scrollPosition === 0}
      >
        <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      </button>
      <button
        type="button"
        onClick={() => handleScroll('right')}
        className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 min-h-[44px] min-w-[44px] items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      </button>

      {/* Carousel */}
      <div
        id={`similar-carousel-${movieId}`}
        className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2 -mx-3 px-3 sm:mx-0 sm:px-0"
        onScroll={(e) => setScrollPosition(e.currentTarget.scrollLeft)}
      >
        {data.similarMovies.map((movie) => (
          <button
            key={movie.id}
            onClick={() => onMovieSelect?.(movie)}
            className="flex-shrink-0 w-24 sm:w-32 group/card"
          >
            <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 mb-2 group-hover/card:ring-2 ring-primary-500 transition-all">
              {movie.posterUrl ? (
                <img 
                  src={movie.posterUrl} 
                  alt={movie.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Film className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {movie.title}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : 'N/A'}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
