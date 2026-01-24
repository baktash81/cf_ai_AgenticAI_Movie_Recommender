import { useState, useCallback } from 'react';
import { 
  Star, Clock, Calendar, Plus, Check, ExternalLink, 
  Heart, ThumbsUp, ThumbsDown, X, Film, Share2, MoreHorizontal,
  Tv, Play
} from 'lucide-react';
import type { Movie, FeedbackType, WatchProviders } from '../../types';
import { useWatchlist } from '../../hooks/useMovies';
import { feedbackApi, watchProvidersApi } from '../../services/api';
import SimilarMoviesModal from '../discovery/SimilarMovies';
import { CreateShareModal } from '../social/ShareList';

interface Props {
  movie: Movie;
  showFeedback?: boolean;
  compact?: boolean;
  onFeedbackChange?: (movieId: string, feedback: FeedbackType) => void;
}

export default function MovieCard({ movie, showFeedback = true, compact = false, onFeedbackChange }: Props) {
  const { watchlist, addToWatchlist, removeFromWatchlist, isAddingToWatchlist } = useWatchlist();
  const [imageError, setImageError] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<FeedbackType | null>(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [showSimilar, setShowSimilar] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [watchProviders, setWatchProviders] = useState<WatchProviders | null>(null);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  
  const isInWatchlist = watchlist.some(item => item.movie_id === movie.id);
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;
  
  const handleWatchlistToggle = () => {
    if (isInWatchlist) {
      removeFromWatchlist(movie.id);
    } else {
      addToWatchlist({ movieId: movie.id, movieData: movie });
    }
  };

  const handleFeedback = useCallback(async (feedbackType: FeedbackType) => {
    if (isSubmittingFeedback) return;
    
    setIsSubmittingFeedback(true);
    try {
      await feedbackApi.submit(movie.id, feedbackType, undefined, movie);
      setCurrentFeedback(feedbackType);
      onFeedbackChange?.(movie.id, feedbackType);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmittingFeedback(false);
    }
  }, [movie, isSubmittingFeedback, onFeedbackChange]);

  const loadWatchProviders = async () => {
    if (watchProviders || isLoadingProviders) return;
    setIsLoadingProviders(true);
    try {
      const result = await watchProvidersApi.get(movie.id);
      setWatchProviders(result.providers);
    } catch (error) {
      console.error('Failed to load watch providers:', error);
    } finally {
      setIsLoadingProviders(false);
    }
  };

  const placeholderImage = `https://via.placeholder.com/300x450?text=${encodeURIComponent(movie.title)}`;

  const feedbackButtons = [
    { type: 'love' as FeedbackType, icon: Heart, activeColor: 'text-red-500 fill-red-500' },
    { type: 'like' as FeedbackType, icon: ThumbsUp, activeColor: 'text-green-500' },
    { type: 'dislike' as FeedbackType, icon: ThumbsDown, activeColor: 'text-orange-500' },
    { type: 'not_interested' as FeedbackType, icon: X, activeColor: 'text-gray-500' },
  ];

  if (compact) {
    return (
      <div className="flex gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
        <div className="flex-shrink-0 w-12 h-18 rounded overflow-hidden bg-gray-200 dark:bg-gray-700">
          <img
            src={imageError || !movie.posterUrl ? placeholderImage : movie.posterUrl}
            alt={movie.title}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 dark:text-white truncate">{movie.title}</h4>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            {year && <span>{year}</span>}
            <span className="flex items-center gap-0.5">
              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
              {movie.rating.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
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
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 text-white px-2 py-1 rounded-lg text-sm font-medium z-10">
            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
            {movie.rating.toFixed(1)}
          </div>

          {/* Action buttons (top right) */}
          <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
            {/* Watchlist button */}
            <button
              onClick={handleWatchlistToggle}
              disabled={isAddingToWatchlist}
              className={`p-2 rounded-full transition-colors ${
                isInWatchlist
                  ? 'bg-primary-600 text-white'
                  : 'bg-white/90 text-gray-700 hover:bg-white'
              }`}
              title={isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
            >
              {isInWatchlist ? (
                <Check className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </button>

            {/* More menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-full bg-white/90 text-gray-700 hover:bg-white transition-colors"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                    <button
                      onClick={() => { setShowSimilar(true); setShowMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Film className="h-4 w-4" />
                      More Like This
                    </button>
                    <button
                      onClick={() => { setShowShare(true); setShowMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </button>
                    <button
                      onClick={() => { loadWatchProviders(); setShowMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Tv className="h-4 w-4" />
                      Where to Watch
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
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

          {/* Feedback buttons */}
          {showFeedback && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-1">
                {feedbackButtons.map(({ type, icon: Icon, activeColor }) => (
                  <button
                    key={type}
                    onClick={() => handleFeedback(type)}
                    disabled={isSubmittingFeedback}
                    className={`p-1.5 rounded-full transition-all ${
                      currentFeedback === type
                        ? `bg-gray-100 dark:bg-gray-700 ${activeColor}`
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title={type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
              
              {/* TMDB Link */}
              <a
                href={`https://www.themoviedb.org/movie/${movie.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
              >
                TMDB
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {/* Watch Providers (if loaded) */}
          {watchProviders && (watchProviders.flatrate.length > 0 || watchProviders.rent.length > 0) && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Where to Watch</p>
              <div className="flex flex-wrap gap-2">
                {watchProviders.flatrate.slice(0, 4).map((provider) => (
                  <div key={provider.providerId} className="relative group/provider">
                    {provider.logoPath ? (
                      <img 
                        src={provider.logoPath} 
                        alt={provider.providerName}
                        className="w-8 h-8 rounded-lg"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <Play className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover/provider:opacity-100 whitespace-nowrap pointer-events-none">
                      {provider.providerName}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Similar Movies Modal */}
      <SimilarMoviesModal
        movie={movie}
        isOpen={showSimilar}
        onClose={() => setShowSimilar(false)}
      />

      {/* Share Modal */}
      <CreateShareModal
        movies={[movie]}
        isOpen={showShare}
        onClose={() => setShowShare(false)}
      />
    </>
  );
}
