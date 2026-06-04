import { Star } from 'lucide-react';
import type { Movie } from '../../types';

interface Props {
  movie: Movie;
  onClick: () => void;
}

export default function MovieBrowseCard({ movie, onClick }: Props) {
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;
  const placeholder = `https://via.placeholder.com/200x300?text=${encodeURIComponent(movie.title.slice(0, 12))}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left w-full rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow hover:shadow-md hover:ring-2 hover:ring-primary-500/50 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500"
    >
      <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
        <img
          src={movie.posterUrl || placeholder}
          alt={movie.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute top-1 right-1 flex items-center gap-0.5 bg-black/75 text-white text-[10px] px-1 py-0.5 rounded">
          <Star className="h-2.5 w-2.5 text-yellow-400 fill-yellow-400" />
          {movie.rating.toFixed(1)}
        </div>
      </div>
      <div className="p-1.5 sm:p-2">
        <h3 className="text-xs font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight">
          {movie.title}
        </h3>
        {year && (
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{year}</p>
        )}
      </div>
    </button>
  );
}
