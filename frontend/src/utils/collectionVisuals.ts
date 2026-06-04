import type { CuratedCollection, CollectionType } from '../types';

export interface CollectionTheme {
  gradient: string;
  accent: string;
  icon: string;
}

const THEMES: Record<string, CollectionTheme> = {
  seasonal: {
    gradient: 'from-violet-600 via-purple-700 to-indigo-900',
    accent: 'bg-violet-500/90',
    icon: '🎃',
  },
  halloween: {
    gradient: 'from-orange-700 via-orange-900 to-black',
    accent: 'bg-orange-600/90',
    icon: '👻',
  },
  christmas: {
    gradient: 'from-red-700 via-green-900 to-red-950',
    accent: 'bg-red-600/90',
    icon: '🎄',
  },
  summer: {
    gradient: 'from-sky-500 via-blue-600 to-indigo-800',
    accent: 'bg-sky-500/90',
    icon: '☀️',
  },
  valentine: {
    gradient: 'from-pink-600 via-rose-700 to-red-900',
    accent: 'bg-pink-500/90',
    icon: '💕',
  },
  genre: {
    gradient: 'from-primary-600 via-primary-700 to-primary-900',
    accent: 'bg-primary-500/90',
    icon: '🎬',
  },
  decade: {
    gradient: 'from-amber-600 via-orange-700 to-amber-950',
    accent: 'bg-amber-500/90',
    icon: '📼',
  },
  curated: {
    gradient: 'from-emerald-600 via-teal-700 to-slate-900',
    accent: 'bg-emerald-500/90',
    icon: '✨',
  },
  default: {
    gradient: 'from-gray-600 via-gray-700 to-gray-900',
    accent: 'bg-gray-500/90',
    icon: '🎞️',
  },
};

export function getCollectionTheme(collection: CuratedCollection): CollectionTheme {
  if (collection.collection_type === 'seasonal' && collection.season) {
    return THEMES[collection.season] || THEMES.seasonal;
  }
  return THEMES[collection.collection_type] || THEMES.default;
}

export function getCoverPosters(collection: CuratedCollection): string[] {
  const extended = collection as CuratedCollection & {
    previewPosters?: string[];
    coverUrl?: string;
  };
  if (extended.previewPosters?.length) {
    return extended.previewPosters;
  }
  return collection.movies
    .map((m) => m.posterUrl)
    .filter((url): url is string => !!url)
    .slice(0, 4);
}

export function getCollectionCoverUrl(collection: CuratedCollection): string | undefined {
  const extended = collection as CuratedCollection & { coverUrl?: string };
  return (
    extended.coverUrl ||
    collection.cover_image_url ||
    collection.movies.find((m) => m.backdropUrl)?.backdropUrl ||
    collection.movies.find((m) => m.posterUrl)?.posterUrl
  );
}

export function typeLabel(collection: CuratedCollection): string {
  if (collection.collection_type === 'seasonal' && collection.season) {
    const labels: Record<string, string> = {
      halloween: 'Halloween',
      christmas: 'Holidays',
      summer: 'Summer',
      valentine: "Valentine's",
    };
    return labels[collection.season] || collection.season;
  }
  const labels: Record<CollectionType, string> = {
    curated: 'Curated',
    seasonal: 'Seasonal',
    trending: 'Trending',
    genre: 'Genre',
    decade: 'Decade',
    director: 'Director',
    actor: 'Actor',
    franchise: 'Franchise',
  };
  return labels[collection.collection_type] || collection.collection_type;
}
