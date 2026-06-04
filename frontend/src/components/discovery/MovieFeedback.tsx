import { useState } from 'react';
import { Heart, ThumbsUp, ThumbsDown, X, Sparkles } from 'lucide-react';
import type { Movie, FeedbackType } from '../../types';
import { feedbackApi } from '../../services/api';

interface Props {
  movie: Movie;
  initialFeedback?: FeedbackType | null;
  onFeedbackChange?: (feedbackType: FeedbackType) => void;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
}

export default function MovieFeedback({ 
  movie, 
  initialFeedback, 
  onFeedbackChange,
  size = 'md',
  showLabels = false 
}: Props) {
  const [currentFeedback, setCurrentFeedback] = useState<FeedbackType | null>(initialFeedback || null);
  const [isLoading, setIsLoading] = useState(false);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const buttonSizeClasses = {
    sm: 'p-2 min-h-[36px] min-w-[36px]',
    md: 'p-2.5 min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0',
    lg: 'p-3 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0'
  };

  const handleFeedback = async (feedbackType: FeedbackType) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await feedbackApi.submit(movie.id, feedbackType, undefined, movie);
      setCurrentFeedback(feedbackType);
      onFeedbackChange?.(feedbackType);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const feedbackButtons = [
    { type: 'love' as FeedbackType, icon: Heart, label: 'Love', activeColor: 'text-red-500 fill-red-500', hoverColor: 'hover:text-red-400' },
    { type: 'like' as FeedbackType, icon: ThumbsUp, label: 'Like', activeColor: 'text-green-500', hoverColor: 'hover:text-green-400' },
    { type: 'dislike' as FeedbackType, icon: ThumbsDown, label: 'Dislike', activeColor: 'text-orange-500', hoverColor: 'hover:text-orange-400' },
    { type: 'not_interested' as FeedbackType, icon: X, label: 'Not for me', activeColor: 'text-gray-500', hoverColor: 'hover:text-gray-400' },
  ];

  return (
    <div className="flex items-center gap-1">
      {feedbackButtons.map(({ type, icon: Icon, label, activeColor, hoverColor }) => (
        <button
          key={type}
          onClick={() => handleFeedback(type)}
          disabled={isLoading}
          className={`${buttonSizeClasses[size]} flex items-center justify-center rounded-full transition-all ${
            currentFeedback === type
              ? `bg-gray-100 dark:bg-gray-700 ${activeColor}`
              : `text-gray-400 ${hoverColor} hover:bg-gray-100 dark:hover:bg-gray-700`
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={label}
        >
          <Icon className={sizeClasses[size]} />
        </button>
      ))}
      {showLabels && currentFeedback && (
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
          {feedbackButtons.find(b => b.type === currentFeedback)?.label}
        </span>
      )}
    </div>
  );
}

// Quick rating component (1-10 stars)
interface RatingProps {
  value: number;
  onChange: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
}

export function StarRating({ value, onChange, size = 'md', readonly = false }: RatingProps) {
  const [hoverValue, setHoverValue] = useState(0);
  
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  // Convert 1-10 scale to 1-5 stars (each star = 2 points)
  const displayValue = Math.round(value / 2);
  const displayHover = Math.round(hoverValue / 2);

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange(star * 2)}
          onMouseEnter={() => !readonly && setHoverValue(star * 2)}
          onMouseLeave={() => !readonly && setHoverValue(0)}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer'} transition-transform hover:scale-110`}
        >
          <Sparkles
            className={`${sizeClasses[size]} ${
              star <= (displayHover || displayValue)
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        </button>
      ))}
      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
        {value > 0 ? `${value}/10` : 'Rate this'}
      </span>
    </div>
  );
}
