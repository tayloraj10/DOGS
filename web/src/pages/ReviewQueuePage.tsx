import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listDirectoryEntries } from "../api/directory";
import ReviewNav from "../components/ReviewNav";
import LoadingState from "../components/LoadingState";
import type { DirectoryEntry } from "../api/types";

export default function ReviewQueuePage() {
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listDirectoryEntries("pending")
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Review queue</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Pending submissions waiting for verification before going live.
      </p>

      <ReviewNav />

      {loading && <LoadingState />}

      {!loading && entries.length === 0 && (
        <p className="mt-6 text-sm text-slate-400 dark:text-slate-500">Nothing waiting for review.</p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {entries.map((entry) => (
          <Link
            key={entry.id}
            to={`/review/${entry.id}`}
            className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md dark:bg-slate-900 dark:ring-slate-800 dark:hover:shadow-none"
          >
            <p className="font-medium text-slate-900 dark:text-slate-100">{entry.name}</p>
            {entry.description && (
              <p className="mt-1 line-clamp-1 text-sm text-slate-500 dark:text-slate-400">
                {entry.description}
              </p>
            )}
            {entry.suggested_category && (
              <p className="mt-2 inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-800">
                Suggested category: {entry.suggested_category}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
