import { MovieCriteria, MovieResult } from '../../types/movie';

interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  genre_ids: number[];
  vote_average: number;
  vote_count: number;
  popularity: number;
  poster_path: string | null;
  backdrop_path: string | null;
  adult: boolean;
  original_language: string;
}

interface TMDBCredits {
  cast: Array<{
    name: string;
    character: string;
    order: number;
  }>;
  crew: Array<{
    name: string;
    job: string;
  }>;
}

interface TMDBDetails extends TMDBMovie {
  runtime: number;
  budget: number;
  revenue: number;
  tagline: string;
  production_companies: Array<{ name: string }>;
  genres: Array<{ id: number; name: string }>;
}

interface TMDBResponse {
  results: TMDBMovie[];
  page: number;
  total_pages: number;
  total_results: number;
}

export class TMDBAPI {
  private apiKey: string;
  private baseUrl = 'https://api.themoviedb.org/3';
  private imageBaseUrl = 'https://image.tmdb.org/t/p/w500';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Search for movies based on criteria
   */
  async searchMovies(criteria: MovieCriteria): Promise<MovieResult[]> {
    try {
      // Build search/discover URL based on criteria
      const url = this.buildSearchUrl(criteria);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('TMDB API error details:', errorText);
        throw new Error(`TMDB API error: ${response.statusText} - ${errorText.substring(0, 200)}`);
      }

      const data: TMDBResponse = await response.json();
      
      // Fetch additional details for each movie (cast, director, etc.)
      const moviesWithDetails = await Promise.all(
        data.results.slice(0, criteria.limit || 20).map(movie => 
          this.enrichMovieData(movie)
        )
      );

      return moviesWithDetails;
    } catch (error) {
      console.error('TMDB API error:', error);
      return [];
    }
  }

  /**
   * Build search URL based on criteria
   */
  private buildSearchUrl(criteria: MovieCriteria): string {
    const url = new URL(`${this.baseUrl}/discover/movie`);
    url.searchParams.append('api_key', this.apiKey);
    
    // Date range
    if (criteria.releaseDateFrom) {
      url.searchParams.append('primary_release_date.gte', criteria.releaseDateFrom);
    }
    if (criteria.releaseDateTo) {
      url.searchParams.append('primary_release_date.lte', criteria.releaseDateTo);
    }
    if (criteria.year) {
      url.searchParams.append('primary_release_year', criteria.year.toString());
    }
    
    // Genres (TMDB uses genre IDs, we'll need to map names to IDs)
    if (criteria.genres && criteria.genres.length > 0) {
      const genreIds = this.mapGenreNamesToIds(criteria.genres);
      if (genreIds.length > 0) {
        url.searchParams.append('with_genres', genreIds.join(','));
      }
    }
    
    // Rating
    if (criteria.minRating !== undefined) {
      url.searchParams.append('vote_average.gte', criteria.minRating.toString());
    }
    if (criteria.minVoteCount !== undefined) {
      url.searchParams.append('vote_count.gte', criteria.minVoteCount.toString());
    }
    
    // Language and region
    if (criteria.language) {
      url.searchParams.append('with_original_language', criteria.language);
    }
    if (criteria.region) {
      url.searchParams.append('region', criteria.region);
    }
    
    // Sorting
    const sortBy = criteria.sortBy || 'popularity';
    const sortOrder = criteria.sortOrder || 'desc';
    url.searchParams.append('sort_by', `${sortBy}.${sortOrder}`);
    
    // Pagination
    url.searchParams.append('page', (criteria.page || 1).toString());
    
    // Adult content
    url.searchParams.append('include_adult', 'false');
    
    return url.toString();
  }

  /**
   * Enrich movie data with cast, director, and additional details
   */
  private async enrichMovieData(movie: TMDBMovie): Promise<MovieResult> {
    try {
      // Fetch movie details
      const detailsUrl = `${this.baseUrl}/movie/${movie.id}?api_key=${this.apiKey}`;
      const detailsResponse = await fetch(detailsUrl);
      const details: TMDBDetails = await detailsResponse.json();
      
      // Fetch credits (cast and crew)
      const creditsUrl = `${this.baseUrl}/movie/${movie.id}/credits?api_key=${this.apiKey}`;
      const creditsResponse = await fetch(creditsUrl);
      const credits: TMDBCredits = await creditsResponse.json();
      
      // Get director
      const director = credits.crew.find(person => person.job === 'Director')?.name;
      
      // Get main cast (top 5)
      const mainCast = credits.cast
        .slice(0, 5)
        .map(actor => actor.name);
      
      // Map genre IDs to names
      const genreNames = details.genres.map(g => g.name);
      
      return {
        id: movie.id.toString(),
        title: movie.title,
        originalTitle: movie.original_title,
        overview: movie.overview || details.overview || '',
        releaseDate: movie.release_date,
        genres: genreNames,
        actors: mainCast,
        director: director,
        rating: movie.vote_average,
        voteCount: movie.vote_count,
        popularity: movie.popularity,
        posterUrl: movie.poster_path ? `${this.imageBaseUrl}${movie.poster_path}` : undefined,
        backdropUrl: movie.backdrop_path ? `${this.imageBaseUrl}${movie.backdrop_path}` : undefined,
        runtime: details.runtime,
        language: movie.original_language,
        adult: movie.adult,
        budget: details.budget,
        revenue: details.revenue,
        tagline: details.tagline,
        productionCompanies: details.production_companies.map(c => c.name),
      };
    } catch (error) {
      console.error(`Error enriching movie ${movie.id}:`, error);
      // Return basic data if enrichment fails
      return {
        id: movie.id.toString(),
        title: movie.title,
        originalTitle: movie.original_title,
        overview: movie.overview || '',
        releaseDate: movie.release_date,
        genres: [],
        actors: [],
        rating: movie.vote_average,
        voteCount: movie.vote_count,
        popularity: movie.popularity,
        posterUrl: movie.poster_path ? `${this.imageBaseUrl}${movie.poster_path}` : undefined,
        backdropUrl: movie.backdrop_path ? `${this.imageBaseUrl}${movie.backdrop_path}` : undefined,
        language: movie.original_language,
        adult: movie.adult,
      };
    }
  }

  /**
   * Map genre names to TMDB genre IDs
   */
  private mapGenreNamesToIds(genreNames: string[]): number[] {
    const genreMap: Record<string, number> = {
      'Action': 28,
      'Adventure': 12,
      'Animation': 16,
      'Comedy': 35,
      'Crime': 80,
      'Documentary': 99,
      'Drama': 18,
      'Family': 10751,
      'Fantasy': 14,
      'History': 36,
      'Horror': 27,
      'Music': 10402,
      'Mystery': 9648,
      'Romance': 10749,
      'Science Fiction': 878,
      'Sci-Fi': 878,
      'SciFi': 878,
      'Science-Fiction': 878,
      'SF': 878,
      'TV Movie': 10770,
      'Thriller': 53,
      'War': 10752,
      'Western': 37,
    };
    
    // Normalize genre names for matching
    const normalizeGenre = (name: string): string => {
      return name.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/scifi|sciencefiction|sf/g, 'sciencefiction');
    };
    
    return genreNames
      .map(name => {
        // Try exact match first
        if (genreMap[name]) return genreMap[name];
        
        // Try case-insensitive match
        const lowerName = name.toLowerCase();
        if (genreMap[lowerName]) return genreMap[lowerName];
        
        // Try normalized match
        const normalized = normalizeGenre(name);
        for (const [key, value] of Object.entries(genreMap)) {
          if (normalizeGenre(key) === normalized) {
            return value;
          }
        }
        
        return undefined;
      })
      .filter(id => id !== undefined) as number[];
  }

  /**
   * Search movies by actor name
   */
  async searchByActor(actorName: string, criteria?: MovieCriteria): Promise<MovieResult[]> {
    try {
      // First, search for the person
      const personSearchUrl = `${this.baseUrl}/search/person?api_key=${this.apiKey}&query=${encodeURIComponent(actorName)}`;
      const personResponse = await fetch(personSearchUrl);
      const personData = await personResponse.json();
      
      if (!personData.results || personData.results.length === 0) {
        return [];
      }
      
      const personId = personData.results[0].id;
      
      // Get movies for this person
      const moviesUrl = `${this.baseUrl}/person/${personId}/movie_credits?api_key=${this.apiKey}`;
      const moviesResponse = await fetch(moviesUrl);
      const moviesData = await moviesResponse.json();
      
      // Enrich and filter
      const movies = moviesData.cast || [];
      const enriched = await Promise.all(
        movies.slice(0, criteria?.limit || 20).map((movie: TMDBMovie) => 
          this.enrichMovieData(movie)
        )
      );
      
      return enriched;
    } catch (error) {
      console.error('Error searching by actor:', error);
      return [];
    }
  }

  /**
   * Search movies by director
   */
  async searchByDirector(directorName: string, criteria?: MovieCriteria): Promise<MovieResult[]> {
    try {
      // Similar to searchByActor but filter by director role
      const personSearchUrl = `${this.baseUrl}/search/person?api_key=${this.apiKey}&query=${encodeURIComponent(directorName)}`;
      const personResponse = await fetch(personSearchUrl);
      const personData = await personResponse.json();
      
      if (!personData.results || personData.results.length === 0) {
        return [];
      }
      
      const personId = personData.results[0].id;
      
      // Get movies where this person was director
      const moviesUrl = `${this.baseUrl}/person/${personId}/movie_credits?api_key=${this.apiKey}`;
      const moviesResponse = await fetch(moviesUrl);
      const moviesData = await moviesResponse.json();
      
      // Filter to only director credits
      const directorMovies = (moviesData.crew || []).filter(
        (credit: { job: string }) => credit.job === 'Director'
      );
      
      const enriched = await Promise.all(
        directorMovies.slice(0, criteria?.limit || 20).map((movie: TMDBMovie) => 
          this.enrichMovieData(movie)
        )
      );
      
      return enriched;
    } catch (error) {
      console.error('Error searching by director:', error);
      return [];
    }
  }
}
