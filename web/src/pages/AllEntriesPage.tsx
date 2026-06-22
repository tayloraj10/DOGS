import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getDirectoryEntryEditLink, listDirectoryEntries } from "../api/directory";
import ReviewNav from "../components/ReviewNav";
import type { DirectoryEntry } from "../api/types";
import { CATEGORY_DISPLAY_NAMES } from "../api/types";

const statusClasses: Record<DirectoryEntry["status"], string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  published: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

export default function AllEntriesPage() {
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copyState, setCopyState] = useState<Record<string, "copying" | "copied" | "error">>({});

  useEffect(() => {
    listDirectoryEntries(undefined, 500)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((entry) => entry.name.toLowerCase().includes(q));
  }, [entries, search]);

  async function handleCopyEditLink(id: string) {
    setCopyState((prev) => ({ ...prev, [id]: "copying" }));
    try {
      const { token } = await getDirectoryEntryEditLink(id);
      const url = `${window.location.origin}/entry/${id}/edit?token=${token}`;
      await navigator.clipboard.writeText(url);
      setCopyState((prev) => ({ ...prev, [id]: "copied" }));
    } catch {
      setCopyState((prev) => ({ ...prev, [id]: "error" }));
    }
  }

  function copyLabel(id: string) {
    switch (copyState[id]) {
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
      <h1 className="text-2xl font-semibold text-slate-900">All entries</h1>
      <p className="mt-2 text-sm text-slate-600">
        Every entry in the directory, regardless of status. Click one to edit it, or copy its
        edit link to share with whoever submitted it.
      </p>

      <ReviewNav />

      <input
        type="text"
        placeholder="Search by name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-6 w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
      />

      {loading && <p className="mt-6 text-sm text-slate-400">Loading...</p>}

      {!loading && filtered.length === 0 && (
        <p className="mt-6 text-sm text-slate-400">No entries match that search.</p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {filtered.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link to={`/review/${entry.id}`} className="font-medium text-slate-900 hover:underline">
                  {entry.name}
                </Link>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${statusClasses[entry.status]}`}
                >
                  {entry.status}
                </span>
              </div>
              {entry.categories.length > 0 && (
                <p className="mt-1 truncate text-xs text-slate-400">
                  {entry.categories.map((slug) => CATEGORY_DISPLAY_NAMES[slug]).join(", ")}
                </p>
              )}
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopyEditLink(entry.id)}
                disabled={copyState[entry.id] === "copying"}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                {copyLabel(entry.id)}
              </button>
              <Link
                to={`/review/${entry.id}`}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                Edit
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
