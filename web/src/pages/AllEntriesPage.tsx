import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ReviewNav from "../components/ReviewNav";
import LoadingState from "../components/LoadingState";
import TypeFilterBar from "../components/TypeFilterBar";
import { useTypeFilter } from "../hooks/useTypeFilter";
import type { DirectoryEntry } from "../api/types";
import { slugToLabel } from "../api/types";
import { directoryConfig, projectsConfig } from "../config/entityConfig";
import { configForKind, tagKind, toRouteId } from "../lib/entryKind";
import type { MergedEntry } from "../lib/entryKind";

const statusClasses: Record<DirectoryEntry["status"], string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-800",
  published: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-800",
};

export default function AllEntriesPage() {
  const { selected: selectedKinds, toggle: toggleKind } = useTypeFilter();
  const [entries, setEntries] = useState<MergedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copyState, setCopyState] = useState<Record<string, "copying" | "copied" | "error">>({});

  useEffect(() => {
    Promise.all([
      directoryConfig.api.list(undefined, 500),
      projectsConfig.api.list(undefined, 500),
    ])
      .then(([directoryEntries, projects]) =>
        setEntries([...tagKind(directoryEntries, "directory"), ...tagKind(projects, "project")]),
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = entries.filter((entry) => selectedKinds.has(entry.kind));
    const q = search.trim().toLowerCase();
    if (q) result = result.filter((entry) => entry.name.toLowerCase().includes(q));
    return result;
  }, [entries, selectedKinds, search]);

  async function handleCopyEditLink(entry: MergedEntry) {
    const key = `${entry.kind}-${entry.id}`;
    setCopyState((prev) => ({ ...prev, [key]: "copying" }));
    try {
      const { token } = await configForKind(entry.kind).api.getEditLink(entry.id);
      const url = `${window.location.origin}/entry/${toRouteId(entry.kind, entry.id)}/edit?token=${token}`;
      await navigator.clipboard.writeText(url);
      setCopyState((prev) => ({ ...prev, [key]: "copied" }));
    } catch {
      setCopyState((prev) => ({ ...prev, [key]: "error" }));
    }
  }

  function copyLabel(key: string) {
    switch (copyState[key]) {
      case "copying":
        return "Copying...";
      case "copied":
        return "Copied!";
      case "error":
        return "Couldn't copy";
      default:
        return "Copy edit link";
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">All entries</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Every entry in the directory, regardless of status. Click one to edit it, or copy its
        edit link to share with whoever submitted it.
      </p>

      <ReviewNav />

      <div className="mt-4">
        <TypeFilterBar selected={selectedKinds} onToggle={toggleKind} />
      </div>

      <input
        type="text"
        placeholder="Search by name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-4 w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
      />

      {loading && <LoadingState />}

      {!loading && filtered.length === 0 && (
        <p className="mt-6 text-sm text-slate-400 dark:text-slate-500">No entries match that search.</p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {filtered.map((entry) => {
          const key = `${entry.kind}-${entry.id}`;
          const routeId = toRouteId(entry.kind, entry.id);
          return (
            <div
              key={key}
              className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link to={`/review/${routeId}`} className="font-medium text-slate-900 hover:underline dark:text-slate-100">
                    {entry.name}
                  </Link>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${statusClasses[entry.status]}`}
                  >
                    {entry.status}
                  </span>
                </div>
                {entry.categories.length > 0 && (
                  <p className="mt-1 truncate text-xs text-slate-400 dark:text-slate-500">
                    {entry.categories.map(slugToLabel).join(", ")}
                  </p>
                )}
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyEditLink(entry)}
                  disabled={copyState[key] === "copying"}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:text-slate-400 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:disabled:text-slate-600"
                >
                  {copyLabel(key)}
                </button>
                <Link
                  to={`/review/${routeId}`}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                >
                  Edit
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
