import { useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import type { CuratedCollection } from '../../types';
import { collectionsApi } from '../../services/api';
import {
  getCollectionTheme,
  getCoverPosters,
  typeLabel,
} from '../../utils/collectionVisuals';

interface Props {
  collection: CuratedCollection;
  onSelect?: (collection: CuratedCollection) => void;
  compact?: boolean;
  showSaveButton?: boolean;
}

export default function CollectionCard({
  collection,
  onSelect,
  compact = false,
  showSaveButton = true,
}: Props) {
  const [isSaved, setIsSaved] = useState(collection.isSaved || false);
  const [isSaving, setIsSaving] = useState(false);
  const theme = getCollectionTheme(collection);
  const posters = getCoverPosters(collection);
  const count = collection.movieCount ?? collection.movies?.length ?? 0;

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

  const open = () => onSelect?.(collection);

  if (compact) {
    return (
      <button
        type="button"
        onClick={open}
        className="w-full flex items-center gap-3 p-3 min-h-[56px] bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left group border border-gray-100 dark:border-gray-700"
      >
        <div className="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 rounded-lg overflow-hidden relative">
          {posters.length > 0 ? (
            <div className="absolute inset-0 grid grid-cols-2 gap-px">
              {posters.slice(0, 4).map((url, i) => (
                <img key={i} src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
              ))}
            </div>
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-white truncate">{collection.title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {typeLabel(collection)} · {count} titles
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 flex-shrink-0" />
      </button>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
      className="relative rounded-2xl overflow-hidden border border-gray-800 bg-gray-900/80 hover:border-gray-600 transition-all hover:shadow-xl hover:shadow-black/40 cursor-pointer group"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        {posters.length >= 4 ? (
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5">
            {posters.slice(0, 4).map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            ))}
          </div>
        ) : posters.length > 0 ? (
          <>
            <img
              src={posters[0]}
              alt=""
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            <div className={`absolute inset-0 bg-gradient-to-t ${theme.gradient} opacity-60`} />
          </>
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient}`}>
            <span className="absolute inset-0 flex items-center justify-center text-4xl opacity-40">
              {theme.icon}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-black/50 backdrop-blur-sm text-white border ${theme.accent.replace('bg-', 'border-')}`}
          >
            {typeLabel(collection)}
          </span>
          {collection.isCurrentSeason && (
            <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-amber-500/90 text-black flex items-center gap-0.5">
              <Sparkles className="w-3 h-3" />
              In season
            </span>
          )}
        </div>

        {showSaveButton && (
          <button
            type="button"
            onClick={handleToggleSave}
            disabled={isSaving}
            className="absolute top-2 right-2 p-2 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors disabled:opacity-50"
            aria-label={isSaved ? 'Remove from saved' : 'Save collection'}
          >
            {isSaved ? (
              <BookmarkCheck className="w-4 h-4 text-amber-400" />
            ) : (
              <Bookmark className="w-4 h-4 text-gray-300" />
            )}
          </button>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
          <h3 className="text-sm sm:text-base font-bold text-white line-clamp-2 group-hover:text-amber-200 transition-colors">
            {collection.title}
          </h3>
          {collection.description && (
            <p className="text-[11px] sm:text-xs text-gray-300 line-clamp-2 mt-0.5">
              {collection.description}
            </p>
          )}
          <p className="text-[10px] sm:text-xs text-gray-400 mt-1">
            {count} {count === 1 ? 'title' : 'titles'}
          </p>
        </div>
      </div>
    </div>
  );
}
