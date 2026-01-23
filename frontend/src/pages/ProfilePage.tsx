import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePreferences } from '../hooks/useMovies';
import PreferenceForm from '../components/profile/PreferenceForm';
import { User, Mail, Loader2, Check, Edit2 } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser, refreshUser } = useAuth();
  const { preferences, isLoading: prefsLoading } = usePreferences();
  const navigate = useNavigate();
  
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleProfileComplete = async () => {
    await refreshUser();
    navigate('/chat');
  };

  const handleUpdateName = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateUser({ name });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update name:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Show preference setup for new users
  if (user && !user.profileCompleted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Let's personalize your experience
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Tell us about your movie preferences so we can give you better recommendations.
            </p>
          </div>
          <PreferenceForm onComplete={handleProfileComplete} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>

      {/* User info */}
      <div className="card">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center flex-shrink-0">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name || 'User'}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <User className="h-8 w-8 text-primary-600 dark:text-primary-400" />
            )}
          </div>
          
          <div className="flex-1">
            {isEditing ? (
              <form onSubmit={handleUpdateName} className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field flex-1"
                  placeholder="Your name"
                />
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary"
                >
                  {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setName(user?.name || '');
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {user?.name || 'No name set'}
                </h2>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>
            )}
            
            <div className="flex items-center gap-2 mt-1 text-gray-600 dark:text-gray-400">
              <Mail className="h-4 w-4" />
              <span>{user?.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Your Preferences
        </h2>

        {prefsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : preferences ? (
          <div className="space-y-4">
            {preferences.favoriteGenres.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Favorite Genres
                </label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {preferences.favoriteGenres.map((genre, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {preferences.dislikedGenres.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Disliked Genres
                </label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {preferences.dislikedGenres.map((genre, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-full text-sm"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {preferences.favoriteActors.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Favorite Actors
                </label>
                <p className="text-gray-900 dark:text-white mt-1">
                  {preferences.favoriteActors.join(', ')}
                </p>
              </div>
            )}

            {preferences.favoriteDirectors.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Favorite Directors
                </label>
                <p className="text-gray-900 dark:text-white mt-1">
                  {preferences.favoriteDirectors.join(', ')}
                </p>
              </div>
            )}

            {preferences.minRating > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Minimum Rating
                </label>
                <p className="text-gray-900 dark:text-white mt-1">
                  {preferences.minRating}/10
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Preference Style
              </label>
              <p className="text-gray-900 dark:text-white mt-1 capitalize">
                {preferences.preferenceStyle}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">
            No preferences set yet. Tell us about your taste!
          </p>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Update your preferences
          </h3>
          <PreferenceForm onComplete={() => window.location.reload()} />
        </div>
      </div>
    </div>
  );
}
