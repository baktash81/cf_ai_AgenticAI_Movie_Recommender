import { useState } from 'react';
import { Share2, Copy, Check, X, Link2, Globe, Lock, Loader2 } from 'lucide-react';
import type { Movie } from '../../types';
import { sharedListsApi } from '../../services/api';

interface CreateShareModalProps {
  movies: Movie[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (shareUrl: string) => void;
}

export function CreateShareModal({ movies, isOpen, onClose, onSuccess }: CreateShareModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shareResult, setShareResult] = useState<{ shareCode: string; shareUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || movies.length === 0) return;

    setIsSubmitting(true);
    try {
      const result = await sharedListsApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        movies,
        isPublic,
      });
      setShareResult({ shareCode: result.shareCode, shareUrl: result.shareUrl });
      onSuccess?.(result.shareUrl);
    } catch (error) {
      console.error('Failed to create shared list:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (shareResult) {
      const fullUrl = `${window.location.origin}${shareResult.shareUrl}`;
      navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setIsPublic(true);
    setShareResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      
      <div className="relative min-h-[100dvh] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-md w-full max-h-[95vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary-500" />
              Share Movie List
            </h2>
            <button
              onClick={handleClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {shareResult ? (
            // Success state
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">List Created!</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Share this link with your friends
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 flex items-center gap-2">
                <Link2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="flex-1 text-sm text-gray-600 dark:text-gray-300 truncate">
                  {window.location.origin}{shareResult.shareUrl}
                </span>
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>

              <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Share code: <span className="font-mono font-medium">{shareResult.shareCode}</span>
              </div>

              <button
                onClick={handleClose}
                className="w-full mt-6 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            // Form state
            <form onSubmit={handleSubmit} className="p-6">
              {/* Movie preview */}
              <div className="mb-6">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Sharing {movies.length} movie{movies.length !== 1 ? 's' : ''}
                </p>
                <div className="flex gap-1 overflow-x-auto pb-2">
                  {movies.slice(0, 8).map((movie) => (
                    <div
                      key={movie.id}
                      className="flex-shrink-0 w-12 h-18 rounded overflow-hidden bg-gray-200 dark:bg-gray-700"
                    >
                      {movie.posterUrl ? (
                        <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          N/A
                        </div>
                      )}
                    </div>
                  ))}
                  {movies.length > 8 && (
                    <div className="flex-shrink-0 w-12 h-18 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-500">+{movies.length - 8}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Title */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  List Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="My Movie Recommendations"
                  required
                  maxLength={100}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A collection of must-watch movies..."
                  rows={2}
                  maxLength={500}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Visibility */}
              <div className="mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    {isPublic ? (
                      <>
                        <Globe className="h-4 w-4 text-green-500" />
                        Anyone with the link can view
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 text-gray-500" />
                        Only you can view
                      </>
                    )}
                  </span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim() || movies.length === 0}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4" />
                      Create Link
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// Quick share button for movie cards
interface ShareButtonProps {
  movies: Movie[];
  className?: string;
}

export function ShareButton({ movies, className = '' }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-1 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors ${className}`}
        title="Share"
      >
        <Share2 className="h-4 w-4" />
      </button>
      <CreateShareModal
        movies={movies}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
