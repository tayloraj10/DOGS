import { useState } from "react";
import DirectoryEntryForm from "../components/DirectoryEntryForm";
import { createDirectoryEntry } from "../api/directory";
import type { DirectoryEntryInput } from "../api/types";

export default function CapturePage() {
  const [savedName, setSavedName] = useState<string | null>(null);

  async function handleSubmit(values: DirectoryEntryInput) {
    const entry = await createDirectoryEntry({ ...values, status: "published" });
    setSavedName(entry.name);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">Capture a new entry</h1>
      <p className="mt-2 text-sm text-slate-600">
        Paste a link to pull what we can find, then fill in the rest. Saves straight
        to the live Directory of Good.
      </p>

      {savedName && (
        <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-100">
          Saved "{savedName}" to the directory.
        </div>
      )}

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <DirectoryEntryForm
          key={savedName ?? "form"}
          onSubmit={handleSubmit}
          submitLabel="Save to directory"
          showUrlExtract
        />
      </div>
    </div>
  );
}
