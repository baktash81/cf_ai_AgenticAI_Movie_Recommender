// Movie preference types

export interface MoviePreferences {
  // Genre preferences
  favoriteGenres: string[];
  dislikedGenres: string[];
  
  // People preferences
  favoriteActors: string[];
  favoriteDirectors: string[];
  favoriteProducers?: string[];
  
  // Content preferences
  preferredLanguages: string[];
  preferredCountries?: string[]; // Production countries
  
  // Quality preferences
  minRating: number; // Minimum rating threshold (0-10)
  minVoteCount?: number; // Minimum votes for credibility
  
  // Era preferences
  preferredDecades?: string[]; // e.g., ["1990s", "2000s", "2010s"]
  preferredYears?: number[]; // Specific years
  
  // Content filters
  avoidAdultContent: boolean;
  preferredRuntime?: {
    min?: number; // Minutes
    max?: number;
  };
  
  // Discovery preferences
  watchHistory?: string[]; // Movie IDs user has watched
  watchlist?: string[]; // Movie IDs user wants to watch
  avoidMovies?: string[]; // Movie IDs to exclude
  
  // Recommendation style
  preferenceStyle: 'diverse' | 'similar' | 'trending' | 'classic' | 'balanced';
  
  // Update tracking
  lastUpdated?: number;
  confidence?: number; // How confident we are in these preferences (0-1)
}

export interface MoviePreferenceAnalysisResult {
  preferences: MoviePreferences;
  questions: string[]; // Clarification questions if needed
  confidence: number; // 0-1
  extractedFrom: string; // Original input text
}

export interface MovieIntent {
  type: 'search' | 'recommend' | 'discover' | 'similar' | 'trending';
  criteria?: {
    genres?: string[];
    actors?: string[];
    directors?: string[];
    dateRange?: { from?: string; to?: string };
    keywords?: string[];
  };
  confidence: number;
}
