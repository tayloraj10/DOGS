import { useState } from "react";
import { Link } from "react-router-dom";
import { backfillEditTokens, syncFromSheet } from "../api/admin";
import { ApiError } from "../api/client";
import ReviewNav from "../components/ReviewNav";
import type { SheetSyncResponse } from "../api/types";

export default function AdminSyncPage() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SheetSyncResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [backfilling, setBackfilling] = useState(false);
  const [backfillCount, setBackfillCount] = useState<number | null>(null);
  const [backfillError, setBackfillError] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    setResult(null);
    try {
      setResult(await syncFromSheet());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sync failed. Please try again.");
    } finally {
      setSyncing(false);
    }
  }

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

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Sync from Google Sheet</h1>
      <p className="mt-2 text-sm text-slate-600">
        Pulls rows from the Directory of Good sheet and creates/updates matching entries.
        New and updated entries keep whatever image link is in the sheet — check{" "}
        <Link to="/review/photos" className="font-medium text-emerald-700 hover:underline">
          Needs photo
        </Link>{" "}
        afterward to re-host or replace them.
      </p>

      <ReviewNav />

      <button
        type="button"
        onClick={handleSync}
        disabled={syncing}
        className="mt-6 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
      >
        {syncing ? "Syncing..." : "Sync now"}
      </button>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-slate-500">Rows seen</dt>
              <dd className="text-lg font-semibold text-slate-900">{result.rows_seen}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Created</dt>
              <dd className="text-lg font-semibold text-emerald-700">{result.created}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Updated</dt>
              <dd className="text-lg font-semibold text-slate-900">{result.updated}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Skipped</dt>
              <dd className="text-lg font-semibold text-slate-900">{result.skipped}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Geocoded</dt>
              <dd className="text-lg font-semibold text-slate-900">{result.geocoded}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Geocode failed</dt>
              <dd className="text-lg font-semibold text-slate-900">{result.geo_failed}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Images skipped</dt>
              <dd className="text-lg font-semibold text-slate-900">{result.images_skipped}</dd>
            </div>
          </dl>

          {result.errors.length > 0 && (
            <div className="mt-4 rounded-lg bg-red-50 p-4 ring-1 ring-red-200">
              <p className="text-sm font-medium text-red-800">Row errors</p>
              <ul className="mt-1 list-inside list-disc text-sm text-red-700">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-10 border-t border-slate-200 pt-6">
        <h2 className="text-lg font-semibold text-slate-900">Backfill edit tokens</h2>
        <p className="mt-2 text-sm text-slate-600">
          Generates edit-link tokens for any existing entries that don't have one yet, so you
          can share an edit link from the review page for entries created before this feature.
        </p>

        <button
          type="button"
          onClick={handleBackfillEditTokens}
          disabled={backfilling}
          className="mt-4 rounded-lg bg-slate-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {backfilling ? "Backfilling..." : "Backfill edit tokens"}
        </button>

        {backfillError && <p className="mt-4 text-sm text-red-600">{backfillError}</p>}
        {backfillCount !== null && (
          <p className="mt-4 text-sm text-slate-600">
            Backfilled <span className="font-medium text-slate-900">{backfillCount}</span>{" "}
            {backfillCount === 1 ? "entry" : "entries"}.
          </p>
        )}
      </div>
    </div>
  );
}
