import { useState } from 'react';
import { 
  Star, Calendar, Clock, Trash2, Edit2, Bell, Tag,
  ChevronDown, ChevronUp, Check, MoreVertical
} from 'lucide-react';
import type { WatchlistItem, WatchlistPriority } from '../../types';
import { watchlistApi, watchHistoryApi } from '../../services/api';

interface Props {
  item: WatchlistItem;
  onRemove: (movieId: string) => void;
  onUpdate: (movieId: string, updates: Partial<WatchlistItem>) => void;
  onMarkWatched: (movieId: string) => void;
}

export default function WatchlistCard({ item, onRemove, onUpdate, onMarkWatched }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(item.notes || '');
  const [priority, setPriority] = useState<WatchlistPriority>(item.priority);
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const movie = item.movieData;
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;

  const priorityLabels: Record<WatchlistPriority, { label: string; color: string }> = {
    0: { label: 'Normal', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
    1: { label: 'High', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    2: { label: 'Must Watch', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  };

  const handleSaveNotes = async () => {
    setIsLoading(true);
    try {
      await watchlistApi.update(item.movie_id, { notes, priority });
      onUpdate(item.movie_id, { notes, priority });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update watchlist item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkWatched = async () => {
    setIsLoading(true);
    try {
      await watchHistoryApi.add(item.movie_id, movie);
      await watchlistApi.remove(item.movie_id);
      onMarkWatched(item.movie_id);
    } catch (error) {
      console.error('Failed to mark as watched:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    setIsLoading(true);
    try {
      await watchlistApi.remove(item.movie_id);
      onRemove(item.movie_id);
    } catch (error) {
      console.error('Failed to remove from watchlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden transition-all ${
      isExpanded ? 'ring-2 ring-primary-500' : ''
    }`}>
      <div className="flex gap-4 p-4">
        {/* Poster */}
        <div className="flex-shrink-0 w-20 h-30 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
          {movie.posterUrl ? (
            <img 
              src={movie.posterUrl} 
              alt={movie.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Image
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {movie.title}
              </h3>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                {year && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {year}
                  </span>
                )}
                {movie.runtime && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {movie.runtime}m
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                  {movie.rating.toFixed(1)}
                </span>
              </div>
            </div>

            {/* Priority badge & menu */}
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityLabels[priority].color}`}>
                {priorityLabels[priority].label}
              </span>
              
              <div className="relative">
                <button 
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                      <button
                        onClick={() => { handleMarkWatched(); setShowMenu(false); }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <Check className="h-4 w-4" />
                        Mark as Watched
                      </button>
                      <button
                        onClick={() => { setIsEditing(true); setIsExpanded(true); setShowMenu(false); }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <Edit2 className="h-4 w-4" />
                        Edit Notes
                      </button>
                      <button
                        onClick={() => { handleRemove(); setShowMenu(false); }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Genres */}
          {movie.genres && movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
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

          {/* Notes preview */}
          {item.notes && !isExpanded && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 truncate">
              {item.notes}
            </p>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <Tag className="h-3.5 w-3.5 text-gray-400" />
              <div className="flex gap-1">
                {item.tags.map((tag, index) => (
                  <span key={index} className="text-xs text-primary-600 dark:text-primary-400">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reminder */}
          {item.reminder_date && (
            <div className="flex items-center gap-1 mt-2 text-sm text-primary-600 dark:text-primary-400">
              <Bell className="h-3.5 w-3.5" />
              Reminder: {new Date(item.reminder_date).toLocaleDateString()}
            </div>
          )}

          {/* Expand button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-3 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                More
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expanded section */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          {/* Overview */}
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            {movie.overview || 'No description available.'}
          </p>

          {/* Notes editing */}
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value) as WatchlistPriority)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                >
                  <option value={0}>Normal</option>
                  <option value={1}>High Priority</option>
                  <option value={2}>Must Watch</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add your notes..."
                  rows={3}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm resize-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setIsEditing(false); setNotes(item.notes || ''); setPriority(item.priority); }}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNotes}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : item.notes ? (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">{item.notes}</p>
            </div>
          ) : null}

          {/* Action buttons */}
          {!isEditing && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleMarkWatched}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                Mark as Watched
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
