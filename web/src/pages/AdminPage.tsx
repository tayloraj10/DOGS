import { useState } from "react";
import { Link } from "react-router-dom";
import { backfillEditTokens, deleteOrphanedImages, listOrphanedImages } from "../api/admin";
import { ApiError } from "../api/client";
import ReviewNav from "../components/ReviewNav";
import type { OrphanedImage } from "../api/types";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminPage() {
  const [backfilling, setBackfilling] = useState(false);
  const [backfillCount, setBackfillCount] = useState<number | null>(null);
  const [backfillError, setBackfillError] = useState<string | null>(null);

  const [loadingOrphans, setLoadingOrphans] = useState(false);
  const [orphans, setOrphans] = useState<OrphanedImage[] | null>(null);
  const [orphansError, setOrphansError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deletedCount, setDeletedCount] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleBackfillEditTokens() {
    setBackfilling(true);
    setBackfillError(null);
    setBackfillCount(null);
    try {
      const { backfilled } = await backfillEditTokens();
      setBackfillCount(backfilled);
    } catch (err) {
      setBackfillError(err instanceof ApiError ? err.message : "Backfill failed. Please try again.");
    } finally {
      setBackfilling(false);
    }
  }

  async function handleListOrphans() {
    setLoadingOrphans(true);
    setOrphansError(null);
    setOrphans(null);
    setDeletedCount(null);
    try {
      const { orphans: result } = await listOrphanedImages();
      setOrphans(result);
    } catch (err) {
      setOrphansError(err instanceof ApiError ? err.message : "Failed to load orphaned images.");
    } finally {
      setLoadingOrphans(false);
    }
  }

  async function handleDeleteOrphans() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const { deleted } = await deleteOrphanedImages();
      setDeletedCount(deleted);
      setOrphans(null);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Delete failed. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Admin</h1>

      <ReviewNav />

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Backfill edit tokens</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Generates edit-link tokens for any existing entries that don't have one yet, so you
          can share an edit link from the review page for entries created before this feature.
        </p>

        <button
          type="button"
          onClick={handleBackfillEditTokens}
          disabled={backfilling}
          className="mt-4 rounded-lg bg-slate-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 dark:disabled:bg-slate-700"
        >
          {backfilling ? "Backfilling..." : "Backfill edit tokens"}
        </button>

        {backfillError && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{backfillError}</p>}
        {backfillCount !== null && (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            Backfilled <span className="font-medium text-slate-900 dark:text-slate-100">{backfillCount}</span>{" "}
            {backfillCount === 1 ? "entry" : "entries"}.
          </p>
        )}
      </div>

      <div className="mt-10 border-t border-slate-200 pt-6 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Orphaned images</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          GCS-hosted photos that no directory entry references — left behind by re-hosts or replacements.
        </p>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={handleListOrphans}
            disabled={loadingOrphans}
            className="rounded-lg bg-slate-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 dark:disabled:bg-slate-700"
          >
            {loadingOrphans ? "Loading..." : "List orphaned images"}
          </button>

          {orphans && orphans.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteOrphans}
              disabled={deleting}
              className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300 dark:disabled:bg-red-900"
            >
              {deleting ? "Deleting..." : `Delete all ${orphans.length}`}
            </button>
          )}
        </div>

        {orphansError && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{orphansError}</p>}
        {deleteError && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{deleteError}</p>}

        {deletedCount !== null && (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            Deleted <span className="font-medium text-slate-900 dark:text-slate-100">{deletedCount}</span>{" "}
            {deletedCount === 1 ? "image" : "images"}.
          </p>
        )}

        {orphans !== null && orphans.length === 0 && (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">No orphaned images found.</p>
        )}

        {orphans && orphans.length > 0 && (
          <ul className="mt-4 divide-y divide-slate-100 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:divide-slate-800 dark:bg-slate-900 dark:ring-slate-800">
            {orphans.map((img) => (
              <li key={img.name} className="flex items-center justify-between gap-4 px-4 py-3">
                <a
                  href={img.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-sm text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  {img.name}
                </a>
                <span className="shrink-0 text-xs text-slate-400">{formatBytes(img.size_bytes)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-10 border-t border-slate-200 pt-6 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Sheet sync</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          One-time import from the original Google Sheet.{" "}
          <Link to="/admin/sync" className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
            Go to sync page
          </Link>
        </p>
      </div>
    </div>
  );
}
