import { useState } from 'react';
import { Star, Clock, Calendar, Plus, Check, ExternalLink } from 'lucide-react';
import type { Movie } from '../../types';
import { useWatchlist } from '../../hooks/useMovies';

interface Props {
  movie: Movie;
}

export default function MovieCard({ movie }: Props) {
  const { watchlist, addToWatchlist, removeFromWatchlist, isAddingToWatchlist } = useWatchlist();
  const [imageError, setImageError] = useState(false);
  
  const isInWatchlist = watchlist.some(item => item.movie_id === movie.id);
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;
  
  const handleWatchlistToggle = () => {
    if (isInWatchlist) {
      removeFromWatchlist(movie.id);
    } else {
      addToWatchlist({ movieId: movie.id });
    }
  };

  const placeholderImage = `https://via.placeholder.com/300x450?text=${encodeURIComponent(movie.title)}`;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow group">
      {/* Poster */}
      <div className="relative aspect-[2/3] bg-gray-200 dark:bg-gray-700">
        <img
          src={imageError || !movie.posterUrl ? placeholderImage : movie.posterUrl}
          alt={movie.title}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
          loading="lazy"
        />
        
        {/* Rating badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 text-white px-2 py-1 rounded-lg text-sm font-medium">
          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
          {movie.rating.toFixed(1)}
        </div>

        {/* Watchlist button */}
        <button
          onClick={handleWatchlistToggle}
          disabled={isAddingToWatchlist}
          className={`absolute top-2 right-2 p-2 rounded-full transition-colors ${
            isInWatchlist
              ? 'bg-primary-600 text-white'
              : 'bg-white/90 text-gray-700 hover:bg-white'
          }`}
        >
          {isInWatchlist ? (
            <Check className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </button>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="text-white text-sm line-clamp-3">
              {movie.overview || 'No description available.'}
            </p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white truncate" title={movie.title}>
          {movie.title}
        </h3>
        
        <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
          {year && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {year}
            </div>
          )}
          {movie.runtime && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {movie.runtime}m
            </div>
          )}
        </div>

        {/* Genres */}
        {movie.genres && movie.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {movie.genres.slice(0, 3).map((genre, index) => (
              <span
                key={index}
                className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs"
              >
                {genre}
              </span>
            ))}
          </div>
        )}

        {/* Cast */}
        {movie.actors && movie.actors.length > 0 && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 truncate">
            {movie.actors.slice(0, 3).join(', ')}
          </p>
        )}

        {/* TMDB Link */}
        <a
          href={`https://www.themoviedb.org/movie/${movie.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-3 text-sm text-primary-600 dark:text-primary-400 hover:underline"
        >
          View on TMDB
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
