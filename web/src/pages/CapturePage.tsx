import { useState } from "react";
import DirectoryEntryForm from "../components/DirectoryEntryForm";
import { approveSuggestedCategory, createDirectoryEntry } from "../api/directory";
import type { DirectoryEntry, DirectoryEntryInput } from "../api/types";

export default function CapturePage() {
  const [savedEntry, setSavedEntry] = useState<DirectoryEntry | null>(null);
  const [approving, setApproving] = useState(false);

  async function handleSubmit(values: DirectoryEntryInput) {
    const entry = await createDirectoryEntry({ ...values, status: "published" });
    setSavedEntry(entry);
  }

  async function handleApproveCategory() {
    if (!savedEntry) return;
    setApproving(true);
    try {
      const updated = await approveSuggestedCategory(savedEntry.id);
      setSavedEntry(updated);
    } finally {
      setApproving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Capture a new entry</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Paste a link to pull what we can find, then fill in the rest. Saves straight
        to the live Directory of Good.
      </p>

      {savedEntry && (
        <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-900">
          Saved "{savedEntry.name}" to the directory.
        </div>
      )}

      {savedEntry?.suggested_category && (
        <div className="mt-3 flex items-center justify-between gap-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-800">
          <span>
            Suggested new category: <span className="font-medium">{savedEntry.suggested_category}</span>
          </span>
          <button
            type="button"
            onClick={handleApproveCategory}
            disabled={approving}
            className="shrink-0 rounded-md bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-800/40 dark:text-amber-200 dark:hover:bg-amber-800/60"
          >
            {approving ? "Adding..." : "Create & assign"}
          </button>
        </div>
      )}

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <DirectoryEntryForm
          key={savedEntry?.id ?? "form"}
          onSubmit={handleSubmit}
          submitLabel="Save to directory"
          showUrlExtract
        />
      </div>
    </div>
  );
}
