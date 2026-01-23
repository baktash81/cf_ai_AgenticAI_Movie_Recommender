import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moviesApi, watchlistApi, preferencesApi, chatApi } from '../services/api';
import type { Movie, ChatMessage, ChatResponse } from '../types';
import { useState, useCallback } from 'react';

export function useMovieSearch() {
  const [isSearching, setIsSearching] = useState(false);

  const searchMovies = useCallback(async (query: string): Promise<Movie[]> => {
    setIsSearching(true);
    try {
      // Start search
      const { searchId } = await moviesApi.recommend(query);
      
      // Poll for results
      let attempts = 0;
      const maxAttempts = 30;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const status = await moviesApi.getStatus(searchId);
        
        if (status.status === 'completed') {
          const results = await moviesApi.getResults(searchId);
          return results.movies;
        }
        
        if (status.status === 'failed') {
          throw new Error('Search failed');
        }
        
        attempts++;
      }
      
      throw new Error('Search timeout');
    } finally {
      setIsSearching(false);
    }
  }, []);

  return { searchMovies, isSearching };
}

export function useWatchlist() {
  const queryClient = useQueryClient();

  const { data: watchlist, isLoading } = useQuery({
    queryKey: ['watchlist'],
    queryFn: watchlistApi.get,
  });

  const addMutation = useMutation({
    mutationFn: ({ movieId, priority }: { movieId: string; priority?: number }) =>
      watchlistApi.add(movieId, priority),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: watchlistApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });

  return {
    watchlist: watchlist?.watchlist || [],
    isLoading,
    addToWatchlist: addMutation.mutate,
    removeFromWatchlist: removeMutation.mutate,
    isAddingToWatchlist: addMutation.isPending,
  };
}

export function usePreferences() {
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['preferences'],
    queryFn: preferencesApi.get,
  });

  const analyzeMutation = useMutation({
    mutationFn: preferencesApi.analyze,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
    },
  });

  return {
    preferences,
    isLoading,
    analyzePreferences: analyzeMutation.mutateAsync,
    isAnalyzing: analyzeMutation.isPending,
  };
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await chatApi.send(content);
      
      let movies: Movie[] | undefined;
      
      // If it's a recommendation, fetch the results
      if (response.type === 'recommendation' && response.searchId) {
        // Poll for results
        let attempts = 0;
        const maxAttempts = 30;
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const status = await moviesApi.getStatus(response.searchId);
          
          if (status.status === 'completed') {
            const results = await moviesApi.getResults(response.searchId);
            movies = results.movies;
            break;
          }
          
          if (status.status === 'failed') {
            break;
          }
          
          attempts++;
        }
      }

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-response`,
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        searchId: response.searchId,
        movies,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      // Add error message
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  };
}
