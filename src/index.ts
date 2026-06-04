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
import { cachedJsonResponse } from './utils/cache';
import { getTasteProfilePayload, maybeSyncTasteToPreferences } from './utils/taste-sync';

// Export Workflows and Agents (Durable Objects) for Cloudflare Workers
export { MovieSearchWorkflow };
export { MovieRecommendationAgent, MoviePreferenceAnalysisAgent };

// Default JWT secret for development (should be overridden via wrangler secret)
const DEFAULT_JWT_SECRET = 'dev-secret-change-in-production';

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
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

        await maybeSyncTasteToPreferences(env, auth.userId);

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

          // Fetch user preferences for intelligent merging
          let userPreferences: any = null;
          try {
            const prefAgentId = env.MOVIE_PREFERENCE_ANALYSIS_AGENT.idFromName(auth.userId);
            const prefAgent = env.MOVIE_PREFERENCE_ANALYSIS_AGENT.get(prefAgentId);
            userPreferences = await prefAgent.getUserPreferences(auth.userId);
          } catch (prefError) {
            console.log('Could not fetch user preferences:', prefError);
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
  "specificity": "specific" or "vague",
  "criteria": { 
    "genres": ["genre1", "genre2"],
    "actors": ["actor name"],
    "directors": ["director name"],
    "keywords": ["keyword"],
    "minRating": 7.0,
    "year": 2024,
    "releaseDateFrom": "2020-01-01",
    "releaseDateTo": "2024-12-31"
  },
  "message": "I'll find some great movies for you!"
}

SPECIFICITY RULES (VERY IMPORTANT):
- "specific": User explicitly mentions genres, actors, directors, years, or specific themes (e.g., "horror movies", "Tom Hanks movies", "sci-fi from the 80s")
- "vague": User asks for general recommendations without specific criteria (e.g., "recommend me something", "what should I watch?", "suggest some movies", "I'm bored")
- When in doubt, use "specific" to respect the user's explicit request

YEAR/DATE RULES (VERY IMPORTANT):
- For a SINGLE YEAR like "movies from 2025" or "2025 movies" → use "year": 2025 (as a number, not string)
- For a DATE RANGE like "movies from 2020 to 2024" → use "releaseDateFrom": "2020-01-01", "releaseDateTo": "2024-12-31"
- ALWAYS use full date format YYYY-MM-DD for releaseDateFrom and releaseDateTo
- For "recent movies" or "new movies" → use "year": ${new Date().getFullYear()} or releaseDateFrom from last 2 years
- For decades like "80s movies" → use "releaseDateFrom": "1980-01-01", "releaseDateTo": "1989-12-31"
- If user says "movies of 2025", use "year": 2025, NOT releaseDateFrom/To

