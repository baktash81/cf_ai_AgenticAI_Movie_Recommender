import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Bookmark, Filter, Star, SortAsc, Loader2, 
  Film, Bell, Tag
} from 'lucide-react';
import { watchlistApi } from '../services/api';
import WatchlistCard from '../components/social/WatchlistCard';
import type { WatchlistItem } from '../types';

type SortOption = 'added_at' | 'priority' | 'title' | 'rating';
type FilterOption = 'all' | 'must_watch' | 'high' | 'normal' | 'with_notes';

export default function WatchlistPage() {
  const queryClient = useQueryClient();
  const [sortBy, setSortBy] = useState<SortOption>('added_at');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['watchlist', sortBy],
    queryFn: () => watchlistApi.list(sortBy, 'DESC'),
  });

  const removeMutation = useMutation({
    mutationFn: watchlistApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });

  const handleRemove = (movieId: string) => {
    removeMutation.mutate(movieId);
  };

  const handleUpdate = (movieId: string, updates: Partial<WatchlistItem>) => {
    // Optimistically update the cache
    queryClient.setQueryData(['watchlist', sortBy], (old: any) => {
      if (!old?.items) return old;
      return {
        ...old,
        items: old.items.map((item: WatchlistItem) =>
          item.movie_id === movieId ? { ...item, ...updates } : item
        ),
      };
    });
  };

  const handleMarkWatched = (movieId: string) => {
    // Remove from local cache immediately
    queryClient.setQueryData(['watchlist', sortBy], (old: any) => {
      if (!old?.items) return old;
      return {
        ...old,
        items: old.items.filter((item: WatchlistItem) => item.movie_id !== movieId),
        totalCount: old.totalCount - 1,
      };
    });
  };

  // Filter items
  const filteredItems = (data?.items || []).filter((item: WatchlistItem) => {
    switch (filterBy) {
      case 'must_watch':
        return item.priority === 2;
      case 'high':
        return item.priority === 1;
      case 'normal':
        return item.priority === 0;
      case 'with_notes':
        return item.notes && item.notes.length > 0;
      default:
        return true;
    }
  });

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case 'priority':
        return b.priority - a.priority;
      case 'title':
        return a.movieData.title.localeCompare(b.movieData.title);
      case 'rating':
        return b.movieData.rating - a.movieData.rating;
      case 'added_at':
      default:
        return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
    }
  });

  return (
    <div className="page-container-narrow">
      <div className="page-header">
        <div className="min-w-0">
          <h1 className="page-title">
            <Bookmark className="h-5 w-5 sm:h-6 sm:w-6 text-primary-500 flex-shrink-0" />
            My Watchlist
          </h1>
          <p className="page-subtitle">
            {data?.totalCount || 0} movies to watch
            {data?.hasReminders ? ` • ${data.hasReminders} with reminders` : ''}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-6">
        <div className="flex items-center gap-2 flex-1 min-w-[140px]">
          <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as FilterOption)}
            className="flex-1 min-h-[44px] px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Movies</option>
            <option value="must_watch">Must Watch</option>
            <option value="high">High Priority</option>
            <option value="normal">Normal</option>
            <option value="with_notes">With Notes</option>
          </select>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-[140px]">
          <SortAsc className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="flex-1 min-h-[44px] px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="added_at">Date Added</option>
            <option value="priority">Priority</option>
            <option value="title">Title</option>
            <option value="rating">Rating</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 text-primary-500 animate-spin mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading your watchlist...</p>
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <Film className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Failed to load watchlist. Please try again.</p>
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
          <Bookmark className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            {filterBy === 'all' ? 'Your watchlist is empty' : 'No movies match this filter'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
            {filterBy === 'all' 
              ? 'Start adding movies you want to watch by clicking the + button on any movie card.'
              : 'Try a different filter to see more movies.'}
          </p>
          {filterBy !== 'all' && (
            <button
              onClick={() => setFilterBy('all')}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Show All Movies
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedItems.map((item: WatchlistItem) => (
            <WatchlistCard
              key={item.watchlist_id}
              item={item}
              onRemove={handleRemove}
              onUpdate={handleUpdate}
              onMarkWatched={handleMarkWatched}
            />
          ))}
        </div>
      )}

      {/* Stats */}
      {data && data.totalCount > 0 && (
        <div className="mt-6 sm:mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            icon={Film}
            label="Total Movies"
            value={data.totalCount}
            color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          />
          <StatCard
            icon={Star}
            label="Must Watch"
            value={data.items.filter((i: WatchlistItem) => i.priority === 2).length}
            color="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
          />
          <StatCard
            icon={Bell}
            label="Reminders"
            value={data.hasReminders}
            color="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
          />
          <StatCard
            icon={Tag}
            label="With Notes"
            value={data.items.filter((i: WatchlistItem) => i.notes).length}
            color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
          />
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
      <div className={`inline-flex p-2 rounded-lg ${color} mb-2`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}
