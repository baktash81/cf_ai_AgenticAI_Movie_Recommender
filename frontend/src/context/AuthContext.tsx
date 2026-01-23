import { createContext, useCallback, useEffect, useState, ReactNode } from 'react';
import type { User, AuthResponse } from '../types';
import { authApi, getStoredTokens, setStoredTokens, clearStoredTokens } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      const tokens = getStoredTokens();
      if (tokens?.accessToken) {
        try {
          const userData = await authApi.getMe();
          setUser(userData);
        } catch (error) {
          console.error('Failed to restore session:', error);
          clearStoredTokens();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const handleAuthResponse = useCallback((response: AuthResponse) => {
    setStoredTokens(response.tokens);
    setUser(response.user);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    handleAuthResponse(response);
  }, [handleAuthResponse]);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const response = await authApi.register(email, password, name);
    handleAuthResponse(response);
  }, [handleAuthResponse]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearStoredTokens();
      setUser(null);
    }
  }, []);

  const updateUser = useCallback(async (data: Partial<User>) => {
    const updatedUser = await authApi.updateProfile(data);
    setUser(updatedUser);
  }, []);

  const refreshUser = useCallback(async () => {
    const userData = await authApi.getMe();
    setUser(userData);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
