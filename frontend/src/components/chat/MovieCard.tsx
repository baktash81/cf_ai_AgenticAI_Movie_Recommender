import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Star, Clock, Calendar, Plus, Check, ExternalLink, 
  Film, Share2, MoreHorizontal,
  Tv, Play
} from 'lucide-react';
import type { Movie, FeedbackType, WatchProviders } from '../../types';
import { useWatchlist } from '../../hooks/useMovies';
import { feedbackApi, watchProvidersApi } from '../../services/api';
import { FEEDBACK_REACTIONS } from '../../constants/feedbackReactions';
import SimilarMoviesModal from '../discovery/SimilarMovies';
import { CreateShareModal } from '../social/ShareList';

interface Props {
  movie: Movie;
  showFeedback?: boolean;
  compact?: boolean;
  /** Compact layout for discovery/collection grids (narrow columns) */
  variant?: 'default' | 'grid';
  onFeedbackChange?: (movieId: string, feedback: FeedbackType) => void;
}

function getTmdbMovieUrl(movieId: string): string {
  const numericId = movieId.replace(/\D/g, '') || movieId;
  return `https://www.themoviedb.org/movie/${numericId}`;
}

export default function MovieCard({
  movie,
  showFeedback = true,
  compact = false,
  variant = 'default',
  onFeedbackChange,
}: Props) {
  const queryClient = useQueryClient();
  const { watchlist, addToWatchlist, removeFromWatchlist, isAddingToWatchlist } = useWatchlist();
  const [imageError, setImageError] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<FeedbackType | null>(null);
  const [pendingFeedback, setPendingFeedback] = useState<FeedbackType | null>(null);
  const inFlightRef = useRef(false);
  const [showSimilar, setShowSimilar] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [watchProviders, setWatchProviders] = useState<WatchProviders | null>(null);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const [providersLoaded, setProvidersLoaded] = useState(false);
  
  const isInWatchlist = watchlist.some(item => item.movie_id === movie.id);
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;
  
  const handleWatchlistToggle = () => {
    if (isInWatchlist) {
      removeFromWatchlist(movie.id);
    } else {
      addToWatchlist({ movieId: movie.id, movieData: movie });
    }
  };

  const handleFeedback = useCallback((feedbackType: FeedbackType) => {
    if (inFlightRef.current && pendingFeedback === feedbackType) return;

    const previous = currentFeedback;
    setCurrentFeedback(feedbackType);
    setPendingFeedback(feedbackType);
    onFeedbackChange?.(movie.id, feedbackType);
    inFlightRef.current = true;

    feedbackApi
      .submit(movie.id, feedbackType, undefined, movie)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['taste-profile'] });
      })
      .catch((error) => {
        console.error('Failed to submit feedback:', error);
        setCurrentFeedback(previous);
      })
      .finally(() => {
        inFlightRef.current = false;
        setPendingFeedback(null);
      });
  }, [movie, currentFeedback, pendingFeedback, onFeedbackChange, queryClient]);

  const loadWatchProviders = async () => {
    if (providersLoaded || isLoadingProviders) return;
    setIsLoadingProviders(true);
    try {
      const result = await watchProvidersApi.get(movie.id);
      setWatchProviders(result.providers);
    } catch (error) {
      console.error('Failed to load watch providers:', error);
    } finally {
      setIsLoadingProviders(false);
      setProvidersLoaded(true);
    }
  };

  const placeholderImage = `https://via.placeholder.com/300x450?text=${encodeURIComponent(movie.title)}`;

  const isGridVariant = variant === 'grid';
  const tmdbUrl = getTmdbMovieUrl(movie.id);

  const renderFeedbackRow = (dense: boolean) => (
    <div
      className={
        dense
          ? 'grid grid-cols-5 gap-0.5 w-full'
          : 'grid grid-cols-5 gap-1 w-full'
      }
      role="group"
      aria-label="Rate this movie"
    >
      {FEEDBACK_REACTIONS.map(({ type, emoji, label, activeRing, activeBg }) => {
        const isActive = currentFeedback === type;
        const isPending = pendingFeedback === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => handleFeedback(type)}
            title={label}
            aria-label={label}
            aria-pressed={isActive}
            className={`flex items-center justify-center rounded-lg transition-all duration-150 select-none ${
              dense ? 'h-9 w-full text-base' : 'h-10 w-full text-lg'
            } ${
              isActive
                ? `${activeBg} ring-2 ${activeRing} scale-105`
                : 'opacity-70 hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105'
            } ${isPending && !isActive ? 'animate-pulse' : ''}`}
          >
            <span className="leading-none" aria-hidden>
              {emoji}
            </span>
          </button>
        );
      })}
    </div>
  );

  const renderTmdbLink = (dense: boolean) => (
    <a
      href={tmdbUrl}
      target="_blank"
      rel="noopener noreferrer"
      title="View on TMDB"
      className={`flex items-center justify-center gap-1 rounded-lg font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors ${
        dense ? 'w-full py-1.5 text-xs' : 'w-full py-2 text-sm'
      }`}
    >
      TMDB
      <ExternalLink className={dense ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
    </a>
  );

  if (compact) {
    return (
      <div className="flex gap-3 p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors w-full">
        <div className="flex-shrink-0 w-14 sm:w-16 aspect-[2/3] rounded overflow-hidden bg-gray-200 dark:bg-gray-700">
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

  if (isGridVariant) {
    return (
      <>
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow group">
          <div className="relative aspect-[2/3] bg-gray-200 dark:bg-gray-700 flex-shrink-0">
            <img
              src={imageError || !movie.posterUrl ? placeholderImage : movie.posterUrl}
              alt={movie.title}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
              loading="lazy"
            />
            <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-black/75 text-white px-1.5 py-0.5 rounded text-xs font-medium z-10">
              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
              {movie.rating.toFixed(1)}
            </div>
            <div className="absolute top-1.5 right-1.5 flex gap-1 z-10">
              <button
                type="button"
                onClick={handleWatchlistToggle}
                disabled={isAddingToWatchlist}
                className={`p-1.5 rounded-full ${
                  isInWatchlist ? 'bg-primary-600 text-white' : 'bg-white/90 text-gray-700 hover:bg-white'
                }`}
                title={isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
              >
                {isInWatchlist ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1.5 rounded-full bg-white/90 text-gray-700 hover:bg-white"
                  aria-label="More actions"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                      <button
                        type="button"
                        onClick={() => { setShowSimilar(true); setShowMenu(false); }}
                        className="w-full px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <Film className="h-3.5 w-3.5" />
                        More Like This
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowShare(true); setShowMenu(false); }}
                        className="w-full px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        Share
                      </button>
                      <a
                        href={tmdbUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setShowMenu(false)}
                        className="w-full px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        TMDB
                      </a>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col flex-1 p-2.5 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug" title={movie.title}>
              {movie.title}
            </h3>
            {year && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{year}</p>
            )}

            {showFeedback && (
              <div className="mt-auto pt-2 space-y-1.5 border-t border-gray-200 dark:border-gray-700">
                {renderFeedbackRow(true)}
                {renderTmdbLink(true)}
              </div>
            )}
            {!showFeedback && (
              <div className="mt-auto pt-2 border-t border-gray-200 dark:border-gray-700">
                {renderTmdbLink(true)}
              </div>
            )}
          </div>
        </div>

        <SimilarMoviesModal movie={movie} isOpen={showSimilar} onClose={() => setShowSimilar(false)} />
        <CreateShareModal movies={[movie]} isOpen={showShare} onClose={() => setShowShare(false)} />
      </>
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
        <div className="p-3 sm:p-4">
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

          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
            {showFeedback && renderFeedbackRow(false)}
            {renderTmdbLink(false)}
          </div>

          {/* Watch Providers Loading */}
          {isLoadingProviders && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">Loading streaming options...</p>
            </div>
          )}

          {/* Watch Providers (if loaded) */}
          {providersLoaded && !isLoadingProviders && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Where to Watch</p>
              {watchProviders && (watchProviders.flatrate.length > 0 || watchProviders.rent.length > 0 || watchProviders.buy.length > 0) ? (
                <div className="space-y-2">
                  {/* Streaming (flatrate) */}
                  {watchProviders.flatrate.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Stream</p>
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
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover/provider:opacity-100 whitespace-nowrap pointer-events-none z-10">
                              {provider.providerName}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Rent */}
                  {watchProviders.rent.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Rent</p>
                      <div className="flex flex-wrap gap-2">
                        {watchProviders.rent.slice(0, 4).map((provider) => (
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
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover/provider:opacity-100 whitespace-nowrap pointer-events-none z-10">
                              {provider.providerName}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Buy */}
                  {watchProviders.buy.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Buy</p>
                      <div className="flex flex-wrap gap-2">
                        {watchProviders.buy.slice(0, 4).map((provider) => (
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
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover/provider:opacity-100 whitespace-nowrap pointer-events-none z-10">
                              {provider.providerName}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* TMDB Attribution Link */}
                  {watchProviders.link && (
                    <a 
                      href={watchProviders.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      View all options on TMDB →
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No streaming options found in your region</p>
              )}
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
