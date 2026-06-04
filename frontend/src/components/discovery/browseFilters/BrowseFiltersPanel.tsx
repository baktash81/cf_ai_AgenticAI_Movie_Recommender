import { useState } from 'react';
import {
  SlidersHorizontal, ChevronDown, ChevronUp, Star, Calendar, Clock,
  Users, Film, Ban, RotateCcw, Check, Sparkles,
} from 'lucide-react';
import type { BrowseFilterState, GenreMatchMode, YearMode } from './types';
import { QUICK_PRESETS, DECADE_OPTIONS, LANGUAGE_OPTIONS, GENRE_GROUPS } from './presets';

interface Props {
  draft: BrowseFilterState;
  onDraftChange: (next: BrowseFilterState) => void;
  onApply: () => void;
  onReset: () => void;
  activeCount: number;
  isFetching?: boolean;
}

function FilterSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-h-[44px]"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
          <Icon className="h-4 w-4 text-primary-500" />
          {title}
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && <div className="p-3 space-y-3 bg-white dark:bg-gray-800/50">{children}</div>}
    </div>
  );
}

function ChipButton({
  active,
  onClick,
  children,
  variant = 'include',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'include' | 'exclude';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all min-h-[32px] border ${
        active
          ? variant === 'exclude'
            ? 'bg-red-600 text-white border-red-600 shadow-sm scale-[1.02]'
            : 'bg-primary-600 text-white border-primary-600 shadow-sm scale-[1.02]'
          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-primary-400 hover:text-primary-700 dark:hover:text-primary-300'
      }`}
    >
      {children}
    </button>
  );
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex p-0.5 rounded-lg bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all min-h-[32px] ${
            value === opt.value
              ? 'bg-white dark:bg-gray-700 text-primary-700 dark:text-primary-300 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function BrowseFiltersPanel({
  draft,
  onDraftChange,
  onApply,
  onReset,
  activeCount,
  isFetching,
}: Props) {
  const patch = (p: Partial<BrowseFilterState>) => onDraftChange({ ...draft, ...p });

  const toggleIncludeGenre = (name: string) => {
    const next = draft.includeGenres.includes(name)
      ? draft.includeGenres.filter((g) => g !== name)
      : [...draft.includeGenres, name];
    patch({
      includeGenres: next,
      excludeGenres: draft.excludeGenres.filter((g) => g !== name),
    });
  };

  const toggleExcludeGenre = (name: string) => {
    const next = draft.excludeGenres.includes(name)
      ? draft.excludeGenres.filter((g) => g !== name)
      : [...draft.excludeGenres, name];
    patch({
      excludeGenres: next,
      includeGenres: draft.includeGenres.filter((g) => g !== name),
    });
  };

  return (
    <div className="browse-filters-panel flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary-500" />
          Filters
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary-600 text-white text-[10px] font-bold">
              {activeCount}
            </span>
          )}
        </h3>
      </div>

      {/* Quick presets */}
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5" /> Quick picks
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              title={preset.description}
              onClick={() => onDraftChange({ ...draft, ...preset.patch, q: draft.q })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-600 hover:border-primary-400 hover:shadow-md transition-all min-h-[40px]"
            >
              <span className="text-base leading-none">{preset.icon}</span>
              <span className="text-gray-800 dark:text-gray-200">{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      <FilterSection title="Genres" icon={Film} defaultOpen>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-xs text-gray-500">Match</span>
          <SegmentedControl<GenreMatchMode>
            value={draft.genreMatch}
            options={[
              { value: 'any', label: 'Any genre' },
              { value: 'all', label: 'All selected' },
            ]}
            onChange={(genreMatch) => patch({ genreMatch })}
          />
        </div>
        {GENRE_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1.5">{group.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {group.genres.map((g) => (
                <ChipButton
                  key={g}
                  active={draft.includeGenres.includes(g)}
                  onClick={() => toggleIncludeGenre(g)}
                >
                  {g}
                </ChipButton>
              ))}
            </div>
          </div>
        ))}
      </FilterSection>

      <FilterSection title="Exclude genres" icon={Ban} defaultOpen={false}>
        <p className="text-xs text-gray-500 dark:text-gray-400">Hide movies that include these genres.</p>
        <div className="flex flex-wrap gap-1.5">
          {GENRE_GROUPS.flatMap((g) => g.genres).map((g) => (
            <ChipButton
              key={g}
              variant="exclude"
              active={draft.excludeGenres.includes(g)}
              onClick={() => toggleExcludeGenre(g)}
            >
              {g}
            </ChipButton>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Release year" icon={Calendar}>
        <SegmentedControl<YearMode>
          value={draft.yearMode}
          options={[
            { value: 'any', label: 'Any' },
            { value: 'exact', label: 'Year' },
            { value: 'range', label: 'Range' },
            { value: 'decade', label: 'Decade' },
          ]}
          onChange={(yearMode) => patch({ yearMode })}
        />
        {draft.yearMode === 'exact' && (
          <input
            type="number"
            value={draft.year}
            onChange={(e) => patch({ year: e.target.value })}
            placeholder="e.g. 2019"
            className="input-field text-sm"
            min={1900}
            max={2035}
          />
        )}
        {draft.yearMode === 'range' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">From</label>
              <input type="number" value={draft.yearFrom} onChange={(e) => patch({ yearFrom: e.target.value })} className="input-field text-sm" placeholder="1990" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">To</label>
              <input type="number" value={draft.yearTo} onChange={(e) => patch({ yearTo: e.target.value })} className="input-field text-sm" placeholder="2024" />
            </div>
          </div>
        )}
        {draft.yearMode === 'decade' && (
          <div className="flex flex-wrap gap-1.5">
            {DECADE_OPTIONS.map((d) => (
              <ChipButton
                key={d}
                active={draft.decade === d}
                onClick={() => patch({ decade: draft.decade === d ? '' : d })}
              >
                {d}s
              </ChipButton>
            ))}
          </div>
        )}
      </FilterSection>

      <FilterSection title="Rating & popularity" icon={Star}>
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Minimum rating</span>
            <span className="font-semibold text-primary-600 dark:text-primary-400">
              {draft.minRating || '0'}+
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={draft.minRating || 0}
            onChange={(e) => patch({ minRating: e.target.value === '0' ? '' : e.target.value })}
            className="w-full accent-primary-600"
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {['6', '7', '7.5', '8', '8.5', '9'].map((r) => (
              <ChipButton
                key={r}
                active={draft.minRating === r}
                onClick={() => patch({ minRating: draft.minRating === r ? '' : r })}
              >
                {r}+
              </ChipButton>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Minimum vote count</label>
          <input
            type="number"
            value={draft.minVotes}
            onChange={(e) => patch({ minVotes: e.target.value })}
            placeholder="e.g. 100 (filters obscure titles)"
            className="input-field text-sm"
            min={0}
          />
        </div>
      </FilterSection>

      <FilterSection title="Runtime" icon={Clock} defaultOpen={false}>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: '' as const, label: 'Any' },
              { id: 'short' as const, label: 'Under 90m' },
              { id: 'standard' as const, label: '90–150m' },
              { id: 'long' as const, label: '150m+' },
            ]
          ).map((p) => (
            <ChipButton
              key={p.id || 'any'}
              active={draft.runtimePreset === p.id}
              onClick={() =>
                patch({
                  runtimePreset: p.id,
                  runtimeMin: '',
                  runtimeMax: '',
                })
              }
            >
              {p.label}
            </ChipButton>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <label className="text-[10px] text-gray-500 mb-1 block">Custom min (min)</label>
            <input
              type="number"
              value={draft.runtimeMin}
              onChange={(e) => patch({ runtimeMin: e.target.value, runtimePreset: '' })}
              className="input-field text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 mb-1 block">Custom max (min)</label>
            <input
              type="number"
              value={draft.runtimeMax}
              onChange={(e) => patch({ runtimeMax: e.target.value, runtimePreset: '' })}
              className="input-field text-sm"
            />
          </div>
        </div>
      </FilterSection>

      <FilterSection title="Language" icon={Film} defaultOpen={false}>
        <select
          value={draft.language}
          onChange={(e) => patch({ language: e.target.value })}
          className="input-field text-sm w-full"
        >
          {LANGUAGE_OPTIONS.map((l) => (
            <option key={l.code || 'any'} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </FilterSection>

      <FilterSection title="Cast & crew" icon={Users} defaultOpen={false}>
        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2 py-1.5">
          Actor and director cannot be combined — actor is searched first.
        </p>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Actor</label>
          <input
            type="text"
            value={draft.actor}
            onChange={(e) => patch({ actor: e.target.value })}
            placeholder="e.g. Tom Hanks"
            className="input-field text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Director</label>
          <input
            type="text"
            value={draft.director}
            onChange={(e) => patch({ director: e.target.value })}
            placeholder="e.g. Christopher Nolan"
            className="input-field text-sm"
          />
        </div>
      </FilterSection>

      <div className="sticky bottom-0 pt-2 pb-1 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent dark:from-gray-900 dark:via-gray-900 flex flex-col gap-2">
        <button
          type="button"
          onClick={onApply}
          disabled={isFetching}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base font-semibold shadow-lg"
        >
          <Check className="h-5 w-5" />
          Apply filters
        </button>
        <button
          type="button"
          onClick={onReset}
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset all
        </button>
      </div>
    </div>
  );
}
