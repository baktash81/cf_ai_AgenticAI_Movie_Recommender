import { MovieSearchInfo, MovieCriteria } from './movie';
import { MoviePreferences } from './movie-preferences';

export interface MovieSearchState {
  activeSearches: MovieSearchInfo[];
  userPreferences?: MoviePreferences;
  lastSearchId?: string;
}

export interface MoviePreferenceState {
  analysisHistory: Array<{
    inputText: string;
    extractedPreferences: any;
    confidence: number;
    timestamp: number;
  }>;
  pendingQuestions: string[];
  lastAnalysis?: {
    preferences: MoviePreferences;
    confidence: number;
    timestamp: number;
  };
}

export interface BookingState {
  // Keep booking state for future features (e.g., watchlist management)
  watchlist: Array<{
    movieId: string;
    addedAt: number;
    priority?: number;
  }>;
  watchedHistory: Array<{
    movieId: string;
    watchedAt: number;
    rating?: number;
  }>;
}

export interface Env {
  // Durable Objects
  MOVIE_RECOMMENDATION_AGENT: DurableObjectNamespace<MovieSearchState>;
  MOVIE_PREFERENCE_ANALYSIS_AGENT: DurableObjectNamespace<MoviePreferenceState>;
  MOVIE_BOOKING_AGENT: DurableObjectNamespace<BookingState>;
  
  // Workflows
  MOVIE_SEARCH_WORKFLOW: WorkflowEntrypoint;
  MOVIE_BOOKING_WORKFLOW: WorkflowEntrypoint;
  
  // Database
  MOVIE_DB: D1Database;
  
  // Vectorize
  USER_MOVIE_PREFERENCES_VECTORIZE: VectorizeIndex;
  
  // AI
  AI: Ai;
  
  // Environment variables
  TMDB_API_KEY?: string;
  IMDB_API_KEY?: string; // Optional, if using IMDB
  JWT_SECRET?: string; // For authentication
}
