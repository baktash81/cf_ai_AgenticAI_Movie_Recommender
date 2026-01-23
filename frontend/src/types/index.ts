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

// Watchlist types
export interface WatchlistItem {
  movie_id: string;
  added_at: string;
  priority: number;
}
