import type { Category, CategorySlug } from "../api/types";

interface CategoryFilterBarProps {
  categories: Category[];
  selected: CategorySlug | null;
  onSelect: (slug: CategorySlug | null) => void;
  onGuideClick?: () => void;
}

export default function CategoryFilterBar({
  categories,
  selected,
  onSelect,
  onGuideClick,
}: CategoryFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          selected === null
            ? "bg-emerald-600 text-white"
            : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800"
        }`}
      >
        All
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onSelect(category.slug)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            selected === category.slug
              ? "bg-emerald-600 text-white"
              : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800"
          }`}
        >
          {category.name}
        </button>
      ))}
      {onGuideClick && (
        <button
          type="button"
          onClick={onGuideClick}
          title="What do these categories mean?"
          className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 ring-1 ring-slate-200 hover:bg-slate-100 hover:text-slate-600 transition-colors dark:ring-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
        </button>
      )}
    </div>
  );
}
