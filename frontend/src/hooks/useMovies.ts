import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moviesApi, watchlistApi, preferencesApi, conversationsApi } from '../services/api';
import type { Movie } from '../types';
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

// Note: useChat hook has been moved to ChatContext.tsx as useChatContext
// This hook is kept for backward compatibility but should not be used
// Use useChatContext from '../../context/ChatContext' instead

export function useConversations() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['conversations'],
    queryFn: conversationsApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: conversationsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => 
      conversationsApi.update(id, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  return {
    conversations: data?.conversations || [],
    isLoading,
    error,
    deleteConversation: deleteMutation.mutate,
    updateConversation: updateMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
