import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { 
  AuthResponse, 
  User, 
  MovieSearchResult, 
  SearchStatus,
  PreferenceAnalysisResult,
  ChatResponse,
  WatchlistItem,
  Conversation,
  ConversationWithMessages,
  FeedbackType,
  MovieFeedback,
  TasteProfileSummary,
  WatchHistoryItem,
  WatchlistAddRequest,
  MovieReview,
  ReviewCreateRequest,
  SharedList,
  CuratedCollection,
  PersonDetails,
  PersonSearchResult,
  WatchProviders,
  DiscoveryResponse,
  Movie,
} from '../types';

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token storage
const TOKEN_KEY = 'auth_tokens';

export const getStoredTokens = () => {
  const stored = localStorage.getItem(TOKEN_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
};

export const setStoredTokens = (tokens: { accessToken: string; refreshToken: string }) => {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
};

export const clearStoredTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const tokens = getStoredTokens();
    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const tokens = getStoredTokens();
      if (tokens?.refreshToken) {
        try {
          const response = await axios.post('/api/auth/refresh', {
            refreshToken: tokens.refreshToken,
          });
          
          const { tokens: newTokens } = response.data;
          setStoredTokens(newTokens);
          
          originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          clearStoredTokens();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: async (email: string, password: string, name?: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', { email, password, name });
    return response.data;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
    clearStoredTokens();
  },

  refresh: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await api.put('/auth/profile', data);
    return response.data;
  },
};

// Preferences API
export const preferencesApi = {
  analyze: async (input: string): Promise<PreferenceAnalysisResult> => {
    const response = await api.post('/preferences', { input });
    return response.data;
  },

  get: async (): Promise<PreferenceAnalysisResult['preferences'] | null> => {
    try {
      const response = await api.get('/preferences');
      return response.data;
    } catch (error) {
      if ((error as AxiosError).response?.status === 404) {
        return null;
      }
      throw error;
    }
  },
};

// Movies API
export const moviesApi = {
  recommend: async (query: string): Promise<{ searchId: string }> => {
    const response = await api.post('/recommend', { naturalLanguage: query });
    return response.data;
  },

  recommendStructured: async (criteria: Record<string, unknown>): Promise<{ searchId: string }> => {
    const response = await api.post('/recommend', { criteria, isStructured: true });
    return response.data;
  },

  getResults: async (searchId: string): Promise<MovieSearchResult> => {
    const response = await api.get(`/recommendations/${searchId}`);
    return response.data;
  },

  getStatus: async (searchId: string): Promise<SearchStatus> => {
    const response = await api.get(`/status/${searchId}`);
    return response.data;
  },
};

// Chat API
export const chatApi = {
  send: async (message: string, conversationId?: string): Promise<ChatResponse> => {
    const response = await api.post('/chat', { message, conversationId });
    return response.data;
  },
};

// Conversations API
export const conversationsApi = {
  list: async (): Promise<{ conversations: Conversation[] }> => {
    const response = await api.get('/conversations');
    return response.data;
  },

  create: async (title?: string): Promise<{ conversationId: string; title: string; createdAt: string }> => {
    const response = await api.post('/conversations', { title });
    return response.data;
  },

  get: async (conversationId: string): Promise<ConversationWithMessages> => {
    const response = await api.get(`/conversations/${conversationId}`);
    return response.data;
  },

  delete: async (conversationId: string): Promise<void> => {
    await api.delete(`/conversations/${conversationId}`);
  },

  update: async (conversationId: string, title: string): Promise<void> => {
    await api.put(`/conversations/${conversationId}`, { title });
  },

  saveMoviesToMessage: async (messageId: string, movies: any[]): Promise<void> => {
    await api.post(`/chat/messages/${messageId}/movies`, { movies });
  },
};

// ============================================
// PERSONALIZATION API
// ============================================

export const feedbackApi = {
  submit: async (
    movieId: string, 
    feedbackType: FeedbackType, 
    rating?: number,
    movieData?: Movie
  ): Promise<{ success: boolean; feedbackId: string; tasteProfileUpdated: boolean }> => {
    const response = await api.post('/feedback', { movieId, feedbackType, rating, movieData });
    return response.data;
  },

  get: async (movieId: string): Promise<{ feedback: MovieFeedback | null }> => {
    const response = await api.get(`/feedback/${movieId}`);
    return response.data;
  },
};

export const tasteProfileApi = {
  get: async (): Promise<{ profile: any; summary: TasteProfileSummary }> => {
    const response = await api.get('/taste-profile');
    return response.data;
  },
};

export const watchHistoryApi = {
  list: async (limit?: number, offset?: number): Promise<{ items: WatchHistoryItem[]; totalCount: number }> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    const response = await api.get(`/watch-history?${params}`);
    return response.data;
  },

  add: async (movieId: string, movieData?: Movie): Promise<{ success: boolean; historyId: string }> => {
    const response = await api.post('/watch-history', { movieId, movieData });
    return response.data;
  },
};

// ============================================
// SOCIAL & ENGAGEMENT API
// ============================================

