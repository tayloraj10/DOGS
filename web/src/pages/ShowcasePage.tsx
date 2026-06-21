import { useEffect, useMemo, useState } from "react";
import { listDirectoryEntries } from "../api/directory";
import { useCategories } from "../hooks/useCategories";
import CategoryFilterBar from "../components/CategoryFilterBar";
import EntryCard from "../components/EntryCard";
import type { CategorySlug, DirectoryEntry } from "../api/types";

export default function ShowcasePage() {
  const { categories } = useCategories();
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CategorySlug | null>(null);

  useEffect(() => {
    listDirectoryEntries("published", 500)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  const visibleEntries = useMemo(() => {
    if (!selectedCategory) return entries;
    return entries.filter((entry) => entry.categories.includes(selectedCategory));
  }, [entries, selectedCategory]);

  return (
    <div>
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-slate-900">
          The Directory of Good
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">
          A growing collection of people and groups taking action for good of the world
        </p>
      </div>

      <div className="mt-8 flex justify-center">
        <CategoryFilterBar
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </div>

      {!loading && (
        <p className="mt-6 text-center text-sm text-slate-500">
          {visibleEntries.length} {visibleEntries.length === 1 ? "entry" : "entries"}
          {selectedCategory ? " in this category" : ""}
        </p>
      )}

      {loading && <p className="mt-10 text-center text-sm text-slate-400">Loading...</p>}

      {!loading && visibleEntries.length === 0 && (
        <p className="mt-10 text-center text-sm text-slate-400">
          No entries yet in this category.
        </p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visibleEntries.map((entry) => (
          <EntryCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
