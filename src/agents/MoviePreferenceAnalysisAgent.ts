import { Agent, callable } from 'agents';
import { Env, MoviePreferenceState } from '../types/movie-agent-state';
import { MoviePreferences, MoviePreferenceAnalysisResult } from '../types/movie-preferences';

export class MoviePreferenceAnalysisAgent extends Agent<Env, MoviePreferenceState> {
  
  onStart() {
    // Schedule cleanup of old analysis history
    this.schedule('daily at 2am', 'cleanupOldHistory');
  }
  
  @callable()
  async analyzeUserPreferences(userInput: string, userId: string): Promise<MoviePreferenceAnalysisResult> {
    console.log(`Analyzing movie preferences for user ${userId}`);
    
    // Step 1: Extract structured preferences using AI
    const extractedPrefs = await this.extractPreferences(userInput);
    
    // Step 2: Validate and enhance preferences
    const validatedPrefs = await this.validateAndEnhancePreferences(extractedPrefs);
    
    // Step 3: Generate clarification questions if needed
    const clarificationQuestions = await this.generateClarificationQuestions(
      extractedPrefs, 
      userInput
    );
    
    // Step 4: Calculate confidence score
    const confidence = this.calculateConfidence(extractedPrefs, userInput);
    
    // Step 5: Store in database
    await this.storeUserPreferences(userId, validatedPrefs);
    
    // Step 6: Store analysis history
    await this.storeAnalysisHistory(userId, userInput, validatedPrefs, confidence, clarificationQuestions);
    
    // Step 7: Update agent state
    const currentState = this.state || { analysisHistory: [], pendingQuestions: [] };
    this.setState({
      ...currentState,
      analysisHistory: [
        ...(currentState.analysisHistory || []),
        {
          inputText: userInput,
          extractedPreferences: validatedPrefs,
          confidence,
          timestamp: Date.now(),
        },
      ],
      pendingQuestions: clarificationQuestions,
    });
    
    return {
      preferences: validatedPrefs,
      questions: clarificationQuestions,
      confidence,
      extractedFrom: userInput,
    };
  }
  
  @callable()
  async getUserPreferences(userId: string): Promise<MoviePreferences | null> {
    try {
      const result = await this.env.MOVIE_DB.prepare(`
        SELECT preferences FROM user_movie_preferences WHERE user_id = ?
      `).bind(userId).first<{ preferences: string }>();
      
      if (!result) return null;
      
      return JSON.parse(result.preferences) as MoviePreferences;
    } catch (error) {
      console.error('Error retrieving preferences:', error);
      return null;
    }
  }
  
