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

      // ==================== CHAT HISTORY ROUTES ====================

      // Route: GET /conversations - List user's conversations (protected)
      if (path === '/conversations' && method === 'GET') {
        const auth = await authenticateRequest(request, jwtSecret);
        
        if (!auth) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          const results = await env.MOVIE_DB.prepare(`
            SELECT conversation_id, title, created_at, updated_at
            FROM chat_conversations
            WHERE user_id = ?
            ORDER BY updated_at DESC
            LIMIT 50
          `).bind(auth.userId).all();
          
          return new Response(
            JSON.stringify({ conversations: results.results || [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to get conversations' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: POST /conversations - Create a new conversation (protected)
      if (path === '/conversations' && method === 'POST') {
        const auth = await authenticateRequest(request, jwtSecret);
        
        if (!auth) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const body = await request.json() as { title?: string };
        const conversationId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        try {
          await env.MOVIE_DB.prepare(`
            INSERT INTO chat_conversations (conversation_id, user_id, title, created_at, updated_at)
            VALUES (?, ?, ?, datetime('now'), datetime('now'))
          `).bind(conversationId, auth.userId, body.title || 'New Chat').run();
          
          return new Response(
            JSON.stringify({ 
              conversationId, 
              title: body.title || 'New Chat',
              createdAt: new Date().toISOString() 
            }),
            { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to create conversation' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: GET /conversations/:id - Get conversation with messages (protected)
      if (path.startsWith('/conversations/') && method === 'GET' && !path.includes('/messages')) {
        const auth = await authenticateRequest(request, jwtSecret);
        
        if (!auth) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const conversationId = path.split('/conversations/')[1];
        
        try {
          // Get conversation
          const conversation = await env.MOVIE_DB.prepare(`
            SELECT conversation_id, title, created_at, updated_at
            FROM chat_conversations
            WHERE conversation_id = ? AND user_id = ?
          `).bind(conversationId, auth.userId).first();
          
          if (!conversation) {
            return new Response(
              JSON.stringify({ error: 'Conversation not found' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // Get messages
          const messages = await env.MOVIE_DB.prepare(`
            SELECT message_id, role, content, search_id, movies_data, created_at
            FROM chat_messages
            WHERE conversation_id = ?
            ORDER BY created_at ASC
          `).bind(conversationId).all();
          
          // Parse movies_data JSON for each message
          const parsedMessages = (messages.results || []).map((msg: any) => ({
            ...msg,
            movies: msg.movies_data ? JSON.parse(msg.movies_data) : null,
          }));
          
          return new Response(
            JSON.stringify({ 
              conversation,
              messages: parsedMessages
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to get conversation' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: DELETE /conversations/:id - Delete conversation (protected)
      if (path.startsWith('/conversations/') && method === 'DELETE') {
        const auth = await authenticateRequest(request, jwtSecret);
        
        if (!auth) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const conversationId = path.split('/conversations/')[1];
        
        try {
          // Delete messages first (due to foreign key)
          await env.MOVIE_DB.prepare(`
            DELETE FROM chat_messages WHERE conversation_id = ?
          `).bind(conversationId).run();
          
          // Delete conversation
          await env.MOVIE_DB.prepare(`
            DELETE FROM chat_conversations WHERE conversation_id = ? AND user_id = ?
          `).bind(conversationId, auth.userId).run();
          
          return new Response(
            JSON.stringify({ success: true, message: 'Conversation deleted' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to delete conversation' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: PUT /conversations/:id - Update conversation title (protected)
      if (path.startsWith('/conversations/') && method === 'PUT') {
        const auth = await authenticateRequest(request, jwtSecret);
        
        if (!auth) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const conversationId = path.split('/conversations/')[1];
        const body = await request.json() as { title: string };
        
        try {
          await env.MOVIE_DB.prepare(`
            UPDATE chat_conversations 
            SET title = ?, updated_at = datetime('now')
            WHERE conversation_id = ? AND user_id = ?
          `).bind(body.title, conversationId, auth.userId).run();
          
          return new Response(
            JSON.stringify({ success: true, title: body.title }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to update conversation' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: POST /chat - Chat with movie recommendation AI (protected, with history)
      if (path === '/chat' && method === 'POST') {
        const auth = await authenticateRequest(request, jwtSecret);
        
        if (!auth) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          const body = await request.json() as { message: string; conversationId?: string };
          
          if (!body.message) {
            return new Response(
              JSON.stringify({ error: 'message is required' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          let conversationId = body.conversationId;
          
          // Create new conversation if not provided
          if (!conversationId) {
            conversationId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            // Generate title from first message (truncated)
            const title = body.message.length > 50 ? body.message.substring(0, 47) + '...' : body.message;
            
            await env.MOVIE_DB.prepare(`
              INSERT INTO chat_conversations (conversation_id, user_id, title, created_at, updated_at)
              VALUES (?, ?, ?, datetime('now'), datetime('now'))
            `).bind(conversationId, auth.userId, title).run();
          }

          // Save user message
          const userMessageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          await env.MOVIE_DB.prepare(`
            INSERT INTO chat_messages (message_id, conversation_id, user_id, role, content, created_at)
            VALUES (?, ?, ?, 'user', ?, datetime('now'))
          `).bind(userMessageId, conversationId, auth.userId, body.message).run();

          // Get conversation history for context (last 10 messages) with movies
          const historyResult = await env.MOVIE_DB.prepare(`
            SELECT role, content, movies_data, search_id FROM chat_messages
            WHERE conversation_id = ?
            ORDER BY created_at DESC
            LIMIT 10
          `).bind(conversationId).all();
          
          const conversationHistory = (historyResult.results || [])
            .reverse()
            .map((msg: any) => ({ role: msg.role, content: msg.content }));
          
          // Get previous movies from the conversation (for follow-up filtering)
          let previousMovies: any[] | null = null;
          for (const msg of historyResult.results.reverse()) {
            if (msg.movies_data) {
              try {
                previousMovies = JSON.parse(msg.movies_data);
                break; // Get the most recent movies
              } catch (e) {
                console.error('Failed to parse previous movies:', e);
              }
            }
          }

          // Use AI to understand user intent and generate response
          const aiResult = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
            messages: [
              {
                role: "system",
                content: `You are a helpful movie recommendation assistant.

IMPORTANT: You MUST respond with valid JSON only. No other text.

CONTEXT: ${previousMovies && previousMovies.length > 0 
  ? `The user previously received ${previousMovies.length} movies. If the user asks to filter, refine, or narrow down these results, respond with type "filter" instead of "recommendation".`
  : 'This is a new conversation or no previous movies were shown.'}

When the user asks for NEW movie recommendations (not filtering previous results), respond with:
{
  "type": "recommendation",
  "criteria": { 
    "genres": ["genre1", "genre2"],
    "actors": ["actor name"],
    "directors": ["director name"],
    "keywords": ["keyword"],
    "minRating": 7.0,
    "releaseDateFrom": "2020",
    "releaseDateTo": "2024"
  },
  "message": "I'll find some great movies for you!"
}

When the user asks to FILTER or REFINE previous movie results (e.g., "filter by year 2020-2026", "only show movies from 2020", "show only high rated ones"), respond with:
{
  "type": "filter",
  "filterCriteria": {
    "releaseDateFrom": "2020",
    "releaseDateTo": "2026",
    "minRating": 8.0,
    "genres": ["Action"],
    "actors": ["Actor Name"]
  },
  "message": "Here are the filtered results!"
}

GENRE MAPPING RULES:
- "sci-fi", "scifi", "science fiction", "science-fiction", "SF" → use "Science Fiction"
- Use proper genre names: "Action", "Comedy", "Drama", "Horror", "Thriller", "Science Fiction", etc.

RATING RULES:
- "best rated", "top rated", "highest rated" → set minRating to 7.5 or higher
- "highly rated" → set minRating to 7.0
- "well rated" → set minRating to 6.5
- If no rating mentioned, use 6.0 as default

For general questions or clarifications (when NOT recommending or filtering movies), respond with:
{
  "type": "chat", 
  "message": "Your response here"
}

Always respond with ONLY the JSON object, nothing else.`
              },
              ...conversationHistory,
              { role: "user", content: body.message }
            ]
          });

          // Safely extract response as string
          const responseText = typeof aiResult.response === 'string' 
            ? aiResult.response 
            : JSON.stringify(aiResult.response);

          let parsedResponse: any;
          let searchId: string | null = null;
          let movies: any[] | null = null;

          // Helper function to detect if response suggests movie recommendations
          const detectRecommendation = (text: string): boolean => {
            const lowerText = text.toLowerCase();
            const recommendationPhrases = [
              'here are',
              "i'll find",
              "let me find",
              "i found",
              "showing you",
              "enjoy!",
              "movies that fit",
              "movies for you",
              "recommendations",
              "popular movies",
              "action movies",
              "sci-fi movies",
              "thriller movies",
              "horror movies",
              "featuring",
            ];
            return recommendationPhrases.some(phrase => lowerText.includes(phrase));
          };

          try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            parsedResponse = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);

            // Check both the parsed message and raw responseText for recommendation signals
            const messageText = parsedResponse.message || responseText;
            const shouldRecommend = parsedResponse.type === 'recommendation' || 
              detectRecommendation(messageText) ||
              detectRecommendation(responseText);

            // Handle filter requests (apply to previous movies)
            if (parsedResponse.type === 'filter' && previousMovies && previousMovies.length > 0) {
              const filterCriteria = parsedResponse.filterCriteria || {};
              
              // Apply filters to previous movies
              let filteredMovies = [...previousMovies];
              
              // Filter by release date
              if (filterCriteria.releaseDateFrom || filterCriteria.releaseDateTo) {
                filteredMovies = filteredMovies.filter(movie => {
                  const releaseYear = new Date(movie.releaseDate).getFullYear();
                  if (filterCriteria.releaseDateFrom) {
                    const fromYear = parseInt(filterCriteria.releaseDateFrom);
                    if (releaseYear < fromYear) return false;
                  }
                  if (filterCriteria.releaseDateTo) {
                    const toYear = parseInt(filterCriteria.releaseDateTo);
                    if (releaseYear > toYear) return false;
                  }
                  return true;
                });
              }
              
              // Filter by rating
              if (filterCriteria.minRating) {
                filteredMovies = filteredMovies.filter(movie => 
                  movie.rating >= filterCriteria.minRating
                );
              }
              
              // Filter by genres
              if (filterCriteria.genres && filterCriteria.genres.length > 0) {
                filteredMovies = filteredMovies.filter(movie => 
                  movie.genres && movie.genres.some(genre => 
                    filterCriteria.genres.some(filterGenre => 
                      genre.toLowerCase().includes(filterGenre.toLowerCase())
                    )
                  )
                );
              }
              
              // Filter by actors
              if (filterCriteria.actors && filterCriteria.actors.length > 0) {
                filteredMovies = filteredMovies.filter(movie => 
                  movie.actors && movie.actors.some(actor => 
                    filterCriteria.actors.some(filterActor => 
                      actor.toLowerCase().includes(filterActor.toLowerCase())
                    )
                  )
                );
              }
              
              // Filter by directors
              if (filterCriteria.directors && filterCriteria.directors.length > 0) {
                filteredMovies = filteredMovies.filter(movie => 
                  movie.director && filterCriteria.directors.some(filterDirector => 
                    movie.director.toLowerCase().includes(filterDirector.toLowerCase())
                  )
                );
              }
              
              // Store filtered results
              movies = filteredMovies;
              parsedResponse.type = 'recommendation'; // Change to recommendation so frontend handles it
            } else if (shouldRecommend) {
              parsedResponse.type = 'recommendation';
              
              // If criteria not provided, create empty criteria (no preferences)
              if (!parsedResponse.criteria) {
                parsedResponse.criteria = {
                  genres: [],
                  actors: [],
                  directors: [],
                  minRating: 6.0,
                };
              }

              // Normalize genre names (e.g., "sci-fi" -> "Science Fiction")
              if (parsedResponse.criteria.genres) {
                parsedResponse.criteria.genres = parsedResponse.criteria.genres.map(genre => {
                  const normalized = genre.toLowerCase().replace(/[^a-z0-9]/g, '');
                  if (normalized.includes('scifi') || normalized.includes('sciencefiction') || normalized === 'sf') {
                    return 'Science Fiction';
                  }
                  // Capitalize first letter of each word
                  return genre.split(' ').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                  ).join(' ');
                });
              }

              // Trigger movie search
              const agentId = env.MOVIE_RECOMMENDATION_AGENT.idFromName(auth.userId);
              const agent = env.MOVIE_RECOMMENDATION_AGENT.get(agentId);
              
              const searchResult = await agent.recommendMovies({
                userId: auth.userId,
                criteria: parsedResponse.criteria,
                isStructured: true,
              });

              searchId = searchResult.searchId;
            }
          } catch (parseError) {
            // If parsing fails, check if the raw text suggests a recommendation
            if (detectRecommendation(responseText)) {
              // Check if we should filter previous movies
              if (previousMovies && previousMovies.length > 0) {
                // Try to extract filter criteria from the message
                const lowerText = responseText.toLowerCase();
                const filterCriteria: any = {};
                
                // Extract year range
                const yearMatch = responseText.match(/(\d{4})\s*[-to]+\s*(\d{4})/i);
                if (yearMatch) {
                  filterCriteria.releaseDateFrom = yearMatch[1];
                  filterCriteria.releaseDateTo = yearMatch[2];
                } else {
                  const singleYear = responseText.match(/\b(19|20)\d{2}\b/);
                  if (singleYear) {
                    filterCriteria.releaseDateFrom = singleYear[0];
                    filterCriteria.releaseDateTo = singleYear[0];
                  }
                }
                
                // Extract rating
                if (lowerText.includes('high') || lowerText.includes('best') || lowerText.includes('top')) {
                  filterCriteria.minRating = 7.5;
                }
                
                // Apply filters if any
                if (Object.keys(filterCriteria).length > 0) {
                  let filteredMovies = [...previousMovies];
                  
                  if (filterCriteria.releaseDateFrom || filterCriteria.releaseDateTo) {
                    filteredMovies = filteredMovies.filter(movie => {
                      const releaseYear = new Date(movie.releaseDate).getFullYear();
                      if (filterCriteria.releaseDateFrom) {
                        const fromYear = parseInt(filterCriteria.releaseDateFrom);
                        if (releaseYear < fromYear) return false;
                      }
                      if (filterCriteria.releaseDateTo) {
                        const toYear = parseInt(filterCriteria.releaseDateTo);
                        if (releaseYear > toYear) return false;
                      }
                      return true;
                    });
                  }
                  
                  if (filterCriteria.minRating) {
                    filteredMovies = filteredMovies.filter(movie => 
                      movie.rating >= filterCriteria.minRating
                    );
                  }
                  
                  movies = filteredMovies;
                  parsedResponse = {
                    type: 'recommendation',
                    message: responseText,
                  };
                } else {
                  // No clear filter, start new search
                  const agentId = env.MOVIE_RECOMMENDATION_AGENT.idFromName(auth.userId);
                  const agent = env.MOVIE_RECOMMENDATION_AGENT.get(agentId);
                  
                  const searchResult = await agent.recommendMovies({
                    userId: auth.userId,
                    criteria: {
                      genres: [],
                      actors: [],
                      directors: [],
                      minRating: 6.0,
                    },
                    isStructured: true,
                  });

                  searchId = searchResult.searchId;
                  parsedResponse = {
                    type: 'recommendation',
                    message: responseText,
                  };
                }
              } else {
                // No previous movies, start new search
                const agentId = env.MOVIE_RECOMMENDATION_AGENT.idFromName(auth.userId);
                const agent = env.MOVIE_RECOMMENDATION_AGENT.get(agentId);
                
                const searchResult = await agent.recommendMovies({
                  userId: auth.userId,
                  criteria: {
                    genres: [],
                    actors: [],
                    directors: [],
                    minRating: 6.0,
                  },
                  isStructured: true,
                });

                searchId = searchResult.searchId;
                parsedResponse = {
                  type: 'recommendation',
                  message: responseText,
                };
              }
            } else {
              parsedResponse = {
                type: 'chat',
                message: responseText,
              };
            }
          }

          // Final safety check: if we have a searchId but type wasn't set to recommendation, fix it
          if (searchId && parsedResponse.type !== 'recommendation') {
            parsedResponse.type = 'recommendation';
          }

          // Debug logging
          console.log('Chat response:', {
            type: parsedResponse.type,
            hasSearchId: !!searchId,
            searchId,
            messagePreview: (parsedResponse.message || responseText).substring(0, 100),
          });

          // Ensure message is a string
          const messageContent = typeof parsedResponse.message === 'string' 
            ? parsedResponse.message 
            : responseText;

          // Save assistant message
          const assistantMessageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          // If we have filtered movies (no searchId), save them directly
          const moviesData = movies ? JSON.stringify(movies) : null;
          
          await env.MOVIE_DB.prepare(`
            INSERT INTO chat_messages (message_id, conversation_id, user_id, role, content, search_id, movies_data, created_at)
            VALUES (?, ?, ?, 'assistant', ?, ?, ?, datetime('now'))
          `).bind(
            assistantMessageId, 
            conversationId, 
            auth.userId, 
            messageContent,
            searchId || null,
            moviesData
          ).run();

          // Update conversation timestamp
          await env.MOVIE_DB.prepare(`
            UPDATE chat_conversations SET updated_at = datetime('now') WHERE conversation_id = ?
          `).bind(conversationId).run();

          // If we have filtered movies (no searchId), include them in response
          const responseData: any = {
            type: parsedResponse.type || 'chat',
            message: messageContent,
            conversationId,
            messageId: assistantMessageId,
          };
          
          if (searchId) {
            responseData.searchId = searchId;
          }
          
          // If we have movies from filtering (not from search), include them directly
          if (movies && movies.length > 0 && !searchId) {
            responseData.movies = movies;
          }
          
          return new Response(
            JSON.stringify(responseData),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (chatError) {
          console.error('Chat error:', chatError);
          return new Response(
            JSON.stringify({ 
              error: 'Failed to process chat message',
              details: chatError instanceof Error ? chatError.message : 'Unknown error'
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: POST /chat/messages/:conversationId/movies - Save movies to a message
      if (path.startsWith('/chat/messages/') && path.endsWith('/movies') && method === 'POST') {
        const auth = await authenticateRequest(request, jwtSecret);
        
        if (!auth) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const pathParts = path.split('/');
        const messageId = pathParts[3];
        const body = await request.json() as { movies: any[] };
        
        try {
          await env.MOVIE_DB.prepare(`
            UPDATE chat_messages SET movies_data = ? WHERE message_id = ? AND user_id = ?
          `).bind(JSON.stringify(body.movies), messageId, auth.userId).run();
          
          return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to save movies' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
