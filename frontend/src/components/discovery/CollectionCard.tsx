import { useState } from 'react';
import { Bookmark, BookmarkCheck, ChevronRight, Film, Sparkles, Calendar } from 'lucide-react';
import type { CuratedCollection } from '../../types';
import { collectionsApi } from '../../services/api';

interface Props {
  collection: CuratedCollection;
  onSelect?: (collection: CuratedCollection) => void;
  compact?: boolean;
}

export default function CollectionCard({ collection, onSelect, compact = false }: Props) {
  const [isSaved, setIsSaved] = useState(collection.isSaved || false);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaving) return;

    setIsSaving(true);
    try {
      await collectionsApi.toggleSave(collection.collection_id, !isSaved);
      setIsSaved(!isSaved);
    } catch (error) {
      console.error('Failed to toggle save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const typeIcons: Record<string, React.ElementType> = {
    seasonal: Calendar,
    genre: Film,
    decade: Calendar,
    curated: Sparkles,
  };

  const TypeIcon = typeIcons[collection.collection_type] || Film;

  if (compact) {
    return (
      <button
        onClick={() => onSelect?.(collection)}
        className="w-full flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left group"
      >
        {/* Mini poster grid */}
        <div className="w-16 h-16 flex-shrink-0 grid grid-cols-2 gap-0.5 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
          {collection.movies.slice(0, 4).map((movie, i) => (
            <div key={i} className="aspect-square">
              {movie.posterUrl ? (
                <img src={movie.posterUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-300 dark:bg-gray-600" />
              )}
            </div>
          ))}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-white truncate">
            {collection.title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {collection.movies.length} movies
          </p>
        </div>

        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
      </button>
    );
  }

  return (
    <div
      onClick={() => onSelect?.(collection)}
      className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all cursor-pointer group"
    >
      {/* Cover image from first movie's backdrop or poster grid */}
      <div className="aspect-[16/9] bg-gray-200 dark:bg-gray-700 relative">
        {collection.cover_image_url ? (
          <img 
            src={collection.cover_image_url} 
            alt={collection.title}
            className="w-full h-full object-cover"
          />
        ) : collection.movies[0]?.backdropUrl ? (
          <img 
            src={collection.movies[0].backdropUrl} 
            alt={collection.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full grid grid-cols-4 gap-0.5">
            {collection.movies.slice(0, 4).map((movie, i) => (
              <div key={i} className="aspect-square">
                {movie.posterUrl ? (
                  <img src={movie.posterUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                    <Film className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Type badge */}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            collection.isCurrentSeason 
              ? 'bg-primary-500 text-white' 
              : 'bg-white/90 text-gray-700'
          }`}>
            <TypeIcon className="h-3 w-3" />
            {collection.collection_type === 'seasonal' ? collection.season : collection.collection_type}
          </span>
        </div>

        {/* Save button */}
        <button
          onClick={handleToggleSave}
          disabled={isSaving}
          className={`absolute top-3 right-3 p-2 rounded-full transition-colors ${
            isSaved
              ? 'bg-primary-600 text-white'
              : 'bg-white/90 text-gray-700 hover:bg-white'
          }`}
        >
          {isSaved ? (
            <BookmarkCheck className="h-4 w-4" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
        </button>

        {/* Title and description */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-lg font-bold text-white mb-1">
            {collection.title}
          </h3>
          {collection.description && (
            <p className="text-sm text-gray-200 line-clamp-2">
              {collection.description}
            </p>
          )}
          <p className="text-xs text-gray-300 mt-2">
            {collection.movies.length} movies
          </p>
        </div>
      </div>

      {/* Movie preview strip */}
      <div className="p-3 flex gap-2 overflow-x-auto scrollbar-hide">
        {collection.movies.slice(0, 6).map((movie) => (
          <div
            key={movie.id}
            className="flex-shrink-0 w-12 h-18 rounded overflow-hidden bg-gray-200 dark:bg-gray-700"
          >
            {movie.posterUrl ? (
              <img 
                src={movie.posterUrl} 
                alt={movie.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Film className="h-4 w-4 text-gray-400" />
              </div>
            )}
          </div>
        ))}
        {collection.movies.length > 6 && (
          <div className="flex-shrink-0 w-12 h-18 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              +{collection.movies.length - 6}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
