import { WorkflowEntrypoint } from 'cloudflare:workers';
import { Env } from '../types/movie-agent-state';
import { MovieCriteria, MovieResult } from '../types/movie';
import { TMDBAPI } from '../tools/movie-apis/tmdb';

interface MovieSearchParams {
  criteria: MovieCriteria;
  agentId: string;
  userId: string;
}

export class MovieSearchWorkflow extends WorkflowEntrypoint<Env, MovieSearchParams> {
  
  async run(event: WorkflowEvent<MovieSearchParams>) {
    const { criteria, agentId, userId } = event.payload;
    
    const searchId = agentId || event.workflowId || `workflow-${Date.now()}`;
    
    console.log(`Starting movie search workflow (searchId: ${searchId})`);
    
    try {
      // Step 1: Search TMDB API
      const searchResults = await this.searchMovies(criteria);
      
      // Step 2: Store results (no personalization)
      await this.storeResults(searchId, searchResults, criteria);
      
      // Step 3: Update search status
      await this.updateSearchStatus(searchId, 'completed');
      
      return { 
        results: searchResults,
        count: searchResults.length
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
    let uniqueResults = Array.from(
      new Map(results.map(movie => [movie.id, movie])).values()
    );

    if (criteria.excludeMovieIds && criteria.excludeMovieIds.length > 0) {
      const exclude = new Set(criteria.excludeMovieIds.map(String));
      uniqueResults = uniqueResults.filter((m) => !exclude.has(String(m.id)));
    }
    
    // Sort by relevance (rating * popularity)
    uniqueResults.sort((a, b) => 
      (b.rating * b.popularity) - (a.rating * a.popularity)
    );
    
    // Limit results
    return uniqueResults.slice(0, criteria.limit || 20);
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
