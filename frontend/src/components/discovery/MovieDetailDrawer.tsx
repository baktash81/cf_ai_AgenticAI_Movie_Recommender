import { useEffect, useState, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X, Star, Clock, Calendar, ExternalLink, Plus, Check, Loader2, Film,
} from 'lucide-react';
import type { Movie, FeedbackType } from '../../types';
import { moviesBrowseApi, feedbackApi } from '../../services/api';
import { useWatchlist } from '../../hooks/useMovies';
import { FEEDBACK_REACTIONS } from '../../constants/feedbackReactions';

interface Props {
  movie: Movie | null;
  onClose: () => void;
}

export default function MovieDetailDrawer({ movie, onClose }: Props) {
  const queryClient = useQueryClient();
  const { watchlist, addToWatchlist, removeFromWatchlist, isAddingToWatchlist } = useWatchlist();
  const [currentFeedback, setCurrentFeedback] = useState<FeedbackType | null>(null);
  const inFlightRef = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ['movie-detail', movie?.id],
    queryFn: () => moviesBrowseApi.detail(movie!.id),
    enabled: !!movie?.id,
  });

  const detail = data?.movie;

  useEffect(() => {
    if (!movie?.id) return;
    feedbackApi.get(movie.id).then(({ feedback }) => {
      if (feedback?.feedback_type) {
        setCurrentFeedback(feedback.feedback_type);
      } else {
        setCurrentFeedback(null);
      }
    }).catch(() => setCurrentFeedback(null));
  }, [movie?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (movie) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', onKey);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [movie, onClose]);

  const handleFeedback = useCallback((feedbackType: FeedbackType) => {
    if (!detail || inFlightRef.current) return;
    const previous = currentFeedback;
    setCurrentFeedback(feedbackType);
    inFlightRef.current = true;
    feedbackApi
      .submit(detail.id, feedbackType, undefined, detail)
      .then(() => queryClient.invalidateQueries({ queryKey: ['taste-profile'] }))
      .catch(() => setCurrentFeedback(previous))
      .finally(() => { inFlightRef.current = false; });
  }, [detail, currentFeedback, queryClient]);

  if (!movie) return null;

  const isInWatchlist = watchlist.some((item) => item.movie_id === movie.id);
  const tmdbUrl = `https://www.themoviedb.org/movie/${movie.id.replace(/\D/g, '') || movie.id}`;
  const year = detail?.releaseDate ? new Date(detail.releaseDate).getFullYear() : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div className="relative w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-10 w-10 text-primary-500 animate-spin" />
          </div>
        ) : detail ? (
          <div className="overflow-y-auto">
            {detail.backdropUrl && (
              <div className="h-32 sm:h-48 bg-gray-900 relative">
                <img src={detail.backdropUrl} alt="" className="w-full h-full object-cover opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-gray-800 to-transparent" />
              </div>
            )}

            <div className="p-4 sm:p-6 -mt-16 sm:-mt-20 relative flex flex-col sm:flex-row gap-4 sm:gap-6">
              <div className="flex-shrink-0 mx-auto sm:mx-0">
                <img
                  src={detail.posterUrlLarge || detail.posterUrl || ''}
                  alt={detail.title}
                  className="w-36 sm:w-48 md:w-56 rounded-xl shadow-xl border-4 border-white dark:border-gray-800 object-cover aspect-[2/3] bg-gray-200"
                />
              </div>

              <div className="flex-1 min-w-0 pt-2 sm:pt-16">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{detail.title}</h2>
                {detail.tagline && (
                  <p className="text-sm italic text-gray-500 dark:text-gray-400 mt-1">{detail.tagline}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {year && (
                    <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{year}</span>
                  )}
                  {detail.runtime && (
                    <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{detail.runtime}m</span>
                  )}
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    {detail.rating.toFixed(1)} ({detail.voteCount.toLocaleString()} votes)
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {detail.genres.map((g) => (
                    <span key={g} className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {g}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => (isInWatchlist ? removeFromWatchlist(detail.id) : addToWatchlist({ movieId: detail.id, movieData: detail }))}
                    disabled={isAddingToWatchlist}
                    className="btn-primary flex items-center gap-2 text-sm"
                  >
                    {isInWatchlist ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                  </button>
                  <a href={tmdbUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary flex items-center gap-2 text-sm">
                    TMDB <ExternalLink className="h-4 w-4" />
                  </a>
                </div>

                <div className="mt-4" role="group" aria-label="Rate this movie">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">How do you feel about this film?</p>
                  <div className="flex gap-1 flex-wrap">
                    {FEEDBACK_REACTIONS.map(({ type, emoji, label, activeRing, activeBg }) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleFeedback(type)}
                        title={label}
                        aria-label={label}
                        aria-pressed={currentFeedback === type}
                        className={`h-10 w-10 text-lg rounded-lg transition-all ${
                          currentFeedback === type
                            ? `${activeBg} ring-2 ${activeRing} scale-110`
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-6 pb-6 space-y-6">
              <section>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Overview</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {detail.overview || 'No overview available.'}
                </p>
              </section>

              {detail.facts.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Fun facts</h3>
                  <ul className="space-y-1.5">
                    {detail.facts.map((fact, i) => (
                      <li key={i} className="text-sm text-gray-600 dark:text-gray-300 flex gap-2">
                        <span className="text-primary-500">•</span>
                        {fact}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {detail.cast.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Cast</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {detail.cast.map((member) => (
                      <div key={member.id} className="text-center">
                        <div className="aspect-square rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 mb-1">
                          {member.profileUrl ? (
                            <img src={member.profileUrl} alt={member.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Film className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs font-medium text-gray-900 dark:text-white line-clamp-1">{member.name}</p>
                        <p className="text-[10px] text-gray-500 line-clamp-1">{member.character}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {detail.keywords.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Themes & keywords</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.keywords.map((kw) => (
                      <span key={kw} className="px-2 py-1 text-xs rounded-md bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300">
                        {kw}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        ) : (
          <p className="p-8 text-center text-gray-500">Could not load movie details.</p>
        )}
      </div>
    </div>
  );
}
