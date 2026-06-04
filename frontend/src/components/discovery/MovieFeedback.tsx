import { useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Movie, FeedbackType } from '../../types';
import { feedbackApi } from '../../services/api';
import { FEEDBACK_REACTIONS } from '../../constants/feedbackReactions';

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
  const queryClient = useQueryClient();
  const [currentFeedback, setCurrentFeedback] = useState<FeedbackType | null>(initialFeedback || null);
  const [pendingFeedback, setPendingFeedback] = useState<FeedbackType | null>(null);
  const inFlightRef = useRef(false);

  const sizeClasses = {
    sm: 'h-8 text-base gap-0.5',
    md: 'h-9 text-lg gap-1',
    lg: 'h-11 text-xl gap-1',
  };

  const handleFeedback = useCallback((feedbackType: FeedbackType) => {
    if (inFlightRef.current && pendingFeedback === feedbackType) return;

    const previous = currentFeedback;
    setCurrentFeedback(feedbackType);
    setPendingFeedback(feedbackType);
    onFeedbackChange?.(feedbackType);

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

  return (
    <div className={`flex items-center ${sizeClasses[size]}`} role="group" aria-label="Rate this movie">
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
            className={`flex items-center justify-center rounded-lg transition-all duration-150 min-w-[36px] px-1 select-none ${
              sizeClasses[size]
            } ${
              isActive
                ? `${activeBg} ring-2 ${activeRing}`
                : 'opacity-70 hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700'
            } ${isPending && !isActive ? 'animate-pulse' : ''}`}
          >
            <span className="leading-none" aria-hidden>{emoji}</span>
          </button>
        );
      })}
      {showLabels && currentFeedback && (
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
          {FEEDBACK_REACTIONS.find((b) => b.type === currentFeedback)?.label}
        </span>
      )}
    </div>
  );
}
