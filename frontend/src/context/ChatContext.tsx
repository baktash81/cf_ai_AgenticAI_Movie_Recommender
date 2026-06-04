import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { chatApi, moviesApi, conversationsApi } from '../services/api';
import type { ChatMessage } from '../types';

interface ChatContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  currentConversationId: string | null;
  suggestedFollowUps: string[];
  sendMessage: (content: string) => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
  startNewConversation: () => void;
  clearMessages: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [suggestedFollowUps, setSuggestedFollowUps] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const activePolls = useRef<Set<string>>(new Set());

  const sendMessage = useCallback(async (content: string) => {
    // Add user message optimistically
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await chatApi.send(content, currentConversationId || undefined);
      
      // Update conversation ID if new conversation was created
      if (response.conversationId && !currentConversationId) {
        setCurrentConversationId(response.conversationId);
        // Invalidate conversations list to show new conversation
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }
      
      // Add assistant message immediately (without waiting for movies)
      const assistantMessageId = response.messageId || `msg-${Date.now()}-response`;
      
      // Check if movies are already included (from filtering)
      const hasDirectMovies = (response as any).movies && (response as any).movies.length > 0;
      
      const followUps = response.suggestedFollowUps?.length
        ? response.suggestedFollowUps
        : [];
      setSuggestedFollowUps(followUps);

      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        searchId: response.searchId,
        movies: hasDirectMovies ? response.movies : undefined,
        isLoadingMovies: response.type === 'recommendation' && !!response.searchId && !hasDirectMovies,
        suggestedFollowUps: followUps.length > 0 ? followUps : undefined,
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // If movies are already included (from filtering), save them and we're done
      if (hasDirectMovies && response.messageId) {
        try {
          await conversationsApi.saveMoviesToMessage(response.messageId, (response as any).movies);
        } catch (e) {
          console.error('Failed to save filtered movies to message:', e);
        }
        return; // Exit early - no polling needed
      }
      
      // If it's a recommendation with searchId, poll for results in the background
      if (response.type === 'recommendation' && response.searchId) {
        // Prevent duplicate polling for the same searchId
        if (activePolls.current.has(response.searchId)) {
          return;
        }
        
        activePolls.current.add(response.searchId);
        
        // Poll for results asynchronously with exponential backoff
        (async () => {
          let attempts = 0;
          const maxAttempts = 20; // Reduced from 30
          let pollInterval = 1500; // Start with 1.5 seconds
          
          // Cleanup function
          const cleanup = () => {
            activePolls.current.delete(response.searchId!);
          };
          
          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            
            // Double-check we're still supposed to be polling (component might have unmounted)
            if (!activePolls.current.has(response.searchId!)) {
              return; // Another instance is handling this, exit
            }
            
            try {
              const status = await moviesApi.getStatus(response.searchId!);
              
              if (status.status === 'completed') {
                const results = await moviesApi.getResults(response.searchId!);
                const movies = results.movies;
                
                // Save movies to the message in backend
                if (response.messageId && movies && movies.length > 0) {
                  try {
                    await conversationsApi.saveMoviesToMessage(response.messageId, movies);
                  } catch (e) {
                    console.error('Failed to save movies to message:', e);
                  }
                }
                
                // Update the message with movies and remove loading state
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId
                    ? { 
                        ...msg, 
                        movies, 
                        isLoadingMovies: false,
                        content: msg.content + (movies && movies.length > 0 
                          ? '\n\nLet me know if you\'d like more recommendations or have any other questions!'
                          : '')
                      }
                    : msg
                ));
                cleanup();
                return; // Exit successfully
              }
              
              if (status.status === 'failed') {
                // Update message to remove loading state
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId
                    ? { ...msg, isLoadingMovies: false }
                    : msg
                ));
                cleanup();
                return; // Exit on failure
              }
              
              // Exponential backoff: increase interval after first few attempts
              if (attempts > 3) {
                pollInterval = Math.min(pollInterval * 1.2, 5000); // Max 5 seconds
              }
            } catch (error) {
              console.error('Error polling for movies:', error);
              // On error, wait a bit longer before retrying
              pollInterval = Math.min(pollInterval * 1.5, 5000);
            }
            
            attempts++;
          }
          
          // If timeout, remove loading state and clean up
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId
              ? { ...msg, isLoadingMovies: false }
              : msg
          ));
          cleanup();
        })();
      }
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
  }, [currentConversationId, queryClient]);

  const loadConversation = useCallback(async (conversationId: string) => {
    setIsLoading(true);
    try {
      const data = await conversationsApi.get(conversationId);
      setCurrentConversationId(conversationId);
      
      // Convert backend messages to ChatMessage format
      const loadedMessages: ChatMessage[] = data.messages.map(msg => ({
        id: msg.message_id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.created_at),
        searchId: msg.search_id,
        movies: msg.movies,
      }));
      
      setMessages(loadedMessages);
      setSuggestedFollowUps([]);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startNewConversation = useCallback(() => {
    setCurrentConversationId(null);
    setMessages([]);
    setSuggestedFollowUps([]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentConversationId(null);
    setSuggestedFollowUps([]);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        isLoading,
        currentConversationId,
        suggestedFollowUps,
        sendMessage,
        loadConversation,
        startNewConversation,
        clearMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}