export const watchlistApi = {
  list: async (sortBy?: string, sortOrder?: string): Promise<{ items: WatchlistItem[]; totalCount: number; hasReminders: number }> => {
    const params = new URLSearchParams();
    if (sortBy) params.append('sortBy', sortBy);
    if (sortOrder) params.append('sortOrder', sortOrder);
    const response = await api.get(`/watchlist?${params}`);
    return response.data;
  },

  add: async (data: WatchlistAddRequest): Promise<{ success: boolean; watchlistId: string }> => {
    const response = await api.post('/watchlist', data);
    return response.data;
  },

  update: async (movieId: string, data: Partial<WatchlistAddRequest>): Promise<{ success: boolean }> => {
    const response = await api.put(`/watchlist/${movieId}`, data);
    return response.data;
  },

  remove: async (movieId: string): Promise<{ success: boolean }> => {
    const response = await api.delete(`/watchlist/${movieId}`);
    return response.data;
  },
};

export const reviewsApi = {
  getForMovie: async (movieId: string): Promise<{ reviews: MovieReview[]; totalCount: number; averageRating?: number }> => {
    const response = await api.get(`/reviews/movie/${movieId}`);
    return response.data;
  },

  getUserReviews: async (): Promise<{ reviews: MovieReview[] }> => {
    const response = await api.get('/reviews/user');
    return response.data;
  },

  create: async (data: ReviewCreateRequest): Promise<{ success: boolean; reviewId: string }> => {
    const response = await api.post('/reviews', data);
    return response.data;
  },

  vote: async (reviewId: string, isHelpful: boolean): Promise<{ success: boolean; helpfulCount: number }> => {
    const response = await api.post(`/reviews/${reviewId}/vote`, { isHelpful });
    return response.data;
  },
};

export const sharedListsApi = {
  create: async (data: { title: string; description?: string; movies: Movie[]; isPublic?: boolean; expiresAt?: string }): Promise<{ success: boolean; listId: string; shareCode: string; shareUrl: string }> => {
    const response = await api.post('/shared-lists', data);
    return response.data;
  },

  get: async (shareCode: string): Promise<{ list: SharedList }> => {
    const response = await api.get(`/shared-lists/${shareCode}`);
    return response.data;
  },

  getUserLists: async (): Promise<{ lists: SharedList[] }> => {
    const response = await api.get('/my-shared-lists');
    return response.data;
  },
};

// ============================================
// CONTENT & DISCOVERY API
// ============================================

export const collectionsApi = {
  list: async (type?: string): Promise<{ collections: CuratedCollection[]; seasonal: CuratedCollection[]; saved: CuratedCollection[] }> => {
    const params = type ? `?type=${type}` : '';
    const response = await api.get(`/collections${params}`);
    return response.data;
  },

  get: async (collectionId: string): Promise<{ collection: CuratedCollection }> => {
    const response = await api.get(`/collections/${collectionId}`);
    return response.data;
  },

  toggleSave: async (collectionId: string, save: boolean): Promise<{ success: boolean; saved: boolean }> => {
    const response = await api.post(`/collections/${collectionId}/save`, { save });
    return response.data;
  },
};

export const similarMoviesApi = {
  get: async (movieId: string): Promise<{ sourceMovieId: string; similarMovies: Movie[]; cached: boolean }> => {
    const response = await api.get(`/similar/${movieId}`);
    return response.data;
  },
};

export const trendingApi = {
  get: async (timeWindow: 'day' | 'week' = 'week', limit?: number): Promise<{ movies: Movie[]; timeWindow: string }> => {
    const params = new URLSearchParams();
    params.append('timeWindow', timeWindow);
    if (limit) params.append('limit', limit.toString());
    const response = await api.get(`/trending?${params}`);
    return response.data;
  },
};

export const personApi = {
  get: async (personId: number): Promise<{ person: PersonDetails; movies: Movie[] }> => {
    const response = await api.get(`/person/${personId}`);
    return response.data;
  },

  search: async (query: string): Promise<{ results: PersonSearchResult[] }> => {
    const response = await api.get(`/search/person?q=${encodeURIComponent(query)}`);
    return response.data;
  },
};

export const watchProvidersApi = {
  get: async (movieId: string, region?: string): Promise<{ movieId: string; region: string; providers: WatchProviders | null }> => {
    const params = region ? `?region=${region}` : '';
    const response = await api.get(`/watch-providers/${movieId}${params}`);
    return response.data;
  },
};

export const discoveryApi = {
  get: async (): Promise<DiscoveryResponse> => {
    const response = await api.get('/discovery');
    return response.data;
  },
};

// Watchlist API
export const watchlistApi = {
  get: async (): Promise<{ watchlist: WatchlistItem[] }> => {
    const response = await api.get('/watchlist');
    return response.data;
  },

  add: async (movieId: string, priority?: number): Promise<void> => {
    await api.post('/watchlist', { movieId, priority });
  },

  remove: async (movieId: string): Promise<void> => {
    await api.delete(`/watchlist/${movieId}`);
  },
};

export default api;
