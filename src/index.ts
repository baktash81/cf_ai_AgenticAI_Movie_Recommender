import { MovieRecommendationAgent } from './agents/MovieRecommendationAgent';
import { MoviePreferenceAnalysisAgent } from './agents/MoviePreferenceAnalysisAgent';
import { MovieSearchWorkflow } from './workflows/MovieSearchWorkflow';
import { Env } from './types/movie-agent-state';
import { MovieRequest } from './types/movie';
import { 
  RegisterRequest, 
  LoginRequest, 
  ProfileUpdateRequest,
  UserRow,
  RefreshTokenRow
} from './types/auth';
import {
  generateId,
  hashPassword,
  verifyPassword,
  generateTokens,
  hashToken,
  verifyJWT,
  extractBearerToken,
  rowToUser,
  isValidEmail,
  isValidPassword,
  authenticateRequest,
} from './utils/auth';

// Export Workflows and Agents (Durable Objects) for Cloudflare Workers
export { MovieSearchWorkflow };
export { MovieRecommendationAgent, MoviePreferenceAnalysisAgent };

// Default JWT secret for development (should be overridden via wrangler secret)
const DEFAULT_JWT_SECRET = 'dev-secret-change-in-production';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const jwtSecret = env.JWT_SECRET || DEFAULT_JWT_SECRET;

    // CORS headers - update for your frontend domain
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // ==================== AUTH ROUTES ====================

      // Route: POST /auth/register - Create new user account
      if (path === '/auth/register' && method === 'POST') {
        const body = await request.json() as RegisterRequest;
        
        // Validate input
        if (!body.email || !body.password) {
          return new Response(
            JSON.stringify({ error: 'Email and password are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!isValidEmail(body.email)) {
          return new Response(
            JSON.stringify({ error: 'Invalid email format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const passwordValidation = isValidPassword(body.password);
        if (!passwordValidation.valid) {
          return new Response(
            JSON.stringify({ error: passwordValidation.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if email already exists
        const existingUser = await env.MOVIE_DB.prepare(
          'SELECT id FROM users WHERE email = ?'
        ).bind(body.email.toLowerCase()).first();

        if (existingUser) {
          return new Response(
            JSON.stringify({ error: 'Email already registered' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create user
        const userId = generateId();
        const passwordHash = await hashPassword(body.password);

        await env.MOVIE_DB.prepare(`
          INSERT INTO users (id, email, password_hash, name, profile_completed)
          VALUES (?, ?, ?, ?, ?)
        `).bind(userId, body.email.toLowerCase(), passwordHash, body.name || null, 0).run();

        // Create user preferences entry (for foreign key relationships)
        await env.MOVIE_DB.prepare(`
          INSERT OR IGNORE INTO user_movie_preferences (user_id, preferences, updated_at)
          VALUES (?, ?, datetime('now'))
        `).bind(userId, JSON.stringify({})).run();

        // Get created user
        const userRow = await env.MOVIE_DB.prepare(
          'SELECT * FROM users WHERE id = ?'
        ).bind(userId).first<UserRow>();

        if (!userRow) {
          throw new Error('Failed to create user');
        }

        const user = rowToUser(userRow);
        const tokens = await generateTokens(user, jwtSecret);

        // Store refresh token
        const refreshTokenId = generateId();
        const refreshTokenHash = await hashToken(tokens.refreshToken);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        await env.MOVIE_DB.prepare(`
          INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
          VALUES (?, ?, ?, ?)
        `).bind(refreshTokenId, userId, refreshTokenHash, expiresAt).run();

        return new Response(
          JSON.stringify({ user, tokens }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Route: POST /auth/login - Login user
      if (path === '/auth/login' && method === 'POST') {
        const body = await request.json() as LoginRequest;
        
        if (!body.email || !body.password) {
          return new Response(
            JSON.stringify({ error: 'Email and password are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Find user
        const userRow = await env.MOVIE_DB.prepare(
          'SELECT * FROM users WHERE email = ?'
        ).bind(body.email.toLowerCase()).first<UserRow>();

        if (!userRow) {
          return new Response(
            JSON.stringify({ error: 'Invalid email or password' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify password
        const validPassword = await verifyPassword(body.password, userRow.password_hash);
        if (!validPassword) {
          return new Response(
            JSON.stringify({ error: 'Invalid email or password' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const user = rowToUser(userRow);
        const tokens = await generateTokens(user, jwtSecret);

        // Store refresh token
        const refreshTokenId = generateId();
        const refreshTokenHash = await hashToken(tokens.refreshToken);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        await env.MOVIE_DB.prepare(`
          INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
          VALUES (?, ?, ?, ?)
        `).bind(refreshTokenId, user.id, refreshTokenHash, expiresAt).run();

        return new Response(
          JSON.stringify({ user, tokens }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Route: POST /auth/refresh - Refresh access token
      if (path === '/auth/refresh' && method === 'POST') {
        const body = await request.json() as { refreshToken: string };
        
        if (!body.refreshToken) {
          return new Response(
            JSON.stringify({ error: 'Refresh token is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify refresh token
        const payload = await verifyJWT(body.refreshToken, jwtSecret);
        if (!payload) {
          return new Response(
            JSON.stringify({ error: 'Invalid or expired refresh token' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if refresh token exists in database
        const tokenHash = await hashToken(body.refreshToken);
        const storedToken = await env.MOVIE_DB.prepare(`
          SELECT * FROM refresh_tokens 
          WHERE user_id = ? AND token_hash = ? AND expires_at > datetime('now')
        `).bind(payload.sub, tokenHash).first<RefreshTokenRow>();

        if (!storedToken) {
          return new Response(
            JSON.stringify({ error: 'Refresh token not found or expired' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get user
        const userRow = await env.MOVIE_DB.prepare(
          'SELECT * FROM users WHERE id = ?'
        ).bind(payload.sub).first<UserRow>();

        if (!userRow) {
          return new Response(
            JSON.stringify({ error: 'User not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const user = rowToUser(userRow);
        const tokens = await generateTokens(user, jwtSecret);

        // Delete old refresh token and store new one
        await env.MOVIE_DB.prepare(
          'DELETE FROM refresh_tokens WHERE id = ?'
        ).bind(storedToken.id).run();

        const newRefreshTokenId = generateId();
        const newRefreshTokenHash = await hashToken(tokens.refreshToken);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        await env.MOVIE_DB.prepare(`
          INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
          VALUES (?, ?, ?, ?)
        `).bind(newRefreshTokenId, user.id, newRefreshTokenHash, expiresAt).run();

        return new Response(
          JSON.stringify({ user, tokens }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Route: POST /auth/logout - Logout user
      if (path === '/auth/logout' && method === 'POST') {
        const authHeader = request.headers.get('Authorization');
        const token = extractBearerToken(authHeader);
        
        if (token) {
          const payload = await verifyJWT(token, jwtSecret);
          if (payload) {
            // Delete all refresh tokens for this user
            await env.MOVIE_DB.prepare(
              'DELETE FROM refresh_tokens WHERE user_id = ?'
            ).bind(payload.sub).run();
          }
        }

        return new Response(
          JSON.stringify({ message: 'Logged out successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Route: GET /auth/me - Get current user (protected)
      if (path === '/auth/me' && method === 'GET') {
        const auth = await authenticateRequest(request, jwtSecret);
        
        if (!auth) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const userRow = await env.MOVIE_DB.prepare(
          'SELECT * FROM users WHERE id = ?'
        ).bind(auth.userId).first<UserRow>();

        if (!userRow) {
          return new Response(
            JSON.stringify({ error: 'User not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify(rowToUser(userRow)),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Route: PUT /auth/profile - Update user profile (protected)
      if (path === '/auth/profile' && method === 'PUT') {
        const auth = await authenticateRequest(request, jwtSecret);
        
        if (!auth) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const body = await request.json() as ProfileUpdateRequest;
        
        // Build update query dynamically
        const updates: string[] = ['updated_at = datetime(\'now\')'];
        const values: any[] = [];
        
        if (body.name !== undefined) {
          updates.push('name = ?');
          values.push(body.name);
        }
        if (body.avatarUrl !== undefined) {
          updates.push('avatar_url = ?');
          values.push(body.avatarUrl);
        }
        if (body.profileCompleted !== undefined) {
          updates.push('profile_completed = ?');
          values.push(body.profileCompleted ? 1 : 0);
        }
        
        values.push(auth.userId);
        
        await env.MOVIE_DB.prepare(`
          UPDATE users SET ${updates.join(', ')} WHERE id = ?
        `).bind(...values).run();

        const userRow = await env.MOVIE_DB.prepare(
          'SELECT * FROM users WHERE id = ?'
        ).bind(auth.userId).first<UserRow>();

        if (!userRow) {
          return new Response(
            JSON.stringify({ error: 'User not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify(rowToUser(userRow)),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ==================== MOVIE ROUTES (updated for auth) ====================

      // Helper function to get userId (from auth or body)
      const getUserId = async (req: Request): Promise<string | null> => {
        const auth = await authenticateRequest(req, jwtSecret);
        if (auth) return auth.userId;
        return null;
      };

      // Route: POST /preferences - Analyze user movie preferences (protected)
      if (path === '/preferences' && method === 'POST') {
        const auth = await authenticateRequest(request, jwtSecret);
        
        if (!auth) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const body = await request.json() as { input: string };
        
        if (!body.input) {
          return new Response(
            JSON.stringify({ error: 'input is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const agentId = env.MOVIE_PREFERENCE_ANALYSIS_AGENT.idFromName(auth.userId);
        const agent = env.MOVIE_PREFERENCE_ANALYSIS_AGENT.get(agentId);
        
        const result = await agent.analyzeUserPreferences(body.input, auth.userId);
        
        // Mark profile as completed
        await env.MOVIE_DB.prepare(
          'UPDATE users SET profile_completed = 1, updated_at = datetime(\'now\') WHERE id = ?'
        ).bind(auth.userId).run();
        
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Route: GET /preferences - Get current user preferences (protected)
      if (path === '/preferences' && method === 'GET') {
        const auth = await authenticateRequest(request, jwtSecret);
        
        if (!auth) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const agentId = env.MOVIE_PREFERENCE_ANALYSIS_AGENT.idFromName(auth.userId);
        const agent = env.MOVIE_PREFERENCE_ANALYSIS_AGENT.get(agentId);
        
        const preferences = await agent.getUserPreferences(auth.userId);
        
        return new Response(
          JSON.stringify(preferences || { error: 'Preferences not found' }),
          { 
            status: preferences ? 200 : 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Route: GET /preferences/:userId - Get user preferences (legacy, for backward compatibility)
      if (path.startsWith('/preferences/') && method === 'GET') {
        const userId = path.split('/preferences/')[1];
        
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const agentId = env.MOVIE_PREFERENCE_ANALYSIS_AGENT.idFromName(userId);
        const agent = env.MOVIE_PREFERENCE_ANALYSIS_AGENT.get(agentId);
        
        const preferences = await agent.getUserPreferences(userId);
        
        return new Response(
          JSON.stringify(preferences || { error: 'Preferences not found' }),
          { 
            status: preferences ? 200 : 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Route: POST /recommend - Get movie recommendations (protected)
      if (path === '/recommend' && method === 'POST') {
        const auth = await authenticateRequest(request, jwtSecret);
        const body = await request.json() as MovieRequest;
        
        // Use auth userId if available, otherwise fall back to body.userId
        const userId = auth?.userId || body.userId;
        
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'Authentication required or userId must be provided' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const agentId = env.MOVIE_RECOMMENDATION_AGENT.idFromName(userId);
        const agent = env.MOVIE_RECOMMENDATION_AGENT.get(agentId);
        
        const result = await agent.recommendMovies({ ...body, userId });
        
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Route: GET /recommendations/:searchId - Get recommendation results
      if (path.startsWith('/recommendations/') && method === 'GET') {
        const searchId = path.split('/recommendations/')[1];
        
        if (!searchId) {
          return new Response(
            JSON.stringify({ error: 'searchId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const auth = await authenticateRequest(request, jwtSecret);
        const userId = auth?.userId || url.searchParams.get('userId') || searchId.split('-')[0];
        
        const agentId = env.MOVIE_RECOMMENDATION_AGENT.idFromName(userId);
        const agent = env.MOVIE_RECOMMENDATION_AGENT.get(agentId);
        
        const results = await agent.getSearchResults(searchId);
        
        return new Response(
          JSON.stringify({ movies: results, count: results.length }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Route: GET /status/:searchId - Get search status
      if (path.startsWith('/status/') && method === 'GET') {
        const searchId = path.split('/status/')[1];
        
        if (!searchId) {
          return new Response(
            JSON.stringify({ error: 'searchId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const auth = await authenticateRequest(request, jwtSecret);
        const userId = auth?.userId || url.searchParams.get('userId') || searchId.split('-')[0];
        
        const agentId = env.MOVIE_RECOMMENDATION_AGENT.idFromName(userId);
        const agent = env.MOVIE_RECOMMENDATION_AGENT.get(agentId);
        
        const status = await agent.getSearchStatus(searchId);
        
        return new Response(
          JSON.stringify(status),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Route: POST /watchlist - Add movie to watchlist (protected)
      if (path === '/watchlist' && method === 'POST') {
        const auth = await authenticateRequest(request, jwtSecret);
        const body = await request.json() as {
          userId?: string;
          movieId: string;
          priority?: number;
        };
        
        const userId = auth?.userId || body.userId;
        
        if (!userId || !body.movieId) {
          return new Response(
            JSON.stringify({ error: 'Authentication required and movieId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          // Ensure user preferences record exists
          await env.MOVIE_DB.prepare(`
            INSERT OR IGNORE INTO user_movie_preferences (user_id, preferences, updated_at)
            VALUES (?, ?, datetime('now'))
          `).bind(userId, JSON.stringify({})).run();

          await env.MOVIE_DB.prepare(`
            INSERT INTO user_watchlist (watchlist_id, user_id, movie_id, priority)
            VALUES (?, ?, ?, ?)
          `).bind(
            `watchlist-${Date.now()}`,
            userId,
            body.movieId,
            body.priority || 0
          ).run();
          
          return new Response(
            JSON.stringify({ success: true, message: 'Added to watchlist' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to add to watchlist', details: error instanceof Error ? error.message : 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: GET /watchlist - Get current user watchlist (protected)
      if (path === '/watchlist' && method === 'GET') {
        const auth = await authenticateRequest(request, jwtSecret);
        
        if (!auth) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          const results = await env.MOVIE_DB.prepare(`
            SELECT movie_id, added_at, priority 
            FROM user_watchlist 
            WHERE user_id = ?
            ORDER BY priority DESC, added_at DESC
          `).bind(auth.userId).all<{ movie_id: string; added_at: string; priority: number }>();
          
          return new Response(
            JSON.stringify({ watchlist: results.results || [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to get watchlist' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: GET /watchlist/:userId - Get user watchlist (legacy)
      if (path.startsWith('/watchlist/') && method === 'GET') {
        const userId = path.split('/watchlist/')[1];
        
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          const results = await env.MOVIE_DB.prepare(`
            SELECT movie_id, added_at, priority 
            FROM user_watchlist 
            WHERE user_id = ?
            ORDER BY priority DESC, added_at DESC
          `).bind(userId).all<{ movie_id: string; added_at: string; priority: number }>();
          
          return new Response(
            JSON.stringify({ watchlist: results.results || [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to get watchlist' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: DELETE /watchlist/:movieId - Remove from watchlist (protected)
      if (path.startsWith('/watchlist/') && method === 'DELETE') {
        const auth = await authenticateRequest(request, jwtSecret);
        
        if (!auth) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const movieId = path.split('/watchlist/')[1];
        
        if (!movieId) {
          return new Response(
            JSON.stringify({ error: 'movieId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          await env.MOVIE_DB.prepare(`
            DELETE FROM user_watchlist WHERE user_id = ? AND movie_id = ?
          `).bind(auth.userId, movieId).run();
          
          return new Response(
            JSON.stringify({ success: true, message: 'Removed from watchlist' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to remove from watchlist' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: POST /chat - Chat with movie recommendation AI (protected)
      if (path === '/chat' && method === 'POST') {
        const auth = await authenticateRequest(request, jwtSecret);
        
        if (!auth) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const body = await request.json() as { message: string };
        
        if (!body.message) {
          return new Response(
            JSON.stringify({ error: 'message is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get user preferences for context
        const prefAgentId = env.MOVIE_PREFERENCE_ANALYSIS_AGENT.idFromName(auth.userId);
        const prefAgent = env.MOVIE_PREFERENCE_ANALYSIS_AGENT.get(prefAgentId);
        const preferences = await prefAgent.getUserPreferences(auth.userId);

        // Use AI to understand user intent and generate response
        const { response } = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
          messages: [{
            role: "system",
            content: `You are a helpful movie recommendation assistant. The user has these preferences: ${JSON.stringify(preferences || {})}.
            
            When the user asks for movie recommendations, extract search criteria and respond with a JSON object:
            {
              "type": "recommendation",
              "criteria": { "genres": [], "actors": [], "directors": [], "keywords": [], "minRating": number, "releaseDateFrom": "YYYY", "releaseDateTo": "YYYY" },
              "message": "Your conversational response here"
            }
            
            For other questions, respond with:
            {
              "type": "chat",
              "message": "Your response here"
            }
            
            Always return valid JSON.`
          }, {
            role: "user",
            content: body.message
          }]
        });

        try {
          const responseText = response as string;
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);

          if (parsed.type === 'recommendation' && parsed.criteria) {
            // Trigger movie search
            const agentId = env.MOVIE_RECOMMENDATION_AGENT.idFromName(auth.userId);
            const agent = env.MOVIE_RECOMMENDATION_AGENT.get(agentId);
            
            const searchResult = await agent.recommendMovies({
              userId: auth.userId,
              criteria: parsed.criteria,
              isStructured: true,
            });

            return new Response(
              JSON.stringify({
                type: 'recommendation',
                message: parsed.message,
                searchId: searchResult.searchId,
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          return new Response(
            JSON.stringify(parsed),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              type: 'chat',
              message: response as string,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Health check
      if (path === '/health' && method === 'GET') {
        return new Response(
          JSON.stringify({ status: 'ok', timestamp: new Date().toISOString(), service: 'movie-recommendation' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 404 for unknown routes
      return new Response(
        JSON.stringify({ error: 'Not found', path }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } catch (error) {
      console.error('Request error:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Internal server error', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  },
};
