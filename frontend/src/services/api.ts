import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { 
  AuthResponse, 
  User, 
  Movie, 
  MovieSearchResult, 
  SearchStatus,
  PreferenceAnalysisResult,
  ChatResponse,
  WatchlistItem 
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
  send: async (message: string): Promise<ChatResponse> => {
    const response = await api.post('/chat', { message });
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
