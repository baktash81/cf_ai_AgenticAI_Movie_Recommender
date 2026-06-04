import { MovieCriteria, MovieResult, MovieDetail, CastMember } from '../../types/movie';

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
   * Map TMDB list result to MovieResult without extra API calls (fast path for browse/discovery)
   */
  mapBasicMovie(movie: TMDBMovie): MovieResult {
    const genreNames = (movie.genre_ids || [])
      .map((id) => this.genreIdToName(id))
      .filter(Boolean) as string[];

    return {
      id: movie.id.toString(),
      title: movie.title,
      originalTitle: movie.original_title,
      overview: movie.overview || '',
      releaseDate: movie.release_date,
      genres: genreNames,
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

  private genreIdToName(id: number): string | undefined {
    const map: Record<number, string> = {
      28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
      99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
      27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction',
      10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
    };
    return map[id];
  }

  /**
   * Search for movies based on criteria
   */
  async searchMovies(
    criteria: MovieCriteria,
    options: { enrichDetails?: boolean } = {}
  ): Promise<MovieResult[]> {
    const enrichDetails = options.enrichDetails ?? true;
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
      const slice = data.results.slice(0, criteria.limit || 20);

      if (!enrichDetails) {
        return slice.map((movie) => this.mapBasicMovie(movie));
      }

      const moviesWithDetails = await Promise.all(
        slice.map((movie) => this.enrichMovieData(movie))
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
    
    // Date range - normalize dates to YYYY-MM-DD format
    // If year is specified, use primary_release_year (most reliable for single year)
    if (criteria.year) {
      url.searchParams.append('primary_release_year', criteria.year.toString());
    } else {
      // Handle releaseDateFrom - normalize to full date format
      if (criteria.releaseDateFrom) {
        const normalizedFrom = this.normalizeDateString(criteria.releaseDateFrom, 'start');
        url.searchParams.append('primary_release_date.gte', normalizedFrom);
      }
      // Handle releaseDateTo - normalize to full date format
      if (criteria.releaseDateTo) {
        const normalizedTo = this.normalizeDateString(criteria.releaseDateTo, 'end');
        url.searchParams.append('primary_release_date.lte', normalizedTo);
      }
    }
    
    // Genres (TMDB uses genre IDs, we'll need to map names to IDs)
    if (criteria.genres && criteria.genres.length > 0) {
      const genreIds = this.mapGenreNamesToIds(criteria.genres);
      if (genreIds.length > 0) {
        url.searchParams.append('with_genres', genreIds.join(','));
      }
    }
    
    // Exclude genres (for preference-based filtering)
    if (criteria.excludeGenres && criteria.excludeGenres.length > 0) {
      const excludeGenreIds = this.mapGenreNamesToIds(criteria.excludeGenres);
      if (excludeGenreIds.length > 0) {
        url.searchParams.append('without_genres', excludeGenreIds.join(','));
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
    
    // Runtime (minutes)
    if (criteria.runtimeMin !== undefined) {
      url.searchParams.append('with_runtime.gte', criteria.runtimeMin.toString());
    }
    if (criteria.runtimeMax !== undefined) {
      url.searchParams.append('with_runtime.lte', criteria.runtimeMax.toString());
    }

    // Adult content
    url.searchParams.append('include_adult', criteria.includeAdult === true ? 'true' : 'false');
    
    return url.toString();
  }

  /**
   * Normalize date string to YYYY-MM-DD format
   * Handles: "2025", "2025-01", "2025-01-15", etc.
   */
  private normalizeDateString(dateStr: string, type: 'start' | 'end'): string {
    const trimmed = dateStr.trim();
    
    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    
    // Just a year: "2025"
    if (/^\d{4}$/.test(trimmed)) {
      return type === 'start' ? `${trimmed}-01-01` : `${trimmed}-12-31`;
    }
    
    // Year and month: "2025-06"
    if (/^\d{4}-\d{2}$/.test(trimmed)) {
      if (type === 'start') {
        return `${trimmed}-01`;
      } else {
        // Get last day of month
        const [year, month] = trimmed.split('-').map(Number);
        const lastDay = new Date(year, month, 0).getDate();
        return `${trimmed}-${lastDay.toString().padStart(2, '0')}`;
      }
    }
    
    // Try to parse and format
    try {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {
      // Fall through to default
    }
    
    // Default: assume it's a year
    const yearMatch = trimmed.match(/\d{4}/);
    if (yearMatch) {
      return type === 'start' ? `${yearMatch[0]}-01-01` : `${yearMatch[0]}-12-31`;
    }
    
    // Last resort: return as-is
    return trimmed;
  }

  /**
   * Enrich movie data with cast, director, and additional details
   */
  private async enrichMovieData(movie: TMDBMovie): Promise<MovieResult> {
    try {
      // Single request: details + credits (was 2 requests per movie)
      const detailsUrl = `${this.baseUrl}/movie/${movie.id}?api_key=${this.apiKey}&append_to_response=credits`;
      const detailsResponse = await fetch(detailsUrl);
      const details = (await detailsResponse.json()) as TMDBDetails & { credits?: TMDBCredits };
      const credits = details.credits;
      
      // Get director
      const director = credits?.crew?.find((person) => person.job === 'Director')?.name;
      
      // Get main cast (top 5)
      const mainCast = (credits?.cast || [])
        .slice(0, 5)
        .map((actor) => actor.name);
      
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

  /**
   * Get similar movies to a given movie
   */
  async getSimilarMovies(movieId: string, limit: number = 10): Promise<MovieResult[]> {
    try {
      const url = `${this.baseUrl}/movie/${movieId}/similar?api_key=${this.apiKey}&page=1`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.statusText}`);
      }

      const data: TMDBResponse = await response.json();
      
      const enriched = await Promise.all(
        data.results.slice(0, limit).map(movie => this.enrichMovieData(movie))
      );

      return enriched;
    } catch (error) {
      console.error('Error getting similar movies:', error);
      return [];
    }
  }

  /**
   * Get movie recommendations (TMDB's recommendation engine)
   */
  async getRecommendations(movieId: string, limit: number = 10): Promise<MovieResult[]> {
    try {
      const url = `${this.baseUrl}/movie/${movieId}/recommendations?api_key=${this.apiKey}&page=1`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.statusText}`);
      }

      const data: TMDBResponse = await response.json();
      
      const enriched = await Promise.all(
        data.results.slice(0, limit).map(movie => this.enrichMovieData(movie))
      );

      return enriched;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return [];
    }
  }

  /**
   * Get watch providers (streaming services) for a movie
   */
  async getWatchProviders(movieId: string, region: string = 'US'): Promise<WatchProviders | null> {
    try {
      const url = `${this.baseUrl}/movie/${movieId}/watch/providers?api_key=${this.apiKey}`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.statusText}`);
      }

      const data = await response.json();
      const regionData = data.results?.[region];

      if (!regionData) {
        return null;
      }

      return {
        link: regionData.link,
        flatrate: (regionData.flatrate || []).map((p: any) => ({
          providerId: p.provider_id,
          providerName: p.provider_name,
          logoPath: p.logo_path ? `https://image.tmdb.org/t/p/original${p.logo_path}` : undefined
        })),
        rent: (regionData.rent || []).map((p: any) => ({
          providerId: p.provider_id,
          providerName: p.provider_name,
          logoPath: p.logo_path ? `https://image.tmdb.org/t/p/original${p.logo_path}` : undefined
        })),
        buy: (regionData.buy || []).map((p: any) => ({
          providerId: p.provider_id,
          providerName: p.provider_name,
          logoPath: p.logo_path ? `https://image.tmdb.org/t/p/original${p.logo_path}` : undefined
        }))
      };
    } catch (error) {
      console.error('Error getting watch providers:', error);
      return null;
    }
  }

  /**
   * Get trending movies
   */
  async getTrending(
    timeWindow: 'day' | 'week' = 'week',
    limit: number = 20,
    enrichDetails: boolean = false
  ): Promise<MovieResult[]> {
    try {
      const url = `${this.baseUrl}/trending/movie/${timeWindow}?api_key=${this.apiKey}`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.statusText}`);
      }

      const data: TMDBResponse = await response.json();
      const slice = data.results.slice(0, limit);

      if (!enrichDetails) {
        return slice.map((movie) => this.mapBasicMovie(movie));
      }

      const enriched = await Promise.all(slice.map((movie) => this.enrichMovieData(movie)));

      return enriched;
    } catch (error) {
      console.error('Error getting trending movies:', error);
      return [];
    }
  }

  /**
   * Get person details (actor/director)
   */
  async getPersonDetails(personId: number): Promise<PersonDetails | null> {
    try {
      const url = `${this.baseUrl}/person/${personId}?api_key=${this.apiKey}&append_to_response=movie_credits`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        id: data.id,
        name: data.name,
        biography: data.biography,
        birthday: data.birthday,
        deathday: data.deathday,
        placeOfBirth: data.place_of_birth,
        profilePath: data.profile_path ? `${this.imageBaseUrl}${data.profile_path}` : undefined,
        knownForDepartment: data.known_for_department,
        popularity: data.popularity,
        actingCredits: (data.movie_credits?.cast || []).length,
        directingCredits: (data.movie_credits?.crew || []).filter((c: any) => c.job === 'Director').length
      };
    } catch (error) {
      console.error('Error getting person details:', error);
      return null;
    }
  }

  /**
   * Search for a person by name
   */
  async searchPerson(name: string): Promise<PersonSearchResult[]> {
    try {
      const url = `${this.baseUrl}/search/person?api_key=${this.apiKey}&query=${encodeURIComponent(name)}`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      return (data.results || []).slice(0, 10).map((p: any) => ({
        id: p.id,
        name: p.name,
        profilePath: p.profile_path ? `${this.imageBaseUrl}${p.profile_path}` : undefined,
        knownForDepartment: p.known_for_department,
        popularity: p.popularity,
        knownFor: (p.known_for || []).map((m: any) => m.title || m.name).slice(0, 3)
      }));
    } catch (error) {
      console.error('Error searching person:', error);
      return [];
    }
  }

  /**
   * Get movie collection/franchise
   */
  async getCollection(collectionId: number): Promise<MovieCollection | null> {
    try {
      const url = `${this.baseUrl}/collection/${collectionId}?api_key=${this.apiKey}`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      // Enrich all movies in the collection
      const enrichedMovies = await Promise.all(
        (data.parts || []).map((movie: TMDBMovie) => this.enrichMovieData(movie))
      );

      return {
        id: data.id,
        name: data.name,
        overview: data.overview,
        posterPath: data.poster_path ? `${this.imageBaseUrl}${data.poster_path}` : undefined,
        backdropPath: data.backdrop_path ? `${this.imageBaseUrl}${data.backdrop_path}` : undefined,
        movies: enrichedMovies.sort((a, b) => 
          new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()
        )
      };
    } catch (error) {
      console.error('Error getting collection:', error);
      return null;
    }
  }

  /**
   * Browse TMDB catalog: text search or discover with filters
   */
  async browseMovies(criteria: MovieCriteria): Promise<{
    movies: MovieResult[];
    page: number;
    totalPages: number;
    totalResults: number;
  }> {
    const page = criteria.page || 1;
    const limit = Math.min(criteria.limit || 20, 40);

    if (criteria.query?.trim()) {
      return this.searchByTitle(criteria.query.trim(), page, criteria.year, limit);
    }

    if (criteria.actors?.[0] && !criteria.genres?.length) {
      const movies = await this.searchByActor(criteria.actors[0], {
        ...criteria,
        limit,
        page,
      });
      return {
        movies,
        page: 1,
        totalPages: 1,
        totalResults: movies.length,
      };
    }

    if (criteria.directors?.[0] && !criteria.genres?.length) {
      const movies = await this.searchByDirector(criteria.directors[0], {
        ...criteria,
        limit,
        page,
      });
      return {
        movies,
        page: 1,
        totalPages: 1,
        totalResults: movies.length,
      };
    }

    const url = this.buildSearchUrl({ ...criteria, page, limit });
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      throw new Error(`TMDB browse error: ${response.statusText}`);
    }
    const data: TMDBResponse = await response.json();
    return {
      movies: data.results.map((m) => this.mapBasicMovie(m)),
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results,
    };
  }

  private async searchByTitle(
    query: string,
    page: number,
    year?: number,
    limit = 20
  ): Promise<{ movies: MovieResult[]; page: number; totalPages: number; totalResults: number }> {
    const url = new URL(`${this.baseUrl}/search/movie`);
    url.searchParams.append('api_key', this.apiKey);
    url.searchParams.append('query', query);
    url.searchParams.append('page', page.toString());
    url.searchParams.append('include_adult', 'false');
    if (year) url.searchParams.append('year', year.toString());

    const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      throw new Error(`TMDB search error: ${response.statusText}`);
    }
    const data: TMDBResponse = await response.json();
    return {
      movies: data.results.slice(0, limit).map((m) => this.mapBasicMovie(m)),
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results,
    };
  }

  /**
   * Full movie detail for detail drawer (cast, facts, large poster)
   */
  async getMovieDetail(movieId: string): Promise<MovieDetail | null> {
    const id = movieId.replace(/\D/g, '') || movieId;
    try {
      const url = `${this.baseUrl}/movie/${id}?api_key=${this.apiKey}&append_to_response=credits,keywords`;
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) return null;

      const data = await response.json() as TMDBDetails & {
        credits?: TMDBCredits & {
          cast?: Array<{
            id: number;
            name: string;
            character: string;
            profile_path: string | null;
            order: number;
          }>;
          crew?: Array<{ name: string; job: string; department?: string }>;
        };
        keywords?: { keywords?: Array<{ name: string }> };
        belongs_to_collection?: { name: string };
        imdb_id?: string;
        homepage?: string;
        status?: string;
        production_countries?: Array<{ name: string }>;
        spoken_languages?: Array<{ english_name: string }>;
        poster_path?: string | null;
      };

      const cast: CastMember[] = (data.credits?.cast || [])
        .slice(0, 15)
        .map((c) => ({
          id: c.id,
          name: c.name,
          character: c.character,
          profileUrl: c.profile_path
            ? `https://image.tmdb.org/t/p/w185${c.profile_path}`
            : undefined,
          order: c.order,
        }));

      const facts: string[] = [];
      if (data.tagline) facts.push(`Tagline: "${data.tagline}"`);
      if (data.runtime) facts.push(`Runtime: ${data.runtime} minutes`);
      if (data.budget && data.budget > 0) {
        facts.push(`Budget: $${(data.budget / 1_000_000).toFixed(1)}M`);
      }
      if (data.revenue && data.revenue > 0) {
        facts.push(`Box office: $${(data.revenue / 1_000_000).toFixed(1)}M`);
      }
      if (data.production_countries?.length) {
        facts.push(`Made in: ${data.production_countries.map((c) => c.name).join(', ')}`);
      }
      if (data.belongs_to_collection?.name) {
        facts.push(`Part of the ${data.belongs_to_collection.name} collection`);
      }
      if (data.vote_count > 100) {
        facts.push(`Rated by ${data.vote_count.toLocaleString()} TMDB users`);
      }

      const genreNames = data.genres?.map((g) => g.name) || [];
      const director = data.credits?.crew?.find((p) => p.job === 'Director')?.name;

      return {
        id: data.id.toString(),
        title: data.title,
        originalTitle: data.original_title,
        overview: data.overview || '',
        releaseDate: data.release_date,
        genres: genreNames,
        actors: cast.slice(0, 5).map((c) => c.name),
        director,
        rating: data.vote_average,
        voteCount: data.vote_count,
        popularity: data.popularity,
        posterUrl: data.poster_path
          ? `${this.imageBaseUrl}${data.poster_path}`
          : undefined,
        posterUrlLarge: data.poster_path
          ? `https://image.tmdb.org/t/p/w780${data.poster_path}`
          : undefined,
        backdropUrl: data.backdrop_path
          ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`
          : undefined,
        runtime: data.runtime,
        language: data.original_language,
        adult: data.adult,
        budget: data.budget,
        revenue: data.revenue,
        tagline: data.tagline,
        productionCompanies: data.production_companies?.map((c) => c.name),
        cast,
        crew: (data.credits?.crew || []).slice(0, 12),
        keywords: (data.keywords?.keywords || []).slice(0, 12).map((k) => k.name),
        facts,
        status: data.status,
        imdbId: data.imdb_id,
        homepage: data.homepage,
        productionCountries: (data.production_countries || []).map((c) => c.name),
        spokenLanguages: (data.spoken_languages || []).map((l) => l.english_name),
        collectionName: data.belongs_to_collection?.name,
      };
    } catch (error) {
      console.error('Error getting movie detail:', error);
      return null;
    }
  }

  /** Genre list for browse filters */
  getGenreList(): Array<{ id: number; name: string }> {
    return [
      { id: 28, name: 'Action' },
      { id: 12, name: 'Adventure' },
      { id: 16, name: 'Animation' },
      { id: 35, name: 'Comedy' },
      { id: 80, name: 'Crime' },
      { id: 99, name: 'Documentary' },
      { id: 18, name: 'Drama' },
      { id: 10751, name: 'Family' },
      { id: 14, name: 'Fantasy' },
      { id: 36, name: 'History' },
      { id: 27, name: 'Horror' },
      { id: 10402, name: 'Music' },
      { id: 9648, name: 'Mystery' },
      { id: 10749, name: 'Romance' },
      { id: 878, name: 'Science Fiction' },
      { id: 10770, name: 'TV Movie' },
      { id: 53, name: 'Thriller' },
      { id: 10752, name: 'War' },
      { id: 37, name: 'Western' },
    ];
  }
}

// Additional types for new methods
export interface WatchProvider {
  providerId: number;
  providerName: string;
  logoPath?: string;
}

export interface WatchProviders {
  link?: string;
  flatrate: WatchProvider[]; // Streaming subscriptions
  rent: WatchProvider[];
  buy: WatchProvider[];
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

export interface MovieCollection {
  id: number;
  name: string;
  overview?: string;
  posterPath?: string;
  backdropPath?: string;
  movies: MovieResult[];
}
