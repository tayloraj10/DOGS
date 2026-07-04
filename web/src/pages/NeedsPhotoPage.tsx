import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { uploadDirectoryPhoto, uploadDirectoryPhotoFromUrl } from "../api/photos";
import { ApiError } from "../api/client";
import ReviewNav from "../components/ReviewNav";
import LoadingState from "../components/LoadingState";
import TypeFilterBar from "../components/TypeFilterBar";
import { useTypeFilter } from "../hooks/useTypeFilter";
import { directoryConfig, projectsConfig } from "../config/entityConfig";
import { configForKind, tagKind, toRouteId } from "../lib/entryKind";
import type { MergedEntry } from "../lib/entryKind";

export default function NeedsPhotoPage() {
  const { selected: selectedKinds, toggle: toggleKind } = useTypeFilter();
  const [entries, setEntries] = useState<MergedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({});
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    Promise.all([
      directoryConfig.api.listNeedingPhoto(),
      projectsConfig.api.listNeedingPhoto(),
    ])
      .then(([directoryEntries, projects]) =>
        setEntries([...tagKind(directoryEntries, "directory"), ...tagKind(projects, "project")]),
      )
      .finally(() => setLoading(false));
  }, []);

  const visibleEntries = entries.filter((entry) => selectedKinds.has(entry.kind));

  function entryKey(entry: MergedEntry): string {
    return `${entry.kind}-${entry.id}`;
  }

  function setError(key: string, message: string | null) {
    setErrors((prev) => {
      const next = { ...prev };
      if (message) next[key] = message;
      else delete next[key];
      return next;
    });
  }

  function removeEntry(entry: MergedEntry) {
    setEntries((prev) => prev.filter((e) => !(e.kind === entry.kind && e.id === entry.id)));
  }

  async function handleRehost(entry: MergedEntry) {
    if (!entry.image_url) return;
    const key = entryKey(entry);
    setBusyKey(key);
    setError(key, null);
    try {
      const result = await uploadDirectoryPhotoFromUrl(entry.image_url);
      await configForKind(entry.kind).api.update(entry.id, { image_url: result.url });
      removeEntry(entry);
    } catch (err) {
      setError(
        key,
        err instanceof ApiError ? err.message : "Couldn't fetch that image. Try uploading one instead.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function handleUseUrl(entry: MergedEntry) {
    const key = entryKey(entry);
    const url = urlInputs[key]?.trim();
    if (!url) return;
    setBusyKey(key);
    setError(key, null);
    try {
      const result = await uploadDirectoryPhotoFromUrl(url);
      await configForKind(entry.kind).api.update(entry.id, { image_url: result.url });
      removeEntry(entry);
    } catch (err) {
      setError(
        key,
        err instanceof ApiError ? err.message : "Couldn't fetch that image. Check the URL and try again.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function handleManualUpload(entry: MergedEntry, file: File) {
    const key = entryKey(entry);
    setBusyKey(key);
    setError(key, null);
    try {
      const result = await uploadDirectoryPhoto(file);
      await configForKind(entry.kind).api.update(entry.id, { image_url: result.url });
      removeEntry(entry);
    } catch (err) {
      setError(key, err instanceof ApiError ? err.message : "Failed to upload photo.");
    } finally {
      setBusyKey(null);
      const input = fileInputs.current[key];
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

      <div className="mt-4">
        <TypeFilterBar selected={selectedKinds} onToggle={toggleKind} />
      </div>

      {loading && <LoadingState />}

      {!loading && visibleEntries.length === 0 && (
        <p className="mt-6 text-sm text-slate-400 dark:text-slate-500">Every entry's photo is hosted by us. Nothing to do here.</p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {visibleEntries.map((entry) => {
          const key = entryKey(entry);
          return (
            <div
              key={key}
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
                  <Link to={`/review/${toRouteId(entry.kind, entry.id)}`} className="font-medium text-slate-900 hover:underline dark:text-slate-100">
                    {entry.name}
                  </Link>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {entry.status}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">
                  {entry.image_url ?? "No image link"}
                </p>
                {errors[key] && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors[key]}</p>}
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="Paste an image URL"
                    value={urlInputs[key] ?? ""}
                    onChange={(e) =>
                      setUrlInputs((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    disabled={busyKey === key}
                    className="w-full max-w-xs rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleUseUrl(entry)}
                    disabled={busyKey === key || !urlInputs[key]?.trim()}
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
                    disabled={busyKey === key}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300 dark:disabled:bg-emerald-800"
                  >
                    {busyKey === key ? "Working..." : "Re-host"}
                  </button>
                )}
                <label className="cursor-pointer rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-slate-300 transition-colors hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700">
                  Upload
                  <input
                    ref={(el) => {
                      fileInputs.current[key] = el;
                    }}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    disabled={busyKey === key}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleManualUpload(entry, file);
                    }}
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
