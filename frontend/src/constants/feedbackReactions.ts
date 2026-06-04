import type { FeedbackType } from '../types';

export interface FeedbackReaction {
  type: FeedbackType;
  emoji: string;
  label: string;
  activeRing: string;
  activeBg: string;
}

/** Very happy → happy → neutral → sad → crying */
export const FEEDBACK_REACTIONS: FeedbackReaction[] = [
  {
    type: 'love',
    emoji: '😄',
    label: 'Love it',
    activeRing: 'ring-amber-400',
    activeBg: 'bg-amber-50 dark:bg-amber-900/30',
  },
  {
    type: 'like',
    emoji: '🙂',
    label: 'Like',
    activeRing: 'ring-green-400',
    activeBg: 'bg-green-50 dark:bg-green-900/30',
  },
  {
    type: 'not_interested',
    emoji: '😐',
    label: 'Neutral',
    activeRing: 'ring-gray-400',
    activeBg: 'bg-gray-100 dark:bg-gray-700',
  },
  {
    type: 'dislike',
    emoji: '☹️',
    label: 'Sad',
    activeRing: 'ring-orange-400',
    activeBg: 'bg-orange-50 dark:bg-orange-900/30',
  },
  {
    type: 'hate',
    emoji: '😢',
    label: 'Hate it',
    activeRing: 'ring-red-400',
    activeBg: 'bg-red-50 dark:bg-red-900/30',
  },
];
