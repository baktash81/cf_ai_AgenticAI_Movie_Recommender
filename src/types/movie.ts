// Movie recommendation types

export interface MovieRequest {
  userId: string;
  isStructured?: boolean;
  criteria?: MovieCriteria;
  naturalLanguage?: string; // e.g., "movies from 2020 to 2024 with Tom Hanks"
}

export interface MovieCriteria {
  // Date range
  releaseDateFrom?: string; // YYYY-MM-DD or YYYY
  releaseDateTo?: string;
  year?: number; // Specific year
  
  // Content filters
  genres?: string[]; // e.g., ["Action", "Drama", "Comedy"]
  actors?: string[]; // Actor names
  directors?: string[]; // Director names
  keywords?: string[]; // Search keywords
  
  // Quality filters
  minRating?: number; // 0-10 (TMDB uses 0-10 scale)
  minVoteCount?: number; // Minimum number of votes
  
  // Language and region
  language?: string; // ISO 639-1 code (e.g., "en")
  region?: string; // ISO 3166-1 code (e.g., "US")
  
  // Pagination
  page?: number;
  limit?: number; // Results per page (max 20 for TMDB)
  
  // Sorting
  sortBy?: 'popularity' | 'rating' | 'release_date' | 'revenue' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface MovieResult {
  id: string; // TMDB movie ID
  title: string;
  originalTitle?: string;
  overview: string;
  releaseDate: string;
  genres: string[];
  actors: string[]; // Main cast
  director?: string;
  rating: number; // Average rating (0-10)
  voteCount: number;
  popularity: number;
  posterUrl?: string;
  backdropUrl?: string;
  runtime?: number; // Minutes
  language: string;
  adult: boolean;
  // Additional metadata
  budget?: number;
  revenue?: number;
  tagline?: string;
  productionCompanies?: string[];
  similarMovies?: string[]; // IDs of similar movies
}

export interface MovieSearchInfo {
  id: string; // Search ID
  userId: string;
  criteria: MovieCriteria;
  status: 'running' | 'completed' | 'failed';
  resultCount: number;
  createdAt: number;
  completedAt?: number;
}

export interface MovieRecommendationResult {
  movies: MovieResult[];
  totalResults: number;
  page: number;
  totalPages: number;
  searchId: string;
  personalized: boolean; // Whether results were personalized based on user preferences
}
