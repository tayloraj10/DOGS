import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { listEntriesNeedingPhoto, updateDirectoryEntry } from "../api/directory";
import { uploadDirectoryPhoto, uploadDirectoryPhotoFromUrl } from "../api/photos";
import { ApiError } from "../api/client";
import ReviewNav from "../components/ReviewNav";
import type { DirectoryEntry } from "../api/types";

export default function NeedsPhotoPage() {
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({});
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    listEntriesNeedingPhoto()
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  function setError(id: string, message: string | null) {
    setErrors((prev) => {
      const next = { ...prev };
      if (message) next[id] = message;
      else delete next[id];
      return next;
    });
  }

  async function handleRehost(entry: DirectoryEntry) {
    if (!entry.image_url) return;
    setBusyId(entry.id);
    setError(entry.id, null);
    try {
      const result = await uploadDirectoryPhotoFromUrl(entry.image_url);
      await updateDirectoryEntry(entry.id, { image_url: result.url });
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    } catch (err) {
      setError(
        entry.id,
        err instanceof ApiError ? err.message : "Couldn't fetch that image. Try uploading one instead.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleUseUrl(entry: DirectoryEntry) {
    const url = urlInputs[entry.id]?.trim();
    if (!url) return;
    setBusyId(entry.id);
    setError(entry.id, null);
    try {
      const result = await uploadDirectoryPhotoFromUrl(url);
      await updateDirectoryEntry(entry.id, { image_url: result.url });
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    } catch (err) {
      setError(
        entry.id,
        err instanceof ApiError ? err.message : "Couldn't fetch that image. Check the URL and try again.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleManualUpload(entry: DirectoryEntry, file: File) {
    setBusyId(entry.id);
    setError(entry.id, null);
    try {
      const result = await uploadDirectoryPhoto(file);
      await updateDirectoryEntry(entry.id, { image_url: result.url });
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    } catch (err) {
      setError(entry.id, err instanceof ApiError ? err.message : "Failed to upload photo.");
    } finally {
      setBusyId(null);
      const input = fileInputs.current[entry.id];
      if (input) input.value = "";
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Needs photo</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Entries with no photo at all, or whose photo is still an external link (e.g. pasted in
        from a sheet sync) instead of one we host ourselves. Re-host the existing image, or
        upload one if there isn't one yet or the link is broken or low quality.
      </p>

      <ReviewNav />

      {loading && <p className="mt-6 text-sm text-slate-400 dark:text-slate-500">Loading...</p>}

      {!loading && entries.length === 0 && (
        <p className="mt-6 text-sm text-slate-400 dark:text-slate-500">Every entry's photo is hosted by us. Nothing to do here.</p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
          >
            {entry.image_url ? (
              <img
                src={entry.image_url}
                alt=""
                className="h-16 w-16 flex-shrink-0 rounded-lg bg-slate-100 object-cover ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
                onError={(e) => {
                  e.currentTarget.style.visibility = "hidden";
                }}
              />
            ) : (
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700">
                No photo
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link to={`/review/${entry.id}`} className="font-medium text-slate-900 hover:underline dark:text-slate-100">
                  {entry.name}
                </Link>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {entry.status}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">
                {entry.image_url ?? "No image link"}
              </p>
              {errors[entry.id] && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors[entry.id]}</p>}
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="url"
                  placeholder="Paste an image URL"
                  value={urlInputs[entry.id] ?? ""}
                  onChange={(e) =>
                    setUrlInputs((prev) => ({ ...prev, [entry.id]: e.target.value }))
                  }
                  disabled={busyId === entry.id}
                  className="w-full max-w-xs rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
                />
                <button
                  type="button"
                  onClick={() => handleUseUrl(entry)}
                  disabled={busyId === entry.id || !urlInputs[entry.id]?.trim()}
                  className="flex-shrink-0 rounded-lg bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-300 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700 dark:disabled:text-slate-600"
                >
                  Use URL
                </button>
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              {entry.image_url && (
                <button
                  type="button"
                  onClick={() => handleRehost(entry)}
                  disabled={busyId === entry.id}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300 dark:disabled:bg-emerald-800"
                >
                  {busyId === entry.id ? "Working..." : "Re-host"}
                </button>
              )}
              <label className="cursor-pointer rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-slate-300 transition-colors hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700">
                Upload
                <input
                  ref={(el) => {
                    fileInputs.current[entry.id] = el;
                  }}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  disabled={busyId === entry.id}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleManualUpload(entry, file);
                  }}
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
