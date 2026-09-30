import { POST_CATEGORIES, POST_CATEGORY_LABELS, POST_GAMES, POST_GAME_LABELS, type PostCategory, type PostGame } from '@community/shared';
import { cn } from '../../lib/cn';
import { FEED_FILTERS, type FeedFilter } from './feedApi';

export interface FeedFiltersBarProps {
  filter: FeedFilter;
  category: PostCategory | null;
  game: PostGame | null;
  onFilterChange: (filter: FeedFilter) => void;
  onCategoryChange: (category: PostCategory | null) => void;
  onGameChange: (game: PostGame | null) => void;
}

const pillBase =
  'shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap';

function chipClass(active: boolean) {
  return cn(
    pillBase,
    active
      ? 'border-transparent bg-ink-900 text-white dark:bg-white dark:text-ink-900'
      : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300 dark:border-ink-700 dark:bg-ink-900/40 dark:text-ink-300',
  );
}

export function FeedFiltersBar({
  filter,
  category,
  game,
  onFilterChange,
  onCategoryChange,
  onGameChange,
}: FeedFiltersBarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label="Feed filtresi" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {FEED_FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={filter === item.value}
            onClick={() => onFilterChange(item.value)}
            className={chipClass(filter === item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <button
          type="button"
          onClick={() => onCategoryChange(null)}
          aria-pressed={category === null}
          className={chipClass(category === null)}
        >
          Tüm kategoriler
        </button>
        {POST_CATEGORIES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onCategoryChange(category === value ? null : value)}
            aria-pressed={category === value}
            className={chipClass(category === value)}
          >
            {POST_CATEGORY_LABELS[value]}
          </button>
        ))}
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <button type="button" onClick={() => onGameChange(null)} aria-pressed={game === null} className={chipClass(game === null)}>
          Tüm oyunlar
        </button>
        {POST_GAMES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onGameChange(game === value ? null : value)}
            aria-pressed={game === value}
            className={chipClass(game === value)}
          >
            {POST_GAME_LABELS[value]}
          </button>
        ))}
      </div>
    </div>
  );
}
