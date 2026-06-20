import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listDirectoryEntries } from "../api/directory";
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
      <h1 className="text-2xl font-semibold text-slate-900">Review queue</h1>
      <p className="mt-2 text-sm text-slate-600">
        Pending submissions waiting for verification before going live.
      </p>

      {loading && <p className="mt-6 text-sm text-slate-400">Loading...</p>}

      {!loading && entries.length === 0 && (
        <p className="mt-6 text-sm text-slate-400">Nothing waiting for review.</p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {entries.map((entry) => (
          <Link
            key={entry.id}
            to={`/review/${entry.id}`}
            className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md"
          >
            <p className="font-medium text-slate-900">{entry.name}</p>
            {entry.description && (
              <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                {entry.description}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
