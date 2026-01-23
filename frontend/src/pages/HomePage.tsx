import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { MessageSquare, Sparkles, Film, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Welcome{user?.name ? `, ${user.name}` : ''}!
        </h1>
        <p className="text-primary-100 text-lg mb-6">
          Get personalized movie recommendations powered by AI
        </p>
        <Link
          to="/chat"
          className="inline-flex items-center gap-2 bg-white text-primary-600 px-6 py-3 rounded-lg font-medium hover:bg-primary-50 transition-colors"
        >
          <MessageSquare className="h-5 w-5" />
          Start chatting
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="card">
          <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/20 rounded-xl flex items-center justify-center mb-4">
            <MessageSquare className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Natural Conversations
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Ask for movies in plain English. No complex filters needed.
          </p>
        </div>

        <div className="card">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center mb-4">
            <Sparkles className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Personalized Results
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            AI learns your taste to give better recommendations over time.
          </p>
        </div>

        <div className="card">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center mb-4">
            <Film className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Rich Movie Data
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Get details like cast, ratings, posters, and more for every movie.
          </p>
        </div>
      </div>

      {/* Example queries */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Try asking...
        </h2>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            "Show me action movies from 2023",
            "Movies with Tom Hanks from the 90s",
            "Highly rated sci-fi movies",
            "Comedy films similar to The Office",
            "Award-winning drama movies",
            "Christopher Nolan's best films",
          ].map((query, index) => (
            <Link
              key={index}
              to="/chat"
              state={{ initialQuery: query }}
              className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <MessageSquare className="h-4 w-4 text-gray-400" />
              <span className="text-sm">{query}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
