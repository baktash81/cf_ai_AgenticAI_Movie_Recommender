import { MovieResult } from '../types/movie';

export class DataNormalizer {
  /**
   * Deduplicate movies based on movie ID
   */
  static deduplicateMovies(movies: MovieResult[]): MovieResult[] {
    const seen = new Map<string, MovieResult>();

    for (const movie of movies) {
      if (!seen.has(movie.id)) {
        seen.set(movie.id, movie);
      } else {
        // Keep the one with more complete data
        const existing = seen.get(movie.id)!;
        if ((movie.actors.length > existing.actors.length) || 
            (movie.genres.length > existing.genres.length) ||
            (movie.overview && !existing.overview)) {
          seen.set(movie.id, movie);
        }
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Enrich movie data with additional information
   */
  static enrichMovieData(movie: MovieResult): MovieResult {
    // Add any additional enrichment logic here
    // For now, just return as-is
    return movie;
  }

  /**
   * Normalize genre names (handle variations)
   */
  static normalizeGenreName(genre: string): string {
    const genreMap: Record<string, string> = {
      'sci-fi': 'Science Fiction',
      'sci fi': 'Science Fiction',
      'scifi': 'Science Fiction',
    };
    
    const lower = genre.toLowerCase();
    return genreMap[lower] || genre;
  }

  /**
   * Validate and clean movie results
   */
  static validateResults(results: MovieResult[]): MovieResult[] {
    return results.filter(result => {
      // Basic validation
      return result.id && 
             result.title && 
             result.releaseDate &&
             result.rating >= 0 &&
             result.rating <= 10;
    });
  }

  /**
   * Sort movies by various criteria
   */
  static sortMovies(
    movies: MovieResult[], 
    sortBy: 'rating' | 'popularity' | 'releaseDate' | 'title' = 'rating',
    order: 'asc' | 'desc' = 'desc'
  ): MovieResult[] {
    const sorted = [...movies];
    
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'rating':
          comparison = a.rating - b.rating;
          break;
        case 'popularity':
          comparison = a.popularity - b.popularity;
          break;
        case 'releaseDate':
          comparison = new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
      }
      
      return order === 'desc' ? -comparison : comparison;
    });
    
    return sorted;
  }
}
