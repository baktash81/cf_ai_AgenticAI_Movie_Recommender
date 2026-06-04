import { User, Bot, Loader2 } from 'lucide-react';
import type { ChatMessage } from '../../types';
import MovieCard from './MovieCard';

interface Props {
  message: ChatMessage;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-2 sm:gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser
            ? 'bg-primary-100 dark:bg-primary-900/20'
            : 'bg-gray-100 dark:bg-gray-700'
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary-600 dark:text-primary-400" />
        ) : (
          <Bot className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        )}
      </div>

      {/* Message content */}
      <div className={`flex-1 min-w-0 max-w-[92%] sm:max-w-[85%] md:max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div
          className={`inline-block rounded-2xl px-3 py-2 sm:px-4 text-sm sm:text-base max-w-full ${
            isUser
              ? 'bg-primary-600 text-white rounded-br-md'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Loading indicator for movies */}
        {message.isLoadingMovies && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Searching for movies...</span>
          </div>
        )}

        {/* Movie results */}
        {message.movies && message.movies.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Found {message.movies.length} movies:
            </p>
            <div className="grid-movie-cards">
              {message.movies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <p className="text-xs text-gray-400 mt-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