  private async extractPreferences(userInput: string): Promise<MoviePreferences> {
    const { response } = await this.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages: [{
        role: "system",
        content: `Extract movie preferences from user input. Return ONLY valid JSON with this exact structure:
        
        {
          "favoriteGenres": string[],
          "dislikedGenres": string[],
          "favoriteActors": string[],
          "favoriteDirectors": string[],
          "preferredLanguages": string[],
          "minRating": number (0-10),
          "preferredDecades": string[],
          "avoidAdultContent": boolean,
          "preferenceStyle": "diverse" | "similar" | "trending" | "classic" | "balanced"
        }
        
        Extract what the user mentions. Use empty arrays if not mentioned.`
      }, {
        role: "user",
        content: userInput
      }]
    });

    try {
      const text = response as string;
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : text;
      const parsed = JSON.parse(jsonText);
      
      // Map to MoviePreferences structure
      return {
        favoriteGenres: parsed.favoriteGenres || [],
        dislikedGenres: parsed.dislikedGenres || [],
        favoriteActors: parsed.favoriteActors || [],
        favoriteDirectors: parsed.favoriteDirectors || [],
        preferredLanguages: parsed.preferredLanguages || ['en'],
        minRating: parsed.minRating || 0,
        preferredDecades: parsed.preferredDecades || [],
        avoidAdultContent: parsed.avoidAdultContent !== false,
        preferenceStyle: parsed.preferenceStyle || 'balanced',
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      // Return default preferences
      return {
        favoriteGenres: [],
        dislikedGenres: [],
        favoriteActors: [],
        favoriteDirectors: [],
        preferredLanguages: ['en'],
        minRating: 0,
        avoidAdultContent: true,
        preferenceStyle: 'balanced',
      };
    }
  }
  
  private async validateAndEnhancePreferences(
    extractedPrefs: MoviePreferences
  ): Promise<MoviePreferences> {
    // Validate and set defaults
    const enhanced: MoviePreferences = {
      ...extractedPrefs,
      minRating: Math.max(0, Math.min(10, extractedPrefs.minRating || 0)),
      preferredLanguages: extractedPrefs.preferredLanguages?.length > 0 
        ? extractedPrefs.preferredLanguages 
        : ['en'],
      avoidAdultContent: extractedPrefs.avoidAdultContent !== false,
      preferenceStyle: extractedPrefs.preferenceStyle || 'balanced',
    };
    
    return enhanced;
  }
  
  private async generateClarificationQuestions(
    extractedPrefs: MoviePreferences, 
    originalInput: string
  ): Promise<string[]> {
    const questions: string[] = [];
    
    if (extractedPrefs.favoriteGenres.length === 0 && 
        extractedPrefs.dislikedGenres.length === 0) {
      questions.push('What genres do you enjoy? (e.g., Action, Drama, Comedy, Horror)');
    }
    
    if (extractedPrefs.favoriteActors.length === 0 && 
        extractedPrefs.favoriteDirectors.length === 0) {
      questions.push('Do you have any favorite actors or directors?');
    }
    
    if (extractedPrefs.minRating === 0) {
      questions.push('What\'s your minimum rating preference? (e.g., 7.0 or higher)');
    }
    
    return questions.slice(0, 3);
  }
  
  private calculateConfidence(extractedPrefs: MoviePreferences, originalInput: string): number {
    let confidence = 0.3; // Base confidence
    
    // Increase based on extracted information
    if (extractedPrefs.favoriteGenres.length > 0) confidence += 0.2;
    if (extractedPrefs.favoriteActors.length > 0) confidence += 0.15;
    if (extractedPrefs.favoriteDirectors.length > 0) confidence += 0.15;
    if (extractedPrefs.minRating > 0) confidence += 0.1;
    if (originalInput.length > 50) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }
  
  private async storeUserPreferences(userId: string, preferences: MoviePreferences): Promise<void> {
    try {
      await this.env.MOVIE_DB.prepare(`
        INSERT INTO user_movie_preferences (user_id, preferences, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET 
          preferences = excluded.preferences,
          updated_at = datetime('now')
      `).bind(userId, JSON.stringify(preferences)).run();
      
      // Store in Vectorize for similarity matching
      const vector = this.preferencesToVector(preferences);
      await this.env.USER_MOVIE_PREFERENCES_VECTORIZE.upsert([{
        id: userId,
        values: vector,
        metadata: { userId, lastUpdated: Date.now() }
      }]);
    } catch (error) {
      console.error('Error storing preferences:', error);
    }
  }
  
  private preferencesToVector(prefs: MoviePreferences): number[] {
    // Convert preferences to 32-dimensional vector for similarity matching
    const vector: number[] = [];
    
    // Genre preferences - 10 dims (common genres)
    const commonGenres = ['Action', 'Comedy', 'Drama', 'Horror', 'Romance', 
                          'Sci-Fi', 'Thriller', 'Adventure', 'Fantasy', 'Documentary'];
    commonGenres.forEach(genre => {
      vector.push(prefs.favoriteGenres.includes(genre) ? 1 : 0);
    });
    
    // Disliked genres - 10 dims
    commonGenres.forEach(genre => {
      vector.push(prefs.dislikedGenres.includes(genre) ? 1 : 0);
    });
    
    // Rating and style - 4 dims
    vector.push(prefs.minRating / 10); // Normalize to 0-1
    vector.push(prefs.preferenceStyle === 'diverse' ? 1 : 0);
    vector.push(prefs.preferenceStyle === 'similar' ? 1 : 0);
    vector.push(prefs.preferenceStyle === 'trending' ? 1 : 0);
    
    // Language and content - 2 dims
    vector.push(prefs.preferredLanguages.includes('en') ? 1 : 0);
    vector.push(prefs.avoidAdultContent ? 1 : 0);
    
    // Actors and directors - 4 dims (presence indicators)
    vector.push(prefs.favoriteActors.length > 0 ? 1 : 0);
    vector.push(prefs.favoriteActors.length > 3 ? 1 : 0);
    vector.push(prefs.favoriteDirectors.length > 0 ? 1 : 0);
    vector.push(prefs.favoriteDirectors.length > 2 ? 1 : 0);
    
    // Decade preferences - 2 dims
    vector.push(prefs.preferredDecades?.length || 0);
    vector.push(prefs.preferredYears?.length || 0);
    
    // Ensure exactly 32 dimensions
    while (vector.length < 32) {
      vector.push(0);
    }
    
    return vector.slice(0, 32);
  }
  
  private async storeAnalysisHistory(
    userId: string,
    inputText: string,
    preferences: MoviePreferences,
    confidence: number,
    questions: string[]
  ): Promise<void> {
    try {
      await this.env.MOVIE_DB.prepare(`
        INSERT INTO movie_preference_analysis 
        (user_id, input_text, extracted_preferences, confidence_score, clarification_questions)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        userId,
        inputText,
        JSON.stringify(preferences),
        confidence,
        JSON.stringify(questions)
      ).run();
    } catch (error) {
      console.error('Error storing analysis history:', error);
    }
  }
  
  async cleanupOldHistory() {
    console.log('Cleaning up old analysis history');
  }
}
