import { useState } from 'react';
import { Star, AlertTriangle, Globe, Lock, Loader2 } from 'lucide-react';
import type { Movie, ReviewCreateRequest } from '../../types';
import { reviewsApi } from '../../services/api';

interface Props {
  movie: Movie;
  onSuccess?: () => void;
  onCancel?: () => void;
  initialRating?: number;
}

export default function ReviewForm({ movie, onSuccess, onCancel, initialRating }: Props) {
  const [rating, setRating] = useState(initialRating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [containsSpoilers, setContainsSpoilers] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const data: ReviewCreateRequest = {
        movieId: movie.id,
        movieData: movie,
        rating,
        title: title || undefined,
        content: content || undefined,
        containsSpoilers,
        isPublic,
      };

      await reviewsApi.create(data);
      onSuccess?.();
    } catch (err) {
      setError('Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="flex gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="w-14 sm:w-16 aspect-[2/3] flex-shrink-0 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
          {movie.posterUrl ? (
            <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
              No Image
            </div>
          )}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{movie.title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : ''}
          </p>
        </div>
      </div>

      {/* Rating */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Your Rating *
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              onMouseEnter={() => setHoverRating(value)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                className={`h-6 w-6 transition-colors ${
                  value <= displayRating
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              />
            </button>
          ))}
          <span className="ml-3 text-lg font-semibold text-gray-900 dark:text-white">
            {displayRating > 0 ? displayRating : '-'}/10
          </span>
        </div>
        {displayRating > 0 && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {getRatingLabel(displayRating)}
          </p>
        )}
      </div>

      {/* Title */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Review Title (optional)
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sum up your thoughts..."
          maxLength={100}
          className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Content */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Your Review (optional)
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What did you think of the movie?"
          rows={4}
          className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Options */}
      <div className="flex flex-wrap gap-4 mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={containsSpoilers}
            onChange={(e) => setContainsSpoilers(e.target.checked)}
            className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Contains spoilers
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
            {isPublic ? (
              <>
                <Globe className="h-4 w-4 text-green-500" />
                Public review
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 text-gray-500" />
                Private review
              </>
            )}
          </span>
        </label>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || rating === 0}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Review'
          )}
        </button>
      </div>
    </form>
  );
}

function getRatingLabel(rating: number): string {
  if (rating >= 9) return 'Masterpiece!';
  if (rating >= 8) return 'Excellent';
  if (rating >= 7) return 'Great';
  if (rating >= 6) return 'Good';
  if (rating >= 5) return 'Average';
  if (rating >= 4) return 'Below Average';
  if (rating >= 3) return 'Poor';
  if (rating >= 2) return 'Bad';
  return 'Terrible';
}

// Review display component
interface ReviewCardProps {
  review: {
    review_id: string;
    user_name?: string;
    rating: number;
    title?: string;
    content?: string;
    contains_spoilers: boolean;
    helpful_count: number;
    userVote?: boolean;
    created_at: string;
  };
  onVote?: (reviewId: string, isHelpful: boolean) => void;
}

export function ReviewCard({ review, onVote }: ReviewCardProps) {
  const [showSpoilers, setShowSpoilers] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (isHelpful: boolean) => {
    if (isVoting) return;
    setIsVoting(true);
    try {
      await onVote?.(review.review_id, isHelpful);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                {review.user_name?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <span className="font-medium text-gray-900 dark:text-white">
              {review.user_name || 'Anonymous'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
          <span className="font-semibold text-gray-900 dark:text-white">{review.rating}/10</span>
        </div>
      </div>

      {review.title && (
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">{review.title}</h4>
      )}

      {review.content && (
        <div>
          {review.contains_spoilers && !showSpoilers ? (
            <button
              onClick={() => setShowSpoilers(true)}
              className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400 hover:underline"
            >
              <AlertTriangle className="h-4 w-4" />
              This review contains spoilers. Click to reveal.
            </button>
          ) : (
            <p className="text-gray-600 dark:text-gray-300 text-sm">{review.content}</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(review.created_at).toLocaleDateString()}
        </span>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {review.helpful_count} found helpful
          </span>
          <button
            onClick={() => handleVote(true)}
            disabled={isVoting}
            className={`px-2 py-1 text-xs rounded ${
              review.userVote === true
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Helpful
          </button>
        </div>
      </div>
    </div>
  );
}
