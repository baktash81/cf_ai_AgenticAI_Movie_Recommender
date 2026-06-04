import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Film,
  User,
  Clapperboard,
  Calendar,
  TrendingUp,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { FEEDBACK_REACTIONS } from '../../constants/feedbackReactions';
import { tasteProfileApi } from '../../services/api';
import { buildTasteNarrative, formatLastSynced } from '../../utils/tasteNarrative';

function StatPill({
  emoji,
  label,
  value,
  color,
}: {
  emoji: string;
  label: string;
  value: number;
  color: string;
}) {
  if (value === 0) return null;
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${color}`}>
      <span className="text-lg leading-none" aria-hidden>{emoji}</span>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function ChipSection({
  icon: Icon,
  title,
  items,
  color,
}: {
  icon: React.ElementType;
  title: string;
  items: Array<{ name: string; score: number }>;
  color: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4" />
        {title}
      </h4>
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <span
            key={item.name}
            className={`px-3 py-1 rounded-full text-sm font-medium ${color} ${
              index === 0 ? 'ring-2 ring-offset-1 ring-primary-500/50 dark:ring-offset-gray-800' : ''
            }`}
          >
            {item.name}
            <span className="ml-1 opacity-60 text-xs">{Math.round(item.score * 100)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function AboutYourTaste() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['taste-profile'],
    queryFn: tasteProfileApi.get,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <div className="card flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Could not load your taste summary.{' '}
          <button type="button" onClick={() => refetch()} className="text-primary-600 dark:text-primary-400 underline">
            Try again
          </button>
        </p>
      </div>
    );
  }

  const { summary, feedbackBreakdown, lastSyncedAt, synced } = data;
  const strengthPct = Math.round(summary.profileStrength * 100);
  const narrative = buildTasteNarrative(summary, feedbackBreakdown);
  const syncedLabel = formatLastSynced(lastSyncedAt);

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary-500" />
            About your taste
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Learned from your movie ratings and synced into recommendations
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="self-start flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 min-h-[40px] px-2"
          title="Refresh taste summary"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-5">{narrative}</p>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-5">
        <div className="col-span-2 sm:col-span-1 flex flex-col justify-center p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20">
          <span className="text-xs text-gray-500 dark:text-gray-400">Movies rated</span>
          <span className="text-2xl font-bold text-primary-700 dark:text-primary-300">
            {summary.totalMoviesRated}
          </span>
        </div>
        {FEEDBACK_REACTIONS.map((r) => (
          <StatPill
            key={r.type}
            emoji={r.emoji}
            label={r.label}
            value={feedbackBreakdown[r.type] ?? 0}
            color={r.activeBg}
          />
        ))}
      </div>

      {/* Profile strength */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Taste profile strength</span>
          <span className="text-sm text-gray-500">{strengthPct}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all"
            style={{ width: `${Math.max(strengthPct, summary.totalMoviesRated > 0 ? 4 : 0)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Rate more movies to sharpen Discover picks and chat recommendations.
        </p>
      </div>

      {summary.totalMoviesRated > 0 && (
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <ChipSection icon={Film} title="Top genres" items={summary.topGenres} color="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" />
          <ChipSection icon={User} title="Top actors" items={summary.topActors} color="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" />
          <ChipSection icon={Clapperboard} title="Top directors" items={summary.topDirectors} color="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" />
          <ChipSection icon={Calendar} title="Preferred decades" items={summary.preferredDecades} color="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" />
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <TrendingUp className="h-4 w-4" />
            Typical TMDB rating preference:{' '}
            <strong className="text-gray-900 dark:text-white">{summary.avgRatingPreference.toFixed(1)}+</strong>
          </div>
        </div>
      )}

      {summary.totalMoviesRated === 0 && (
        <div className="text-center py-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Head to Discover and tap a face on any movie to rate how you feel about it.
          </p>
          <Link to="/discover" className="btn-primary inline-flex">
            Explore Discover
          </Link>
        </div>
      )}

      {(syncedLabel || synced) && summary.totalMoviesRated > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/80">
          {synced
            ? 'Preferences were just updated from your latest ratings.'
            : syncedLabel
              ? `Taste synced with your written preferences on ${syncedLabel}.`
              : null}
        </p>
      )}
    </div>
  );
}
