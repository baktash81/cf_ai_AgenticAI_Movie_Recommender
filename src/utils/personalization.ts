import { MovieResult } from '../types/movie';
import { MoviePreferences } from '../types/movie-preferences';

export class PersonalizationEngine {
  /**
   * Rank movies using AI based on user preferences
   */
  static async rankWithAI(
    movies: MovieResult[],
    preferences: MoviePreferences,
    ai: Ai
  ): Promise<MovieResult[]> {
    if (movies.length === 0) return movies;
    
    try {
      const { response } = await ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        messages: [{
          role: "system",
          content: `Rank these movies for a user based on their preferences. Return ONLY a JSON array of movie IDs in order of recommendation (best first).
          
          User Preferences:
          - Favorite Genres: ${preferences.favoriteGenres.join(', ') || 'None'}
          - Disliked Genres: ${preferences.dislikedGenres.join(', ') || 'None'}
          - Favorite Actors: ${preferences.favoriteActors.join(', ') || 'None'}
          - Favorite Directors: ${preferences.favoriteDirectors.join(', ') || 'None'}
          - Min Rating: ${preferences.minRating}
          - Preference Style: ${preferences.preferenceStyle}
          
          Consider: genres, actors, directors, ratings, popularity, and user's preference style.`
        }, {
          role: "user",
          content: JSON.stringify(movies.map(m => ({
            id: m.id,
            title: m.title,
            genres: m.genres,
            actors: m.actors,
            director: m.director,
            rating: m.rating,
            popularity: m.popularity
          })))
        }]
      });
      
      // Parse ranked IDs
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      }
      
      const rankedIds: string[] = JSON.parse(cleanedResponse);
      
      // Reorder movies based on AI ranking
      const movieMap = new Map(movies.map(m => [m.id, m]));
      const ranked: MovieResult[] = [];
      const unranked: MovieResult[] = [];
      
      for (const id of rankedIds) {
        const movie = movieMap.get(id);
        if (movie) {
          ranked.push(movie);
          movieMap.delete(id);
        }
      }
      
      // Add any movies not in the ranking
      unranked.push(...Array.from(movieMap.values()));
      
      return [...ranked, ...unranked];
    } catch (error) {
      console.error('AI ranking error:', error);
      // Fallback to rule-based ranking
      return this.rankWithRules(movies, preferences);
    }
  }
  
  /**
   * Rank movies using rule-based approach
   */
  static rankWithRules(movies: MovieResult[], preferences: MoviePreferences): MovieResult[] {
    const scored = movies.map(movie => ({
      movie,
      score: this.calculateScore(movie, preferences),
    }));
    
    scored.sort((a, b) => b.score - a.score);
    
    return scored.map(item => item.movie);
  }
  
  /**
   * Calculate preference score for a movie
   */
  private static calculateScore(movie: MovieResult, preferences: MoviePreferences): number {
    let score = 0;
    
    // Genre matching (favorite genres)
    if (preferences.favoriteGenres.length > 0) {
      const genreMatches = movie.genres.filter(genre =>
        preferences.favoriteGenres.some(fav =>
          genre.toLowerCase().includes(fav.toLowerCase())
        )
      ).length;
      score += (genreMatches / preferences.favoriteGenres.length) * 0.3;
    }
    
    // Genre penalty (disliked genres)
    if (preferences.dislikedGenres.length > 0) {
      const dislikedMatches = movie.genres.filter(genre =>
        preferences.dislikedGenres.some(disliked =>
          genre.toLowerCase().includes(disliked.toLowerCase())
        )
      ).length;
      if (dislikedMatches > 0) {
        score -= 0.5; // Significant penalty
      }
    }
    
    // Actor matching
    if (preferences.favoriteActors.length > 0) {
      const actorMatches = preferences.favoriteActors.filter(actor =>
        movie.actors.some(movieActor =>
          movieActor.toLowerCase().includes(actor.toLowerCase())
        )
      ).length;
      score += (actorMatches / preferences.favoriteActors.length) * 0.25;
    }
    
    // Director matching
    if (preferences.favoriteDirectors.length > 0 && movie.director) {
      const directorMatch = preferences.favoriteDirectors.some(director =>
        movie.director!.toLowerCase().includes(director.toLowerCase())
      );
      if (directorMatch) {
        score += 0.2;
      }
    }
    
    // Rating scoring
    const ratingWeight = 0.15;
    score += (movie.rating / 10) * ratingWeight;
    
    // Popularity scoring
    const popularityWeight = 0.1;
    // Normalize popularity (TMDB popularity is typically 0-1000+)
    const normalizedPopularity = Math.min(movie.popularity / 1000, 1);
    score += normalizedPopularity * popularityWeight;
    
    // Preference style adjustments
    if (preferences.preferenceStyle === 'trending') {
      score += normalizedPopularity * 0.2; // Boost popular movies
    } else if (preferences.preferenceStyle === 'classic') {
      const yearsAgo = new Date().getFullYear() - new Date(movie.releaseDate).getFullYear();
      if (yearsAgo > 20) {
        score += 0.15; // Boost older movies
      }
    }
    
    return score;
  }
  
  /**
   * Find similar users using Vectorize
   */
  static async findSimilarUsers(
    userId: string,
    vectorize: VectorizeIndex,
    limit: number = 10
  ): Promise<string[]> {
    try {
      // Get user's vector
      const userVector = await vectorize.getByIds([userId]);
      if (!userVector || userVector.length === 0) return [];
      
      // Query for similar users
      const similar = await vectorize.query(userVector[0].values, {
        topK: limit,
        returnMetadata: true,
      });
      
      return similar.matches
        .filter(match => match.id !== userId)
        .map(match => match.id);
    } catch (error) {
      console.error('Error finding similar users:', error);
      return [];
    }
  }
  
  /**
   * Apply collaborative filtering based on similar users
   */
  static async applyCollaborativeFiltering(
    movies: MovieResult[],
    similarUserIds: string[],
    db: D1Database
  ): Promise<MovieResult[]> {
    if (similarUserIds.length === 0) return movies;
    
    // Get watch history of similar users
    const placeholders = similarUserIds.map(() => '?').join(',');
    const watched = await db.prepare(`
      SELECT movie_id, COUNT(*) as watch_count, AVG(rating) as avg_rating
      FROM user_watch_history
      WHERE user_id IN (${placeholders}) AND rating IS NOT NULL
      GROUP BY movie_id
      ORDER BY watch_count DESC, avg_rating DESC
      LIMIT 10
    `).bind(...similarUserIds).all<{ movie_id: string; watch_count: number; avg_rating: number }>();
    
    if (watched.results.length === 0) return movies;
    
    // Boost movies that similar users watched and rated highly
    const popularMovieIds = new Set(watched.results.map(w => w.movie_id));
    const movieRatings = new Map(watched.results.map(w => [w.movie_id, w.avg_rating]));
    
    return movies.sort((a, b) => {
      const aPopular = popularMovieIds.has(a.id) ? 1 : 0;
      const bPopular = popularMovieIds.has(b.id) ? 1 : 0;
      
      if (aPopular !== bPopular) {
        return bPopular - aPopular; // Popular movies first
      }
      
      // If both are popular, sort by rating
      if (aPopular && bPopular) {
        const aRating = movieRatings.get(a.id) || 0;
        const bRating = movieRatings.get(b.id) || 0;
        return bRating - aRating;
      }
      
      // Otherwise sort by rating * popularity
      return (b.rating * b.popularity) - (a.rating * a.popularity);
    });
  }
}
