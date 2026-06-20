import type { Category, CategorySlug } from "../api/types";

interface CategoryFilterBarProps {
  categories: Category[];
  selected: CategorySlug | null;
  onSelect: (slug: CategorySlug | null) => void;
}

export default function CategoryFilterBar({
  categories,
  selected,
  onSelect,
}: CategoryFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          selected === null
            ? "bg-emerald-600 text-white"
            : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
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
              : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
          }`}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
