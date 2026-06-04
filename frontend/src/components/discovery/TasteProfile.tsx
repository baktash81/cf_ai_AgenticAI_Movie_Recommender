import { useQuery } from '@tanstack/react-query';
import { Film, User, Clapperboard, Calendar, TrendingUp, Sparkles } from 'lucide-react';
import { tasteProfileApi } from '../../services/api';

export default function TasteProfile() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['taste-profile'],
    queryFn: tasteProfileApi.get,
  });

  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const { summary } = data;
  const strengthPercentage = Math.round(summary.profileStrength * 100);

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary-500" />
          Your Taste Profile
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {summary.totalMoviesRated} movies rated
          </span>
        </div>
      </div>

      {/* Profile Strength */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Profile Strength</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{strengthPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${strengthPercentage}%` }}
          ></div>
        </div>
        {strengthPercentage < 30 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Rate more movies to improve recommendations!
          </p>
        )}
      </div>

      {/* Top Genres */}
      {summary.topGenres.length > 0 && (
        <ProfileSection
          icon={Film}
          title="Favorite Genres"
          items={summary.topGenres}
          color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
        />
      )}

      {/* Top Actors */}
      {summary.topActors.length > 0 && (
        <ProfileSection
          icon={User}
          title="Favorite Actors"
          items={summary.topActors}
          color="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
        />
      )}

      {/* Top Directors */}
      {summary.topDirectors.length > 0 && (
        <ProfileSection
          icon={Clapperboard}
          title="Favorite Directors"
          items={summary.topDirectors}
          color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
        />
      )}

      {/* Preferred Decades */}
      {summary.preferredDecades.length > 0 && (
        <ProfileSection
          icon={Calendar}
          title="Preferred Decades"
          items={summary.preferredDecades}
          color="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
        />
      )}

      {/* Average Rating Preference */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-gray-500" />
          <span className="text-gray-600 dark:text-gray-400">
            You typically enjoy movies rated <strong className="text-gray-900 dark:text-white">{summary.avgRatingPreference.toFixed(1)}+</strong>
          </span>
        </div>
      </div>

      {summary.totalMoviesRated === 0 && (
        <div className="text-center py-8">
          <Sparkles className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Build Your Taste Profile
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto">
            Like or dislike movies to help us understand your preferences and give you better recommendations.
          </p>
        </div>
      )}
    </div>
  );
}

interface ProfileSectionProps {
  icon: React.ElementType;
  title: string;
  items: Array<{ name: string; score: number }>;
  color: string;
}

function ProfileSection({ icon: Icon, title, items, color }: ProfileSectionProps) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4" />
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <span
            key={item.name}
            className={`px-3 py-1 rounded-full text-sm font-medium ${color} ${
              index === 0 ? 'ring-2 ring-offset-2 ring-primary-500 dark:ring-offset-gray-800' : ''
            }`}
          >
            {item.name}
            <span className="ml-1 opacity-60">{Math.round(item.score * 100)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}
