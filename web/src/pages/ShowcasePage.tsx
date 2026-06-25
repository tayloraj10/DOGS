import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listDirectoryEntries } from "../api/directory";
import { useCategories } from "../hooks/useCategories";
import CategoryFilterBar from "../components/CategoryFilterBar";
import EntryCard from "../components/EntryCard";
import LoadingState from "../components/LoadingState";
import type { CategorySlug, DirectoryEntry } from "../api/types";

type SortOption = "newest" | "name" | "random";

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest first",
  name: "Name (A-Z)",
  random: "Random",
};

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function sortEntries(entries: DirectoryEntry[], sort: SortOption): DirectoryEntry[] {
  if (sort === "random") {
    return entries;
  }
  const sorted = [...entries];
  if (sort === "newest") {
    sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  }
  return sorted;
}

export default function ShowcasePage() {
  const navigate = useNavigate();
  const { categories } = useCategories();
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CategorySlug | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("random");

  useEffect(() => {
    listDirectoryEntries("published", 500)
      .then((data) => setEntries(shuffle(data)))
      .finally(() => setLoading(false));
  }, []);

  const visibleEntries = useMemo(() => {
    let result = entries;
    if (selectedCategory) {
      result = result.filter((entry) => entry.categories.includes(selectedCategory));
    }
    const query = search.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (entry) =>
          entry.name.toLowerCase().includes(query) ||
          entry.description?.toLowerCase().includes(query),
      );
    }
    return sortEntries(result, sort);
  }, [entries, selectedCategory, search, sort]);

  function handleRandom() {
    if (visibleEntries.length === 0) return;
    const entry = visibleEntries[Math.floor(Math.random() * visibleEntries.length)];
    navigate(`/entry/${entry.id}`);
  }

  return (
    <div>
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
          The Directory of Good
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-600 dark:text-slate-400">
          A growing collection of people and groups taking action for the good of the world
        </p>
      </div>

      <div className="mt-8 flex justify-center">
        <CategoryFilterBar
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <input
          type="text"
          placeholder="Search by name or description"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleRandom}
          disabled={visibleEntries.length === 0}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300 dark:disabled:bg-emerald-800"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
            <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
            <circle cx="8.25" cy="8.25" r="1.25" fill="currentColor" stroke="none" />
            <circle cx="15.75" cy="8.25" r="1.25" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
            <circle cx="8.25" cy="15.75" r="1.25" fill="currentColor" stroke="none" />
            <circle cx="15.75" cy="15.75" r="1.25" fill="currentColor" stroke="none" />
          </svg>
          Random entry
        </button>
      </div>

      {!loading && (
        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          {visibleEntries.length} {visibleEntries.length === 1 ? "entry" : "entries"}
          {selectedCategory ? " in this category" : ""}
        </p>
      )}

      {loading && <LoadingState />}

      {!loading && visibleEntries.length === 0 && (
        <p className="mt-10 text-center text-sm text-slate-400 dark:text-slate-500">
          No entries match your search.
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
