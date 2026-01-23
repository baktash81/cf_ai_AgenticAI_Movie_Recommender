import { WorkflowEntrypoint } from 'cloudflare:workers';
import { Env } from '../types/movie-agent-state';
import { MovieCriteria, MovieResult } from '../types/movie';
import { MoviePreferences } from '../types/movie-preferences';
import { TMDBAPI } from '../tools/movie-apis/tmdb';

interface MovieSearchParams {
  criteria: MovieCriteria;
  agentId: string;
  userId: string;
  userPreferences?: MoviePreferences;
}

export class MovieSearchWorkflow extends WorkflowEntrypoint<Env, MovieSearchParams> {
  
  async run(event: WorkflowEvent<MovieSearchParams>) {
    const { criteria, agentId, userId, userPreferences } = event.payload;
    
    const searchId = agentId || event.workflowId || `workflow-${Date.now()}`;
    
    console.log(`Starting movie search workflow (searchId: ${searchId})`);
    
    try {
      // Step 1: Search TMDB API
      const searchResults = await this.searchMovies(criteria);
      
      // Step 2: Apply user preferences if available
      const personalizedResults = userPreferences 
        ? await this.applyPersonalization(searchResults, userPreferences)
        : searchResults;
      
      // Step 3: Store results
      await this.storeResults(searchId, personalizedResults, criteria);
      
      // Step 4: Update search status
      await this.updateSearchStatus(searchId, 'completed');
      
      return { 
        results: personalizedResults,
        count: personalizedResults.length
      };
    } catch (error) {
      console.error('Workflow error:', error);
      await this.updateSearchStatus(searchId, 'failed');
      throw error;
    }
  }
  
  async searchMovies(criteria: MovieCriteria): Promise<MovieResult[]> {
    if (!this.env.TMDB_API_KEY) {
      throw new Error('TMDB_API_KEY not configured');
    }
    
    const tmdb = new TMDBAPI(this.env.TMDB_API_KEY);
    const results: MovieResult[] = [];
    
    // If actors specified, search by actor
    if (criteria.actors && criteria.actors.length > 0) {
      for (const actor of criteria.actors.slice(0, 2)) { // Limit to 2 actors
        const actorResults = await tmdb.searchByActor(actor, criteria);
        results.push(...actorResults);
      }
    }
    
    // If directors specified, search by director
    if (criteria.directors && criteria.directors.length > 0) {
      for (const director of criteria.directors.slice(0, 2)) {
        const directorResults = await tmdb.searchByDirector(director, criteria);
        results.push(...directorResults);
      }
    }
    
    // General search/discover
    if (results.length === 0 || (!criteria.actors && !criteria.directors)) {
      const generalResults = await tmdb.searchMovies(criteria);
      results.push(...generalResults);
    }
    
    // Deduplicate by movie ID
    const uniqueResults = Array.from(
      new Map(results.map(movie => [movie.id, movie])).values()
    );
    
    // Sort by relevance (rating * popularity)
    uniqueResults.sort((a, b) => 
      (b.rating * b.popularity) - (a.rating * a.popularity)
    );
    
    // Limit results
    return uniqueResults.slice(0, criteria.limit || 20);
  }
  
  async applyPersonalization(
    movies: MovieResult[],
    preferences: MoviePreferences
  ): Promise<MovieResult[]> {
    let filtered = movies;
    
    // Filter by genres
    if (preferences.favoriteGenres.length > 0) {
      filtered = filtered.filter(movie => 
        movie.genres.some(genre => 
          preferences.favoriteGenres.some(fav => 
            genre.toLowerCase().includes(fav.toLowerCase())
          )
        )
      );
    }
    
    // Filter out disliked genres
    if (preferences.dislikedGenres.length > 0) {
      filtered = filtered.filter(movie => 
        !movie.genres.some(genre => 
          preferences.dislikedGenres.some(disliked => 
            genre.toLowerCase().includes(disliked.toLowerCase())
          )
        )
      );
    }
    
    // Filter by rating
    if (preferences.minRating > 0) {
      filtered = filtered.filter(movie => movie.rating >= preferences.minRating);
    }
    
    // Filter by actors
    if (preferences.favoriteActors.length > 0) {
      filtered = filtered.filter(movie =>
        preferences.favoriteActors.some(actor =>
          movie.actors.some(movieActor =>
            movieActor.toLowerCase().includes(actor.toLowerCase())
          )
        )
      );
    }
    
    // Filter by directors
    if (preferences.favoriteDirectors.length > 0 && preferences.favoriteDirectors.length > 0) {
      filtered = filtered.filter(movie =>
        movie.director && preferences.favoriteDirectors.some(director =>
          movie.director!.toLowerCase().includes(director.toLowerCase())
        )
      );
    }
    
    // Filter adult content
    if (preferences.avoidAdultContent) {
      filtered = filtered.filter(movie => !movie.adult);
    }
    
    // Sort by preference style
    if (preferences.preferenceStyle === 'trending') {
      filtered.sort((a, b) => b.popularity - a.popularity);
    } else if (preferences.preferenceStyle === 'classic') {
      filtered.sort((a, b) => 
        new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()
      );
    } else {
      // Balanced: sort by rating * popularity
      filtered.sort((a, b) => 
        (b.rating * b.popularity) - (a.rating * a.popularity)
      );
    }
    
    return filtered;
  }
  
  private async storeResults(
    searchId: string,
    results: MovieResult[],
    criteria: MovieCriteria
  ): Promise<void> {
    try {
      // Ensure search_id exists
      const searchExists = await this.env.MOVIE_DB.prepare(`
        SELECT search_id FROM movie_searches WHERE search_id = ?
      `).bind(searchId).first();
      
      if (!searchExists) {
        // Ensure 'system' user exists in user_movie_preferences (for foreign key)
        await this.env.MOVIE_DB.prepare(`
          INSERT OR IGNORE INTO user_movie_preferences (user_id, preferences, updated_at)
          VALUES (?, ?, datetime('now'))
        `).bind('system', JSON.stringify({})).run();
        
        await this.env.MOVIE_DB.prepare(`
          INSERT OR IGNORE INTO movie_searches (search_id, user_id, criteria, status)
          VALUES (?, ?, ?, 'completed')
        `).bind(searchId, 'system', JSON.stringify({})).run();
      }
      
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour TTL
      
      await this.env.MOVIE_DB.prepare(`
        INSERT INTO movie_results (result_id, search_id, movie_data, expires_at)
        VALUES (?, ?, ?, ?)
      `).bind(
        `result-${Date.now()}`,
        searchId,
        JSON.stringify(results),
        expiresAt.toISOString()
      ).run();
    } catch (error) {
      console.error('Cache storage error:', error);
    }
  }
  
  private async updateSearchStatus(
    searchId: string,
    status: 'completed' | 'failed'
  ): Promise<void> {
    try {
      await this.env.MOVIE_DB.prepare(`
        UPDATE movie_searches 
        SET status = ?, completed_at = datetime('now')
        WHERE search_id = ?
      `).bind(status, searchId).run();
    } catch (error) {
      console.error('Error updating search status:', error);
    }
  }
}
