import { Agent, callable } from 'agents';
import { Env, MovieSearchState } from '../types/movie-agent-state';
import { MovieRequest, MovieCriteria, MovieResult, MovieSearchInfo } from '../types/movie';
import { MoviePreferences } from '../types/movie-preferences';

export class MovieRecommendationAgent extends Agent<Env, MovieSearchState> {
  
  onStart() {
    // Schedule cleanup of old searches
    this.schedule('daily at 2am', 'cleanupOldSearches');
  }
  
  @callable()
  async recommendMovies(request: MovieRequest): Promise<{ searchId: string }> {
    console.log(`Starting movie recommendation for user ${request.userId}`);
    
    // Parse criteria (either from structured input or natural language)
    const criteria = await this.parseMovieRequest(request);
    
    // Check cache first
    const cacheKey = this.generateCacheKey(criteria);
    const cachedResults = await this.getCachedResults(cacheKey);
    
    if (cachedResults && cachedResults.length > 0) {
      console.log('Returning cached results');
      const searchId = `search-${Date.now()}`;
      await this.storeSearchRecord(searchId, request.userId, criteria, 'completed');
      const currentState = this.state || { activeSearches: [] };
      this.setState({
        ...currentState,
        lastSearchId: searchId,
      });
      return { searchId };
    }
    
    // Start the search workflow
    const searchId = `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const workflow = await this.env.MOVIE_SEARCH_WORKFLOW.create({
      params: {
        criteria,
        agentId: searchId,
        userId: request.userId,
      }
    });
    
    // Store search record
    await this.storeSearchRecord(searchId, request.userId, criteria, 'running');
    
    // Update agent state
    const currentState = this.state || { activeSearches: [] };
    this.setState({
      ...currentState,
      activeSearches: [
        ...(currentState.activeSearches || []),
        {
          id: searchId,
          userId: request.userId,
          criteria,
          status: 'running',
          resultCount: 0,
          createdAt: Date.now(),
        },
      ],
      lastSearchId: searchId,
    });
    
    return { searchId };
  }
  
  @callable()
  async getSearchResults(searchId: string): Promise<MovieResult[]> {
    try {
      // Get results from cache
      const results = await this.getCachedResults(searchId);
      if (results) return results;
      
      // Get from database
      const dbResults = await this.env.MOVIE_DB.prepare(`
        SELECT movie_data FROM movie_results 
        WHERE search_id = ? AND expires_at > datetime('now')
        ORDER BY created_at DESC
        LIMIT 1
      `).bind(searchId).first<{ movie_data: string }>();
      
      if (dbResults) {
        return JSON.parse(dbResults.movie_data) as MovieResult[];
      }
      
      return [];
    } catch (error) {
      console.error('Error getting search results:', error);
      return [];
    }
  }
  
  @callable()
  async getSearchStatus(searchId: string): Promise<{ status: string; resultCount?: number }> {
    // First check database for most up-to-date status
    const dbSearch = await this.env.MOVIE_DB.prepare(`
      SELECT status FROM movie_searches WHERE search_id = ?
    `).bind(searchId).first<{ status: string }>();
    
    if (dbSearch) {
      // If completed, get actual result count from database
      if (dbSearch.status === 'completed') {
        const resultCount = await this.env.MOVIE_DB.prepare(`
          SELECT COUNT(*) as count FROM movie_results 
          WHERE search_id = ? AND expires_at > datetime('now')
        `).bind(searchId).first<{ count: number }>();
        
        // Also try to get count from stored results
        const storedResults = await this.env.MOVIE_DB.prepare(`
          SELECT movie_data FROM movie_results 
          WHERE search_id = ? AND expires_at > datetime('now')
          ORDER BY created_at DESC
          LIMIT 1
        `).bind(searchId).first<{ movie_data: string }>();
        
        let actualCount = 0;
        if (storedResults) {
          try {
            const movies = JSON.parse(storedResults.movie_data) as MovieResult[];
            actualCount = movies.length;
          } catch (e) {
            actualCount = resultCount?.count || 0;
          }
        }
        
        // Update agent state with actual count
        const currentState = this.state || { activeSearches: [] };
        const searchIndex = (currentState.activeSearches || []).findIndex(s => s.id === searchId);
        if (searchIndex >= 0) {
          const updatedSearches = [...(currentState.activeSearches || [])];
          updatedSearches[searchIndex] = {
            ...updatedSearches[searchIndex],
            status: 'completed',
            resultCount: actualCount,
          };
          this.setState({
            ...currentState,
            activeSearches: updatedSearches,
          });
        }
        
        return { status: 'completed', resultCount: actualCount };
      }
      
      return { status: dbSearch.status, resultCount: 0 };
    }
    
    // Fallback to agent state
    const currentState = this.state || { activeSearches: [] };
    const search = (currentState.activeSearches || []).find(s => s.id === searchId);
    
    if (search) {
      return { status: search.status, resultCount: search.resultCount };
    }
    
    return { status: 'unknown' };
  }
  
  private async parseMovieRequest(request: MovieRequest): Promise<MovieCriteria> {
    if (request.isStructured && request.criteria) {
      return request.criteria;
    }
    
    // Parse natural language using AI
    if (request.naturalLanguage) {
      return await this.parseNaturalLanguage(request.naturalLanguage);
    }
    
    throw new Error('Either criteria or naturalLanguage must be provided');
  }
  
  private async parseNaturalLanguage(input: string): Promise<MovieCriteria> {
    const { response } = await this.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages: [{
        role: "system",
        content: `Extract movie search criteria from user input. Return ONLY valid JSON:
        {
          "releaseDateFrom": "YYYY-MM-DD" or "YYYY",
          "releaseDateTo": "YYYY-MM-DD" or "YYYY",
          "genres": string[],
          "actors": string[],
          "directors": string[],
          "keywords": string[],
          "minRating": number,
          "language": "ISO code",
          "limit": number
        }`
      }, {
        role: "user",
        content: input
      }]
    });

    try {
      const text = response as string;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : text;
      return JSON.parse(jsonText) as MovieCriteria;
    } catch (error) {
      console.error('Error parsing natural language:', error);
      return {};
    }
  }
  
  private generateCacheKey(criteria: MovieCriteria): string {
    return JSON.stringify({
      genres: criteria.genres?.sort().join(','),
      actors: criteria.actors?.sort().join(','),
      directors: criteria.directors?.sort().join(','),
      dateFrom: criteria.releaseDateFrom,
      dateTo: criteria.releaseDateTo,
      minRating: criteria.minRating,
    });
  }
  
  private async getCachedResults(key: string): Promise<MovieResult[] | null> {
    try {
      const result = await this.env.MOVIE_DB.prepare(`
        SELECT movie_data, expires_at FROM movie_results 
        WHERE result_id = ? AND expires_at > datetime('now')
        ORDER BY created_at DESC LIMIT 1
      `).bind(key).first<{ movie_data: string; expires_at: string }>();
      
      if (!result) return null;
      return JSON.parse(result.movie_data) as MovieResult[];
    } catch (error) {
      return null;
    }
  }
  
  private async getUserPreferences(userId: string): Promise<MoviePreferences | null> {
    try {
      const agentId = this.env.MOVIE_PREFERENCE_ANALYSIS_AGENT.idFromName(userId);
      const agent = this.env.MOVIE_PREFERENCE_ANALYSIS_AGENT.get(agentId);
      return await agent.getUserPreferences(userId);
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return null;
    }
  }
  
  private async storeSearchRecord(
    searchId: string,
    userId: string,
    criteria: MovieCriteria,
    status: 'running' | 'completed' | 'failed'
  ): Promise<void> {
    try {
      // Ensure user exists in user_movie_preferences (required for foreign key)
      await this.env.MOVIE_DB.prepare(`
        INSERT OR IGNORE INTO user_movie_preferences (user_id, preferences, updated_at)
        VALUES (?, ?, datetime('now'))
      `).bind(userId, JSON.stringify({})).run();
      
      // Now insert the search record
      await this.env.MOVIE_DB.prepare(`
        INSERT INTO movie_searches (search_id, user_id, criteria, status)
        VALUES (?, ?, ?, ?)
      `).bind(searchId, userId, JSON.stringify(criteria), status).run();
    } catch (error) {
      console.error('Error storing search record:', error);
    }
  }
  
  async cleanupOldSearches() {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    const currentState = this.state || { activeSearches: [] };
    this.setState({
      ...currentState,
      activeSearches: (currentState.activeSearches || []).filter(s => s.createdAt > cutoff)
    });
  }
}
