import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listDirectoryEntries } from "../api/directory";
import { useCategories } from "../hooks/useCategories";
import CategoryFilterBar from "../components/CategoryFilterBar";
import CategoryGuideModal from "../components/CategoryGuideModal";
import EntryCard from "../components/EntryCard";
import LoadingState from "../components/LoadingState";
import type { CategorySlug, DirectoryEntry } from "../api/types";

type SortOption = "newest" | "name" | "random";
type LocationField = "city" | "state" | "country";
type LocationFilters = Record<LocationField, string>;

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
  const [showCategoryGuide, setShowCategoryGuide] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("random");
  const [locationFilters, setLocationFilters] = useState<LocationFilters>({ city: "", state: "", country: "" });
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const locationMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listDirectoryEntries("published", 500)
      .then((data) => setEntries(shuffle(data)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!showLocationMenu) return;
    function handleClickOutside(e: MouseEvent) {
      if (locationMenuRef.current && !locationMenuRef.current.contains(e.target as Node)) {
        setShowLocationMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showLocationMenu]);

  const locationOptions = useMemo(() => {
    const cities = new Set<string>();
    const states = new Set<string>();
    const countries = new Set<string>();
    for (const entry of entries) {
      if (entry.location?.city) cities.add(entry.location.city);
      if (entry.location?.state) states.add(entry.location.state);
      if (entry.location?.country) countries.add(entry.location.country);
    }
    return {
      cities: Array.from(cities).sort(),
      states: Array.from(states).sort(),
      countries: Array.from(countries).sort(),
    };
  }, [entries]);

  const hasLocationOptions =
    locationOptions.cities.length > 0 ||
    locationOptions.states.length > 0 ||
    locationOptions.countries.length > 0;

  const activeLocationFilterCount = Object.values(locationFilters).filter(Boolean).length;

  const visibleEntries = useMemo(() => {
    let result = entries;
    if (selectedCategory) {
      result = result.filter((entry) => entry.categories.includes(selectedCategory));
    }
    if (locationFilters.state) result = result.filter((e) => e.location?.state === locationFilters.state);
    if (locationFilters.city) result = result.filter((e) => e.location?.city === locationFilters.city);
    if (locationFilters.country) result = result.filter((e) => e.location?.country === locationFilters.country);
    const query = search.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (entry) =>
          entry.name.toLowerCase().includes(query) ||
          entry.description?.toLowerCase().includes(query),
      );
    }
    return sortEntries(result, sort);
  }, [entries, selectedCategory, locationFilters, search, sort]);

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
          onGuideClick={() => setShowCategoryGuide(true)}
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
        {hasLocationOptions && (
          <div className="relative" ref={locationMenuRef}>
            <button
              type="button"
              onClick={() => setShowLocationMenu((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              Location
              {activeLocationFilterCount > 0 ? (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
                  {activeLocationFilterCount}
                </span>
              ) : (
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-slate-400">
                  <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            {showLocationMenu && (
              <div className="absolute left-0 z-10 mt-1 w-64 rounded-lg border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                <div className="space-y-3">
                  {(
                    [
                      { label: "State", field: "state" as LocationField, values: locationOptions.states },
                      { label: "City", field: "city" as LocationField, values: locationOptions.cities },
                      { label: "Country", field: "country" as LocationField, values: locationOptions.countries },
                    ] as const
                  )
                    .filter(({ values }) => values.length > 0)
                    .map(({ label, field, values }) => (
                      <div key={field}>
                        <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                          {label}
                        </label>
                        <select
                          value={locationFilters[field]}
                          onChange={(e) => setLocationFilters((prev) => ({ ...prev, [field]: e.target.value }))}
                          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                        >
                          <option value="">Any {label.toLowerCase()}</option>
                          {values.map((v) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  {activeLocationFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setLocationFilters({ city: "", state: "", country: "" })}
                      className="mt-1 text-xs text-slate-400 underline hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
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
          {locationFilters.state ? ` in ${locationFilters.state}` : ""}
          {locationFilters.city ? ` in ${locationFilters.city}` : ""}
          {locationFilters.country ? ` in ${locationFilters.country}` : ""}
        </p>
      )}

      {loading && <LoadingState />}

      {!loading && visibleEntries.length === 0 && (
        <p className="mt-10 text-center text-sm text-slate-400 dark:text-slate-500">
          No entries match your search.
        </p>
      )}

      {showCategoryGuide && <CategoryGuideModal onClose={() => setShowCategoryGuide(false)} />}

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visibleEntries.map((entry) => (
          <EntryCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
