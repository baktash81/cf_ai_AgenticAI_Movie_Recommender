import { MovieResult } from '../types/movie';

export class CacheManager {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  /**
   * Generate cache key from search criteria
   */
  static generateCacheKey(criteria: {
    genres?: string[];
    actors?: string[];
    directors?: string[];
    releaseDateFrom?: string;
    releaseDateTo?: string;
    minRating?: number;
  }): string {
    return JSON.stringify({
      genres: criteria.genres?.sort().join(','),
      actors: criteria.actors?.sort().join(','),
      directors: criteria.directors?.sort().join(','),
      dateFrom: criteria.releaseDateFrom,
      dateTo: criteria.releaseDateTo,
      minRating: criteria.minRating,
    });
  }

  /**
   * Check if cached results exist and are still valid
   */
  async getCachedResults(searchId: string): Promise<MovieResult[] | null> {
    try {
      const result = await this.db.prepare(`
        SELECT movie_data, expires_at 
        FROM movie_results 
        WHERE search_id = ? AND expires_at > datetime('now')
        ORDER BY created_at DESC
        LIMIT 1
      `).bind(searchId).first<{ movie_data: string; expires_at: string }>();

      if (!result) return null;

      return JSON.parse(result.movie_data) as MovieResult[];
    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  }

  /**
   * Store search results in cache (24 hours TTL)
   */
  async cacheResults(searchId: string, results: MovieResult[], ttlHours: number = 24): Promise<void> {
    try {
      // First, ensure the search_id exists in movie_searches
      const searchExists = await this.db.prepare(`
        SELECT search_id FROM movie_searches WHERE search_id = ?
      `).bind(searchId).first();
      
      if (!searchExists) {
        // Ensure 'system' user exists in user_movie_preferences (for foreign key)
        await this.db.prepare(`
          INSERT OR IGNORE INTO user_movie_preferences (user_id, preferences, updated_at)
          VALUES (?, ?, datetime('now'))
        `).bind('system', JSON.stringify({})).run();
        
        await this.db.prepare(`
          INSERT OR IGNORE INTO movie_searches (search_id, user_id, criteria, status)
          VALUES (?, ?, ?, 'completed')
        `).bind(searchId, 'system', JSON.stringify({})).run();
      }
      
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + ttlHours);

      await this.db.prepare(`
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

  /**
   * Clean up expired cache entries
   */
  async cleanupExpiredCache(): Promise<void> {
    try {
      await this.db.prepare(`
        DELETE FROM movie_results 
        WHERE expires_at < datetime('now')
      `).run();
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }
}