When the user asks to FILTER or REFINE previous movie results (e.g., "filter by year 2020-2026", "only show movies from 2020", "show only high rated ones"), respond with:
{
  "type": "filter",
  "filterCriteria": {
    "year": 2020,
    "releaseDateFrom": "2020-01-01",
    "releaseDateTo": "2026-12-31",
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
                parsedResponse.criteria.genres = parsedResponse.criteria.genres.map((genre: string) => {
                  const normalized = genre.toLowerCase().replace(/[^a-z0-9]/g, '');
                  if (normalized.includes('scifi') || normalized.includes('sciencefiction') || normalized === 'sf') {
                    return 'Science Fiction';
                  }
                  // Capitalize first letter of each word
                  return genre.split(' ').map((word: string) => 
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                  ).join(' ');
                });
              }

              // Apply user preferences intelligently based on specificity
              const mergedCriteria = mergePreferencesWithCriteria(
                parsedResponse.criteria,
                userPreferences,
                parsedResponse.specificity || 'specific' // Default to 'specific' to respect user's request
              );

              // Trigger movie search
              const agentId = env.MOVIE_RECOMMENDATION_AGENT.idFromName(auth.userId);
              const agent = env.MOVIE_RECOMMENDATION_AGENT.get(agentId);
              
              const searchResult = await agent.recommendMovies({
                userId: auth.userId,
                criteria: mergedCriteria,
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
                  // No clear filter, start new search with user preferences
                  const fallbackCriteria = mergePreferencesWithCriteria(
                    { genres: [], actors: [], directors: [], minRating: 6.0 },
                    userPreferences,
                    'vague' // Fallback is a vague query
                  );
                  
                  const agentId = env.MOVIE_RECOMMENDATION_AGENT.idFromName(auth.userId);
                  const agent = env.MOVIE_RECOMMENDATION_AGENT.get(agentId);
                  
                  const searchResult = await agent.recommendMovies({
                    userId: auth.userId,
                    criteria: fallbackCriteria,
                    isStructured: true,
                  });

                  searchId = searchResult.searchId;
                  parsedResponse = {
                    type: 'recommendation',
                    message: responseText,
                  };
                }
              } else {
                // No previous movies, start new search with user preferences
                const fallbackCriteria = mergePreferencesWithCriteria(
                  { genres: [], actors: [], directors: [], minRating: 6.0 },
                  userPreferences,
                  'vague' // Fallback is a vague query
                );
                
                const agentId = env.MOVIE_RECOMMENDATION_AGENT.idFromName(auth.userId);
                const agent = env.MOVIE_RECOMMENDATION_AGENT.get(agentId);
                
                const searchResult = await agent.recommendMovies({
                  userId: auth.userId,
                  criteria: fallbackCriteria,
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

      // ==================== PERSONALIZATION ROUTES ====================

      // Route: POST /feedback - Submit movie feedback (like/dislike)
      if (path === '/feedback' && method === 'POST') {
        const auth = await authenticateRequest(request, jwtSecret);
        
        if (!auth) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          const body = await request.json() as {
            movieId: string;
            feedbackType: 'like' | 'dislike' | 'love' | 'not_interested' | 'hate';
            rating?: number;
            movieData?: any;
          };

          if (!body.movieId || !body.feedbackType) {
            return new Response(
              JSON.stringify({ error: 'movieId and feedbackType are required' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const feedbackId = `fb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          // Upsert feedback
          await env.MOVIE_DB.prepare(`
            INSERT INTO movie_feedback (feedback_id, user_id, movie_id, feedback_type, rating, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            ON CONFLICT(user_id, movie_id) DO UPDATE SET 
              feedback_type = excluded.feedback_type,
              rating = excluded.rating,
              updated_at = datetime('now')
          `).bind(feedbackId, auth.userId, body.movieId, body.feedbackType, body.rating || null).run();

          // Update taste profile
          await updateTasteProfile(env, auth.userId, body.movieId, body.feedbackType, body.movieData);

          const tasteSync = await maybeSyncTasteToPreferences(env, auth.userId);

          return new Response(
            JSON.stringify({ 
              success: true, 
              feedbackId,
              tasteProfileUpdated: true,
              preferencesSynced: tasteSync.synced,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('Feedback error:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to save feedback' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: GET /feedback/:movieId - Get user's feedback for a movie
      if (path.startsWith('/feedback/') && method === 'GET') {
        const auth = await authenticateRequest(request, jwtSecret);
        
        if (!auth) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const movieId = path.split('/feedback/')[1];
        
        try {
          const feedback = await env.MOVIE_DB.prepare(`
            SELECT * FROM movie_feedback WHERE user_id = ? AND movie_id = ?
          `).bind(auth.userId, movieId).first();

          return new Response(
            JSON.stringify({ feedback: feedback || null }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to get feedback' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: GET /taste-profile - Get user's taste profile
      if (path === '/taste-profile' && method === 'GET') {
        const auth = await authenticateRequest(request, jwtSecret);
        
        if (!auth) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          const payload = await getTasteProfilePayload(env, auth.userId, { sync: true });
          const profile = await env.MOVIE_DB.prepare(`
            SELECT * FROM user_taste_profiles WHERE user_id = ?
          `).bind(auth.userId).first();

          return new Response(
            JSON.stringify({
              profile: profile || null,
              summary: payload.summary,
              feedbackBreakdown: payload.feedbackBreakdown,
              lastSyncedAt: payload.lastSyncedAt,
              synced: payload.synced,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('Taste profile error:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to get taste profile' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: GET /watch-history - Get user's watch history
      if (path === '/watch-history' && method === 'GET') {
        const auth = await authenticateRequest(request, jwtSecret);
        
        if (!auth) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          const limit = parseInt(url.searchParams.get('limit') || '50');
          const offset = parseInt(url.searchParams.get('offset') || '0');

          const history = await env.MOVIE_DB.prepare(`
            SELECT * FROM watch_history 
            WHERE user_id = ? 
            ORDER BY watched_at DESC 
            LIMIT ? OFFSET ?
          `).bind(auth.userId, limit, offset).all();

          const total = await env.MOVIE_DB.prepare(`
            SELECT COUNT(*) as count FROM watch_history WHERE user_id = ?
          `).bind(auth.userId).first<{ count: number }>();

          return new Response(
            JSON.stringify({ 
              items: history.results.map((h: any) => ({
                ...h,
                movieData: h.movie_data ? JSON.parse(h.movie_data) : null
              })),
              totalCount: total?.count || 0
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to get watch history' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: POST /watch-history - Mark movie as watched
      if (path === '/watch-history' && method === 'POST') {
        const auth = await authenticateRequest(request, jwtSecret);
        
        if (!auth) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          const body = await request.json() as { movieId: string; movieData?: any };
          const historyId = `wh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          await env.MOVIE_DB.prepare(`
            INSERT INTO watch_history (history_id, user_id, movie_id, movie_data, watched_at, source)
            VALUES (?, ?, ?, ?, datetime('now'), 'manual')
            ON CONFLICT(user_id, movie_id) DO UPDATE SET watched_at = datetime('now')
          `).bind(historyId, auth.userId, body.movieId, body.movieData ? JSON.stringify(body.movieData) : null).run();

          return new Response(
            JSON.stringify({ success: true, historyId }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to add to watch history' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // ==================== SOCIAL & ENGAGEMENT ROUTES ====================

      // Route: GET /watchlist - Get user's watchlist
      if (path === '/watchlist' && method === 'GET') {
        const auth = await authenticateRequest(request, jwtSecret);
        
        if (!auth) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          const sortBy = url.searchParams.get('sortBy') || 'added_at';
          const sortOrder = url.searchParams.get('sortOrder') || 'DESC';
          
          const items = await env.MOVIE_DB.prepare(`
            SELECT * FROM watchlist 
            WHERE user_id = ? 
            ORDER BY ${sortBy === 'priority' ? 'priority DESC,' : ''} added_at ${sortOrder}
          `).bind(auth.userId).all();

          const reminders = await env.MOVIE_DB.prepare(`
            SELECT COUNT(*) as count FROM watchlist 
            WHERE user_id = ? AND reminder_date IS NOT NULL AND reminder_date >= date('now')
          `).bind(auth.userId).first<{ count: number }>();

          return new Response(
            JSON.stringify({ 
              items: items.results.map((item: any) => ({
                ...item,
                movieData: JSON.parse(item.movie_data),
                tags: JSON.parse(item.tags || '[]')
              })),
              totalCount: items.results.length,
              hasReminders: reminders?.count || 0
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('Watchlist error:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to get watchlist' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: POST /watchlist - Add to watchlist
      if (path === '/watchlist' && method === 'POST') {
        const auth = await authenticateRequest(request, jwtSecret);
        
        if (!auth) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          const body = await request.json() as {
            movieId: string;
            movieData: any;
            priority?: number;
            notes?: string;
            reminderDate?: string;
            tags?: string[];
          };

          if (!body.movieId || !body.movieData) {
            return new Response(
              JSON.stringify({ error: 'movieId and movieData are required' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const watchlistId = `wl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          await env.MOVIE_DB.prepare(`
            INSERT INTO watchlist (watchlist_id, user_id, movie_id, movie_data, priority, notes, reminder_date, tags, added_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            ON CONFLICT(user_id, movie_id) DO UPDATE SET 
              priority = excluded.priority,
              notes = excluded.notes,
              reminder_date = excluded.reminder_date,
              tags = excluded.tags,
              updated_at = datetime('now')
          `).bind(
            watchlistId,
            auth.userId,
            body.movieId,
            JSON.stringify(body.movieData),
            body.priority || 0,
            body.notes || null,
            body.reminderDate || null,
            JSON.stringify(body.tags || [])
          ).run();

          return new Response(
            JSON.stringify({ success: true, watchlistId }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('Add to watchlist error:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to add to watchlist' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: PUT /watchlist/:movieId - Update watchlist item
      if (path.startsWith('/watchlist/') && method === 'PUT') {
        const auth = await authenticateRequest(request, jwtSecret);
        
        if (!auth) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const movieId = path.split('/watchlist/')[1];
        const body = await request.json() as {
          priority?: number;
          notes?: string;
          reminderDate?: string;
          tags?: string[];
        };

        try {
          await env.MOVIE_DB.prepare(`
            UPDATE watchlist SET 
              priority = COALESCE(?, priority),
              notes = COALESCE(?, notes),
              reminder_date = ?,
              tags = COALESCE(?, tags),
              updated_at = datetime('now')
            WHERE user_id = ? AND movie_id = ?
          `).bind(
            body.priority ?? null,
            body.notes ?? null,
            body.reminderDate ?? null,
            body.tags ? JSON.stringify(body.tags) : null,
            auth.userId,
            movieId
          ).run();

          return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to update watchlist item' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: DELETE /watchlist/:movieId - Remove from watchlist
      if (path.startsWith('/watchlist/') && method === 'DELETE') {
        const auth = await authenticateRequest(request, jwtSecret);
        
        if (!auth) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const movieId = path.split('/watchlist/')[1];

        try {
          await env.MOVIE_DB.prepare(`
            DELETE FROM watchlist WHERE user_id = ? AND movie_id = ?
          `).bind(auth.userId, movieId).run();

          return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to remove from watchlist' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: GET /reviews/movie/:movieId - Get reviews for a movie
      if (path.startsWith('/reviews/movie/') && method === 'GET') {
        const movieId = path.split('/reviews/movie/')[1];
        const auth = await authenticateRequest(request, jwtSecret);
        
        try {
          const reviews = await env.MOVIE_DB.prepare(`
            SELECT r.*, u.name as user_name, u.avatar_url as user_avatar_url
            FROM movie_reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.movie_id = ? AND r.is_public = TRUE
            ORDER BY r.helpful_count DESC, r.created_at DESC
            LIMIT 20
          `).bind(movieId).all();

          // Get user's vote for each review if authenticated
          let userVotes: Record<string, boolean> = {};
          if (auth) {
            const votes = await env.MOVIE_DB.prepare(`
              SELECT review_id, is_helpful FROM review_votes WHERE user_id = ?
            `).bind(auth.userId).all();
            userVotes = Object.fromEntries(
              votes.results.map((v: any) => [v.review_id, v.is_helpful])
            );
          }

          const avgRating = await env.MOVIE_DB.prepare(`
            SELECT AVG(rating) as avg, COUNT(*) as count FROM movie_reviews WHERE movie_id = ?
          `).bind(movieId).first<{ avg: number; count: number }>();

          return new Response(
            JSON.stringify({ 
              reviews: reviews.results.map((r: any) => ({
                ...r,
                movieData: r.movie_data ? JSON.parse(r.movie_data) : null,
                userVote: userVotes[r.review_id]
              })),
              totalCount: avgRating?.count || 0,
              averageRating: avgRating?.avg ? Math.round(avgRating.avg * 10) / 10 : null
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to get reviews' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: GET /reviews/user - Get current user's reviews
      if (path === '/reviews/user' && method === 'GET') {
        const auth = await authenticateRequest(request, jwtSecret);
        
        if (!auth) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          const reviews = await env.MOVIE_DB.prepare(`
            SELECT * FROM movie_reviews WHERE user_id = ? ORDER BY created_at DESC
          `).bind(auth.userId).all();

          return new Response(
            JSON.stringify({ 
              reviews: reviews.results.map((r: any) => ({
                ...r,
                movieData: r.movie_data ? JSON.parse(r.movie_data) : null
              }))
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to get reviews' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: POST /reviews - Create a review
      if (path === '/reviews' && method === 'POST') {
        const auth = await authenticateRequest(request, jwtSecret);
        
        if (!auth) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          const body = await request.json() as {
            movieId: string;
            movieData?: any;
            rating: number;
            title?: string;
            content?: string;
            containsSpoilers?: boolean;
            isPublic?: boolean;
          };

          if (!body.movieId || !body.rating || body.rating < 1 || body.rating > 10) {
            return new Response(
              JSON.stringify({ error: 'Valid movieId and rating (1-10) are required' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const reviewId = `rv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          await env.MOVIE_DB.prepare(`
            INSERT INTO movie_reviews (review_id, user_id, movie_id, movie_data, rating, title, content, contains_spoilers, is_public, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            ON CONFLICT(user_id, movie_id) DO UPDATE SET 
              rating = excluded.rating,
              title = excluded.title,
              content = excluded.content,
              contains_spoilers = excluded.contains_spoilers,
              is_public = excluded.is_public,
              updated_at = datetime('now')
          `).bind(
            reviewId,
            auth.userId,
            body.movieId,
            body.movieData ? JSON.stringify(body.movieData) : null,
            body.rating,
            body.title || null,
            body.content || null,
            body.containsSpoilers || false,
            body.isPublic !== false
          ).run();

          // Also update feedback with the rating
          await env.MOVIE_DB.prepare(`
            INSERT INTO movie_feedback (feedback_id, user_id, movie_id, feedback_type, rating, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            ON CONFLICT(user_id, movie_id) DO UPDATE SET 
              rating = excluded.rating,
              updated_at = datetime('now')
          `).bind(
            `fb-${Date.now()}`,
            auth.userId,
            body.movieId,
            body.rating >= 7 ? 'like' : body.rating >= 5 ? 'not_interested' : 'dislike',
            body.rating
          ).run();

          return new Response(
            JSON.stringify({ success: true, reviewId }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('Create review error:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to create review' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: POST /reviews/:reviewId/vote - Vote on a review
      if (path.match(/^\/reviews\/[^/]+\/vote$/) && method === 'POST') {
        const auth = await authenticateRequest(request, jwtSecret);
        
        if (!auth) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const reviewId = path.split('/')[2];
        const body = await request.json() as { isHelpful: boolean };

        try {
          const voteId = `vote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          await env.MOVIE_DB.prepare(`
            INSERT INTO review_votes (vote_id, review_id, user_id, is_helpful, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
            ON CONFLICT(review_id, user_id) DO UPDATE SET is_helpful = excluded.is_helpful
          `).bind(voteId, reviewId, auth.userId, body.isHelpful).run();

          // Update helpful count
          const helpfulCount = await env.MOVIE_DB.prepare(`
            SELECT COUNT(*) as count FROM review_votes WHERE review_id = ? AND is_helpful = TRUE
          `).bind(reviewId).first<{ count: number }>();

          await env.MOVIE_DB.prepare(`
            UPDATE movie_reviews SET helpful_count = ? WHERE review_id = ?
          `).bind(helpfulCount?.count || 0, reviewId).run();

          return new Response(
            JSON.stringify({ success: true, helpfulCount: helpfulCount?.count || 0 }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to vote on review' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: POST /shared-lists - Create a shared list
      if (path === '/shared-lists' && method === 'POST') {
        const auth = await authenticateRequest(request, jwtSecret);
        
        if (!auth) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          const body = await request.json() as {
            title: string;
            description?: string;
            movies: any[];
            isPublic?: boolean;
            expiresAt?: string;
          };

          if (!body.title || !body.movies || body.movies.length === 0) {
            return new Response(
              JSON.stringify({ error: 'title and movies are required' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          const listId = `list-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const shareCode = Math.random().toString(36).substr(2, 8).toUpperCase();
          
          await env.MOVIE_DB.prepare(`
            INSERT INTO shared_lists (list_id, creator_id, title, description, share_code, movies, is_public, created_at, updated_at, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?)
          `).bind(
            listId,
            auth.userId,
            body.title,
            body.description || null,
            shareCode,
            JSON.stringify(body.movies),
            body.isPublic !== false,
            body.expiresAt || null
          ).run();

          return new Response(
            JSON.stringify({ 
              success: true, 
              listId, 
              shareCode,
              shareUrl: `/shared/${shareCode}`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('Create shared list error:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to create shared list' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: GET /shared-lists/:shareCode - Get a shared list by code (public)
      if (path.startsWith('/shared-lists/') && method === 'GET') {
        const shareCode = path.split('/shared-lists/')[1];
        
        try {
          const list = await env.MOVIE_DB.prepare(`
            SELECT l.*, u.name as creator_name
            FROM shared_lists l
            JOIN users u ON l.creator_id = u.id
            WHERE l.share_code = ? AND l.is_public = TRUE
            AND (l.expires_at IS NULL OR l.expires_at > datetime('now'))
          `).bind(shareCode).first();

          if (!list) {
            return new Response(
              JSON.stringify({ error: 'List not found or expired' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Increment view count
          await env.MOVIE_DB.prepare(`
            UPDATE shared_lists SET view_count = view_count + 1 WHERE share_code = ?
          `).bind(shareCode).run();

          return new Response(
            JSON.stringify({ 
              list: {
                ...(list as any),
                movies: JSON.parse((list as any).movies)
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to get shared list' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: GET /my-shared-lists - Get user's shared lists
      if (path === '/my-shared-lists' && method === 'GET') {
        const auth = await authenticateRequest(request, jwtSecret);
        
        if (!auth) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          const lists = await env.MOVIE_DB.prepare(`
            SELECT * FROM shared_lists WHERE creator_id = ? ORDER BY created_at DESC
          `).bind(auth.userId).all();

          return new Response(
            JSON.stringify({ 
              lists: lists.results.map((l: any) => ({
                ...l,
                movies: JSON.parse(l.movies)
              }))
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to get shared lists' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // ==================== CONTENT & DISCOVERY ROUTES ====================

      // Route: GET /collections - Get curated collections
      if (path === '/collections' && method === 'GET') {
        const auth = await authenticateRequest(request, jwtSecret);
        
        try {
          const type = url.searchParams.get('type'); // 'seasonal', 'genre', 'decade', etc.
          
          let query = `
            SELECT * FROM curated_collections 
            WHERE is_active = TRUE
          `;
          const params: any[] = [];
          
          if (type) {
            query += ` AND collection_type = ?`;
            params.push(type);
          }
          
          // Filter seasonal collections by current date
          query += ` AND (valid_from IS NULL OR valid_from <= date('now'))
                     AND (valid_until IS NULL OR valid_until >= date('now'))`;
          
          query += ` ORDER BY display_order ASC`;
          
          const stmt = params.length > 0 
            ? env.MOVIE_DB.prepare(query).bind(...params)
            : env.MOVIE_DB.prepare(query);
            
          const collections = await stmt.all();

          // Get user's saved collections if authenticated
          let savedIds: Set<string> = new Set();
          if (auth) {
            const saved = await env.MOVIE_DB.prepare(`
              SELECT collection_id FROM user_saved_collections WHERE user_id = ?
            `).bind(auth.userId).all();
            savedIds = new Set(saved.results.map((s: any) => s.collection_id));
          }

          // Determine current season for highlighting
          const now = new Date();
          const month = now.getMonth();
          let currentSeason = '';
          if (month >= 9 && month <= 10) currentSeason = 'halloween';
          else if (month === 11 || month === 0) currentSeason = 'christmas';
          else if (month >= 1 && month <= 2) currentSeason = 'valentine';
          else if (month >= 5 && month <= 7) currentSeason = 'summer';

          const result = collections.results.map((c: any) => ({
            ...c,
            movies: JSON.parse(c.movies || '[]'),
            criteria: c.criteria ? JSON.parse(c.criteria) : null,
            isSaved: savedIds.has(c.collection_id),
            isCurrentSeason: c.season === currentSeason
          }));

          // Separate into categories
          const seasonal = result.filter((c: any) => c.collection_type === 'seasonal');
          const regular = result.filter((c: any) => c.collection_type !== 'seasonal');
          const saved = result.filter((c: any) => c.isSaved);

          return new Response(
            JSON.stringify({ collections: regular, seasonal, saved }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('Collections error:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to get collections' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: GET /collections/:collectionId - Get a specific collection
      if (path.match(/^\/collections\/[^/]+$/) && method === 'GET') {
        const collectionId = path.split('/collections/')[1];
        
        try {
          const collection = await env.MOVIE_DB.prepare(`
            SELECT * FROM curated_collections WHERE collection_id = ? AND is_active = TRUE
          `).bind(collectionId).first();

          if (!collection) {
            return new Response(
              JSON.stringify({ error: 'Collection not found' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // If collection has criteria but no movies, fetch them
          let movies = JSON.parse((collection as any).movies || '[]');
          if (movies.length === 0 && (collection as any).criteria) {
            const criteria = JSON.parse((collection as any).criteria);
            // Use TMDB to fetch movies based on criteria
            const { TMDBAPI } = await import('./tools/movie-apis/tmdb');
            const tmdb = new TMDBAPI(env.TMDB_API_KEY || '');
            movies = await tmdb.searchMovies(criteria);
            
            // Cache the results
            await env.MOVIE_DB.prepare(`
              UPDATE curated_collections SET movies = ?, updated_at = datetime('now') WHERE collection_id = ?
            `).bind(JSON.stringify(movies), collectionId).run();
          }

          return new Response(
            JSON.stringify({ 
              collection: {
                ...(collection as any),
                movies,
                criteria: (collection as any).criteria ? JSON.parse((collection as any).criteria) : null
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('Get collection error:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to get collection' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: POST /collections/:collectionId/save - Save/unsave a collection
      if (path.match(/^\/collections\/[^/]+\/save$/) && method === 'POST') {
        const auth = await authenticateRequest(request, jwtSecret);
        
        if (!auth) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const collectionId = path.split('/')[2];
        const body = await request.json() as { save: boolean };

        try {
          if (body.save) {
            const saveId = `save-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            await env.MOVIE_DB.prepare(`
              INSERT OR IGNORE INTO user_saved_collections (save_id, user_id, collection_id, saved_at)
              VALUES (?, ?, ?, datetime('now'))
            `).bind(saveId, auth.userId, collectionId).run();
          } else {
            await env.MOVIE_DB.prepare(`
              DELETE FROM user_saved_collections WHERE user_id = ? AND collection_id = ?
            `).bind(auth.userId, collectionId).run();
          }

          return new Response(
            JSON.stringify({ success: true, saved: body.save }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to update saved collection' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: GET /similar/:movieId - Get similar movies
      if (path.startsWith('/similar/') && method === 'GET') {
        const movieId = path.split('/similar/')[1];
        
        try {
          // Check cache first
          const cached = await env.MOVIE_DB.prepare(`
            SELECT * FROM similar_movies_cache 
            WHERE source_movie_id = ? AND expires_at > datetime('now')
          `).bind(movieId).first();

          if (cached) {
            return new Response(
              JSON.stringify({ 
                sourceMovieId: movieId,
                similarMovies: JSON.parse((cached as any).similar_movies),
                cached: true
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Fetch from TMDB
          const { TMDBAPI } = await import('./tools/movie-apis/tmdb');
          const tmdb = new TMDBAPI(env.TMDB_API_KEY || '');
          
          // Get both similar and recommended movies for better results
          const [similar, recommendations] = await Promise.all([
            tmdb.getSimilarMovies(movieId, 10),
            tmdb.getRecommendations(movieId, 10)
          ]);

          // Merge and deduplicate
          const allMovies = [...similar, ...recommendations];
          const uniqueMovies = Array.from(
            new Map(allMovies.map(m => [m.id, m])).values()
          ).slice(0, 15);

          // Cache results
          const cacheId = `cache-${Date.now()}`;
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7); // Cache for 7 days

          await env.MOVIE_DB.prepare(`
            INSERT INTO similar_movies_cache (cache_id, source_movie_id, similar_movies, created_at, expires_at)
            VALUES (?, ?, ?, datetime('now'), ?)
          `).bind(cacheId, movieId, JSON.stringify(uniqueMovies), expiresAt.toISOString()).run();

          return new Response(
            JSON.stringify({ 
              sourceMovieId: movieId,
              similarMovies: uniqueMovies,
              cached: false
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('Similar movies error:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to get similar movies' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: GET /trending - Get trending movies
      if (path === '/trending' && method === 'GET') {
        try {
          const timeWindow = (url.searchParams.get('timeWindow') || 'week') as 'day' | 'week';
          const limit = parseInt(url.searchParams.get('limit') || '20');
          const enrich = url.searchParams.get('enrich') === 'true';

          return cachedJsonResponse(request, 300, async () => {
            const { TMDBAPI } = await import('./tools/movie-apis/tmdb');
            const tmdb = new TMDBAPI(env.TMDB_API_KEY || '');
            const movies = await tmdb.getTrending(timeWindow, limit, enrich);

            return new Response(
              JSON.stringify({ movies, timeWindow }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          });
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to get trending movies' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: GET /person/:personId - Get person details (actor/director)
      if (path.startsWith('/person/') && method === 'GET') {
        const personId = parseInt(path.split('/person/')[1]);
        
        try {
          const { TMDBAPI } = await import('./tools/movie-apis/tmdb');
          const tmdb = new TMDBAPI(env.TMDB_API_KEY || '');
          
          const person = await tmdb.getPersonDetails(personId);

          if (!person) {
            return new Response(
              JSON.stringify({ error: 'Person not found' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Get their movies
          const isDirector = person.knownForDepartment === 'Directing';
          const movies = isDirector 
            ? await tmdb.searchByDirector(person.name, { limit: 20 })
            : await tmdb.searchByActor(person.name, { limit: 20 });

          return new Response(
            JSON.stringify({ person, movies }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to get person details' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: GET /search/person - Search for actors/directors
      if (path === '/search/person' && method === 'GET') {
        const query = url.searchParams.get('q');
        
        if (!query) {
          return new Response(
            JSON.stringify({ error: 'Query parameter q is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          const { TMDBAPI } = await import('./tools/movie-apis/tmdb');
          const tmdb = new TMDBAPI(env.TMDB_API_KEY || '');
          
          const results = await tmdb.searchPerson(query);

          return new Response(
            JSON.stringify({ results }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to search person' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: GET /watch-providers/:movieId - Get watch providers
      if (path.startsWith('/watch-providers/') && method === 'GET') {
        const movieId = path.split('/watch-providers/')[1];
        const region = url.searchParams.get('region') || 'US';
        
        try {
          const { TMDBAPI } = await import('./tools/movie-apis/tmdb');
          const tmdb = new TMDBAPI(env.TMDB_API_KEY || '');
          
          const providers = await tmdb.getWatchProviders(movieId, region);

          return new Response(
            JSON.stringify({ movieId, region, providers }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to get watch providers' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Route: GET /discovery - Get personalized discovery page
      if (path === '/discovery' && method === 'GET') {
        const auth = await authenticateRequest(request, jwtSecret);
        
        try {
          const buildDiscovery = async () => {
            const { TMDBAPI } = await import('./tools/movie-apis/tmdb');
            const tmdb = new TMDBAPI(env.TMDB_API_KEY || '');

            const sections: any[] = [];

            // Trending + DB queries in parallel (fast path: no per-movie TMDB enrichment)
            const [trending, seasonal, genreCollections, profile] = await Promise.all([
              tmdb.getTrending('week', 10, false),
              env.MOVIE_DB.prepare(`
                SELECT * FROM curated_collections 
                WHERE collection_type = 'seasonal' AND is_active = TRUE
                AND (valid_from IS NULL OR valid_from <= date('now'))
                AND (valid_until IS NULL OR valid_until >= date('now'))
                ORDER BY display_order ASC
                LIMIT 2
              `).all(),
              env.MOVIE_DB.prepare(`
                SELECT * FROM curated_collections 
                WHERE collection_type IN ('genre', 'decade') AND is_active = TRUE
                ORDER BY display_order ASC
                LIMIT 3
              `).all(),
              auth
                ? env.MOVIE_DB.prepare(
                    'SELECT * FROM user_taste_profiles WHERE user_id = ?'
                  ).bind(auth.userId).first()
                : Promise.resolve(null),
            ]);

            sections.push({
              id: 'trending',
              title: 'Trending This Week',
              type: 'trending',
              items: trending,
            });

            for (const collection of seasonal.results) {
              const movies = JSON.parse((collection as any).movies || '[]');
              if (movies.length > 0) {
                sections.push({
                  id: (collection as any).collection_id,
                  title: (collection as any).title,
                  subtitle: (collection as any).description,
                  type: 'collection',
                  items: movies.slice(0, 10),
                });
              }
            }

            const personalizedPicks: any[] = [];
            if (profile && (profile as any).profile_strength > 0.3) {
              const genreScores = JSON.parse((profile as any).genre_scores || '{}');
              const topGenres = Object.entries(genreScores)
                .sort((a, b) => (b[1] as number) - (a[1] as number))
                .slice(0, 2)
                .map(([genre]) => genre);

              if (topGenres.length > 0) {
                const personalizedMovies = await tmdb.searchMovies(
                  {
                    genres: topGenres,
                    minRating: (profile as any).avg_rating_preference || 7.0,
                    limit: 10,
                  },
                  { enrichDetails: false }
                );

                sections.push({
                  id: 'personalized',
                  title: 'Picked For You',
                  subtitle: `Based on your love for ${topGenres.join(' and ')}`,
                  type: 'personalized',
                  items: personalizedMovies,
                });
              }
            }

            // Fetch empty collections in parallel (was sequential — major latency source)
            const genreSections = await Promise.all(
              genreCollections.results.map(async (collection) => {
                let movies = JSON.parse((collection as any).movies || '[]');
                if (movies.length === 0 && (collection as any).criteria) {
                  const criteria = JSON.parse((collection as any).criteria);
                  movies = await tmdb.searchMovies(
                    { ...criteria, limit: 10 },
                    { enrichDetails: false }
                  );
                }
                if (movies.length === 0) return null;
                return {
                  id: (collection as any).collection_id,
                  title: (collection as any).title,
                  subtitle: (collection as any).description,
                  type: 'collection',
                  items: movies.slice(0, 10),
                };
              })
            );
            sections.push(...genreSections.filter(Boolean));

            return new Response(
              JSON.stringify({ sections, personalizedPicks }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          };

          // Skip edge cache when personalized (auth); anonymous discovery is cacheable
          if (auth) {
            return buildDiscovery();
          }
          return cachedJsonResponse(request, 300, buildDiscovery);
        } catch (error) {
          console.error('Discovery error:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to load discovery page' }),
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

// Helper function to intelligently merge user preferences with search criteria
// Based on specificity: 
// - "specific": User made explicit request → use their criteria, only apply hard filters from preferences
// - "vague": User asked for general recommendations → apply preferences to fill in gaps
function mergePreferencesWithCriteria(
  criteria: any,
  preferences: any,
  specificity: 'specific' | 'vague'
): any {
  // If no preferences, return criteria as-is
  if (!preferences) {
    return criteria;
  }

  const merged = { ...criteria };

  if (specificity === 'vague') {
    // VAGUE QUERY: Apply preferences as primary filters/fillers
    
    // Fill in genres if user didn't specify any
    if ((!merged.genres || merged.genres.length === 0) && preferences.favoriteGenres?.length > 0) {
      merged.genres = preferences.favoriteGenres;
    }

    // Fill in actors if user didn't specify any
    if ((!merged.actors || merged.actors.length === 0) && preferences.favoriteActors?.length > 0) {
      merged.actors = preferences.favoriteActors.slice(0, 3); // Limit to top 3
    }

    // Fill in directors if user didn't specify any
    if ((!merged.directors || merged.directors.length === 0) && preferences.favoriteDirectors?.length > 0) {
      merged.directors = preferences.favoriteDirectors.slice(0, 2); // Limit to top 2
    }

    // Apply minimum rating from preferences if not specified
    if (!merged.minRating && preferences.minRating > 0) {
      merged.minRating = preferences.minRating;
    }

    // Apply preferred decades if not specified
    if (!merged.releaseDateFrom && !merged.year && preferences.preferredDecades?.length > 0) {
      // Don't restrict by decade for vague queries - just ensure good variety
    }

  } else {
    // SPECIFIC QUERY: User made explicit request - respect it!
    // Only apply non-restrictive preferences:
    
    // 1. Apply minimum rating as a floor (only if user didn't specify lower)
    if (preferences.minRating > 0 && (!merged.minRating || merged.minRating < preferences.minRating)) {
      // Only apply if user hasn't explicitly asked for lower-rated movies
      // Check if the query was specifically about low-rated movies
      merged.minRating = Math.max(merged.minRating || 0, Math.min(preferences.minRating, 6.0));
    }

    // 2. Exclude disliked genres ONLY if user didn't specifically ask for them
    // This is the key fix: if user asks for "horror" but has "horror" in disliked, IGNORE the dislike
    if (preferences.dislikedGenres?.length > 0) {
      const userRequestedGenres = new Set((merged.genres || []).map((g: string) => g.toLowerCase()));
      
      // Only add excludeGenres for disliked genres that user DIDN'T explicitly request
      const genresToExclude = preferences.dislikedGenres.filter(
        (disliked: string) => !userRequestedGenres.has(disliked.toLowerCase())
      );
      
      if (genresToExclude.length > 0 && (!merged.genres || merged.genres.length === 0)) {
        // Only apply exclusions if user didn't request specific genres
        merged.excludeGenres = genresToExclude;
      }
    }
  }

  // ALWAYS apply adult content filter (safety)
  if (preferences.avoidAdultContent) {
    merged.includeAdult = false;
  }

  // Add preference metadata for potential ranking/boosting in results
  merged._preferenceContext = {
    specificity,
    hasPreferences: true,
    favoriteGenres: preferences.favoriteGenres || [],
    favoriteActors: preferences.favoriteActors || [],
    preferenceStyle: preferences.preferenceStyle || 'balanced'
  };

  return merged;
}

// Helper function to update user's taste profile based on feedback
async function updateTasteProfile(
  env: Env, 
  userId: string, 
  movieId: string, 
  feedbackType: string,
  movieData?: any
): Promise<void> {
  try {
    // Get current profile or create new one
    let profile = await env.MOVIE_DB.prepare(`
      SELECT * FROM user_taste_profiles WHERE user_id = ?
    `).bind(userId).first();

    const genreScores: Record<string, number> = profile 
      ? JSON.parse((profile as any).genre_scores || '{}') 
      : {};
    const actorScores: Record<string, number> = profile 
      ? JSON.parse((profile as any).actor_scores || '{}') 
      : {};
    const directorScores: Record<string, number> = profile 
      ? JSON.parse((profile as any).director_scores || '{}') 
      : {};
    const decadeScores: Record<string, number> = profile 
      ? JSON.parse((profile as any).decade_scores || '{}') 
      : {};

    let totalCount = profile ? (profile as any).total_feedback_count || 0 : 0;
    totalCount++;

    // Calculate score adjustment based on feedback type
    const adjustments: Record<string, number> = {
      'love': 0.15,
      'like': 0.1,
      'dislike': -0.1,
      'not_interested': -0.05,
      'hate': -0.15,
    };
    const adjustment = adjustments[feedbackType] || 0;

    // Update scores based on movie data if available
    if (movieData) {
      // Update genre scores
      if (movieData.genres) {
        for (const genre of movieData.genres) {
          genreScores[genre] = Math.max(0, Math.min(1, (genreScores[genre] || 0.5) + adjustment));
        }
      }

      // Update actor scores
      if (movieData.actors) {
        for (const actor of movieData.actors.slice(0, 3)) {
          actorScores[actor] = Math.max(0, Math.min(1, (actorScores[actor] || 0.5) + adjustment));
        }
      }

      // Update director score
      if (movieData.director) {
        directorScores[movieData.director] = Math.max(0, Math.min(1, 
          (directorScores[movieData.director] || 0.5) + adjustment));
      }

      // Update decade score
      if (movieData.releaseDate) {
        const year = parseInt(movieData.releaseDate.substring(0, 4));
        const decade = `${Math.floor(year / 10) * 10}s`;
        decadeScores[decade] = Math.max(0, Math.min(1, (decadeScores[decade] || 0.5) + adjustment));
      }
    }

    // Calculate profile strength (0-1 based on amount of data)
    const profileStrength = Math.min(1, totalCount / 50); // Full strength at 50 ratings

    // Calculate average rating preference based on feedback history
    const avgQuery = await env.MOVIE_DB.prepare(`
      SELECT AVG(rating) as avg FROM movie_feedback WHERE user_id = ? AND rating IS NOT NULL
    `).bind(userId).first<{ avg: number }>();
    const avgRatingPreference = avgQuery?.avg || 7.0;

    // Upsert profile
    await env.MOVIE_DB.prepare(`
      INSERT INTO user_taste_profiles (user_id, genre_scores, actor_scores, director_scores, decade_scores, 
        avg_rating_preference, total_feedback_count, profile_strength, last_computed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        genre_scores = excluded.genre_scores,
        actor_scores = excluded.actor_scores,
        director_scores = excluded.director_scores,
        decade_scores = excluded.decade_scores,
        avg_rating_preference = excluded.avg_rating_preference,
        total_feedback_count = excluded.total_feedback_count,
        profile_strength = excluded.profile_strength,
        last_computed_at = datetime('now')
    `).bind(
      userId,
      JSON.stringify(genreScores),
      JSON.stringify(actorScores),
      JSON.stringify(directorScores),
      JSON.stringify(decadeScores),
      avgRatingPreference,
      totalCount,
      profileStrength
    ).run();
  } catch (error) {
    console.error('Error updating taste profile:', error);
  }
}
