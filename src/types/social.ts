// Social, Personalization & Discovery Types

import { MovieResult } from './movie';

// ============================================
// PERSONALIZATION TYPES
// ============================================

export type FeedbackType = 'like' | 'dislike' | 'love' | 'not_interested';

export interface MovieFeedback {
  feedbackId: string;
  userId: string;
  movieId: string;
  feedbackType: FeedbackType;
  rating?: number; // 1-10
  createdAt: string;
  updatedAt: string;
}

export interface TasteProfile {
  userId: string;
  genreScores: Record<string, number>; // {"Action": 0.8, "Comedy": 0.6}
  actorScores: Record<string, number>;
  directorScores: Record<string, number>;
  decadeScores: Record<string, number>; // {"2020s": 0.7, "1990s": 0.5}
  avgRatingPreference: number;
  totalFeedbackCount: number;
  profileStrength: number; // 0-1
  lastComputedAt: string;
}

export interface TasteProfileSummary {
  topGenres: Array<{ name: string; score: number }>;
  topActors: Array<{ name: string; score: number }>;
  topDirectors: Array<{ name: string; score: number }>;
  preferredDecades: Array<{ name: string; score: number }>;
  avgRatingPreference: number;
  profileStrength: number;
  totalMoviesRated: number;
}

export interface WatchHistoryItem {
  historyId: string;
  userId: string;
  movieId: string;
  movieData?: MovieResult;
  watchedAt: string;
  source: 'manual' | 'inferred' | 'imported';
}

// ============================================
// SOCIAL & ENGAGEMENT TYPES
// ============================================

export type WatchlistPriority = 0 | 1 | 2; // 0=normal, 1=high, 2=must watch

export interface WatchlistItem {
  watchlistId: string;
  userId: string;
  movieId: string;
  movieData: MovieResult;
  priority: WatchlistPriority;
  notes?: string;
  reminderDate?: string;
  tags: string[];
  addedAt: string;
  updatedAt: string;
}

export interface WatchlistAddRequest {
  movieId: string;
  movieData: MovieResult;
  priority?: WatchlistPriority;
  notes?: string;
  reminderDate?: string;
  tags?: string[];
}

export interface WatchlistUpdateRequest {
  priority?: WatchlistPriority;
  notes?: string;
  reminderDate?: string;
  tags?: string[];
}

export interface MovieReview {
  reviewId: string;
  userId: string;
  userName?: string;
  userAvatarUrl?: string;
  movieId: string;
  movieData?: MovieResult;
  rating: number; // 1-10
  title?: string;
  content?: string;
  containsSpoilers: boolean;
  isPublic: boolean;
  helpfulCount: number;
  userVote?: boolean; // Current user's vote
  createdAt: string;
  updatedAt: string;
}

export interface ReviewCreateRequest {
  movieId: string;
  movieData?: MovieResult;
  rating: number;
  title?: string;
  content?: string;
  containsSpoilers?: boolean;
  isPublic?: boolean;
}

export interface SharedList {
  listId: string;
  creatorId: string;
  creatorName?: string;
  title: string;
  description?: string;
  shareCode: string;
  movies: MovieResult[];
  isPublic: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface SharedListCreateRequest {
  title: string;
  description?: string;
  movies: MovieResult[];
  isPublic?: boolean;
  expiresAt?: string;
}

// ============================================
// CONTENT & DISCOVERY TYPES
// ============================================

export type CollectionType = 'curated' | 'seasonal' | 'trending' | 'genre' | 'decade' | 'director' | 'actor' | 'franchise';

export type SeasonType = 'winter' | 'summer' | 'halloween' | 'christmas' | 'valentine' | 'spring' | 'fall';

export interface CuratedCollection {
  collectionId: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  collectionType: CollectionType;
  criteria?: Record<string, unknown>;
  movies: MovieResult[];
  isActive: boolean;
  displayOrder: number;
  season?: SeasonType;
  validFrom?: string;
  validUntil?: string;
  isSaved?: boolean; // Whether current user has saved this
  createdAt: string;
  updatedAt: string;
}

export interface Franchise {
  franchiseId: string;
  name: string;
  description?: string;
  logoUrl?: string;
  totalMovies: number;
  movies: Array<{
    id: string;
    title: string;
    order: number;
    releaseDate: string;
    posterUrl?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface UserFranchiseProgress {
  progressId: string;
  userId: string;
  franchiseId: string;
  franchise?: Franchise;
  watchedMovieIds: string[];
  progressPercentage: number;
  lastWatchedAt?: string;
}

export interface SimilarMoviesResult {
  sourceMovieId: string;
  sourceMovieTitle: string;
  similarMovies: MovieResult[];
  cached: boolean;
}

// ============================================
// DISCOVERY HELPERS
// ============================================

export interface DiscoverySection {
  id: string;
  title: string;
  subtitle?: string;
  type: 'collection' | 'trending' | 'personalized' | 'recent' | 'similar';
  items: MovieResult[] | CuratedCollection[];
  viewAllLink?: string;
}

export interface PersonalizedRecommendation {
  movie: MovieResult;
  reasons: string[]; // ["Matches your love for Sci-Fi", "Similar to movies you've liked"]
  matchScore: number; // 0-1
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface FeedbackResponse {
  success: boolean;
  feedback: MovieFeedback;
  tasteProfileUpdated: boolean;
}

export interface WatchlistResponse {
  items: WatchlistItem[];
  totalCount: number;
  hasReminders: number;
}

export interface ReviewsResponse {
  reviews: MovieReview[];
  totalCount: number;
  averageRating?: number;
}

export interface CollectionsResponse {
  collections: CuratedCollection[];
  seasonal: CuratedCollection[];
  saved: CuratedCollection[];
}

export interface DiscoveryResponse {
  sections: DiscoverySection[];
  personalizedPicks?: PersonalizedRecommendation[];
  continueWatching?: UserFranchiseProgress[];
}
