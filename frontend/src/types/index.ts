// User types
export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  profileCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// Movie types
export interface Movie {
  id: string;
  title: string;
  originalTitle?: string;
  overview: string;
  releaseDate: string;
  genres: string[];
  actors: string[];
  director?: string;
  rating: number;
  voteCount: number;
  popularity: number;
  posterUrl?: string;
  backdropUrl?: string;
  runtime?: number;
  language: string;
  adult: boolean;
  budget?: number;
  revenue?: number;
  tagline?: string;
  productionCompanies?: string[];
}

export interface MovieSearchResult {
  movies: Movie[];
  count: number;
}

export interface SearchStatus {
  status: 'running' | 'completed' | 'failed' | 'unknown';
  resultCount?: number;
}

// Preferences types
export interface MoviePreferences {
  favoriteGenres: string[];
  dislikedGenres: string[];
  favoriteActors: string[];
  favoriteDirectors: string[];
  preferredLanguages: string[];
  minRating: number;
  preferredDecades?: string[];
  avoidAdultContent: boolean;
  preferenceStyle: 'diverse' | 'similar' | 'trending' | 'classic' | 'balanced';
  tasteSyncedAt?: string;
  tasteDerived?: boolean;
}

export interface PreferenceAnalysisResult {
  preferences: MoviePreferences;
  questions: string[];
  confidence: number;
  extractedFrom: string;
}

// Chat types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  searchId?: string;
  movies?: Movie[];
  isLoadingMovies?: boolean;
}

export interface ChatResponse {
  type: 'recommendation' | 'chat';
  message: string;
  searchId?: string;
  conversationId?: string;
  messageId?: string;
  movies?: Movie[]; // For filtered results returned directly
}

// Conversation types
export interface Conversation {
  conversation_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationWithMessages {
  conversation: Conversation;
  messages: Array<{
    message_id: string;
    role: 'user' | 'assistant';
    content: string;
    search_id?: string;
    movies?: Movie[];
    created_at: string;
  }>;
}

// ============================================
// PERSONALIZATION TYPES
// ============================================

export type FeedbackType = 'like' | 'dislike' | 'love' | 'not_interested';

export interface MovieFeedback {
  feedback_id: string;
  user_id: string;
  movie_id: string;
  feedback_type: FeedbackType;
  rating?: number;
  created_at: string;
  updated_at: string;
}

export interface FeedbackBreakdown {
  love: number;
  like: number;
  dislike: number;
  not_interested: number;
  total: number;
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

export interface TasteProfileResponse {
  profile: unknown | null;
  summary: TasteProfileSummary;
  feedbackBreakdown: FeedbackBreakdown;
  lastSyncedAt: string | null;
  synced?: boolean;
}

export interface WatchHistoryItem {
  history_id: string;
  user_id: string;
  movie_id: string;
  movieData?: Movie;
  watched_at: string;
  source: 'manual' | 'inferred' | 'imported';
}

// ============================================
// SOCIAL & ENGAGEMENT TYPES
// ============================================

export type WatchlistPriority = 0 | 1 | 2; // 0=normal, 1=high, 2=must watch

export interface WatchlistItem {
  watchlist_id: string;
  user_id: string;
  movie_id: string;
  movieData: Movie;
  priority: WatchlistPriority;
  notes?: string;
  reminder_date?: string;
  tags: string[];
  added_at: string;
  updated_at: string;
}

export interface WatchlistAddRequest {
  movieId: string;
  movieData: Movie;
  priority?: WatchlistPriority;
  notes?: string;
  reminderDate?: string;
  tags?: string[];
}

export interface MovieReview {
  review_id: string;
  user_id: string;
  user_name?: string;
  user_avatar_url?: string;
  movie_id: string;
  movieData?: Movie;
  rating: number;
  title?: string;
  content?: string;
  contains_spoilers: boolean;
  is_public: boolean;
  helpful_count: number;
  userVote?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewCreateRequest {
  movieId: string;
  movieData?: Movie;
  rating: number;
  title?: string;
  content?: string;
  containsSpoilers?: boolean;
  isPublic?: boolean;
}

export interface SharedList {
  list_id: string;
  creator_id: string;
  creator_name?: string;
  title: string;
  description?: string;
  share_code: string;
  movies: Movie[];
  is_public: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

// ============================================
// CONTENT & DISCOVERY TYPES
// ============================================

export type CollectionType = 'curated' | 'seasonal' | 'trending' | 'genre' | 'decade' | 'director' | 'actor' | 'franchise';

export interface CuratedCollection {
  collection_id: string;
  title: string;
  description?: string;
  cover_image_url?: string;
  collection_type: CollectionType;
  movies: Movie[];
  is_active: boolean;
  display_order: number;
  season?: string;
  isSaved?: boolean;
  isCurrentSeason?: boolean;
  created_at: string;
  updated_at: string;
}

export interface PersonDetails {
  id: number;
  name: string;
  biography?: string;
  birthday?: string;
  deathday?: string;
  placeOfBirth?: string;
  profilePath?: string;
  knownForDepartment: string;
  popularity: number;
  actingCredits: number;
  directingCredits: number;
}

export interface PersonSearchResult {
  id: number;
  name: string;
  profilePath?: string;
  knownForDepartment: string;
  popularity: number;
  knownFor: string[];
}

export interface WatchProvider {
  providerId: number;
  providerName: string;
  logoPath?: string;
}

export interface WatchProviders {
  link?: string;
  flatrate: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
}

export interface DiscoverySection {
  id: string;
  title: string;
  subtitle?: string;
  type: 'collection' | 'trending' | 'personalized' | 'recent' | 'similar';
  items: Movie[];
  viewAllLink?: string;
}

export interface DiscoveryResponse {
  sections: DiscoverySection[];
  personalizedPicks?: Array<{
    movie: Movie;
    reasons: string[];
    matchScore: number;
  }>;
}
