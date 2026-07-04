import { useState } from "react";
import type { DirectoryEntry, DirectoryEntryInput, Project } from "../api/types";
import { KIND_ACCENT, KIND_DESCRIPTIONS, KIND_LABELS, configForKind } from "../lib/entryKind";
import type { EntryKind } from "../lib/entryKind";
import KindIcon from "../components/KindIcon";

export default function CapturePage() {
  const [kind, setKind] = useState<EntryKind>("directory");
  const [savedEntry, setSavedEntry] = useState<DirectoryEntry | Project | null>(null);
  const [approving, setApproving] = useState(false);
  const config = configForKind(kind);

  function handleKindChange(next: EntryKind) {
    setKind(next);
    setSavedEntry(null);
  }

  async function handleSubmit(values: DirectoryEntryInput) {
    const entry = await config.api.create({ ...values, status: "published" });
    setSavedEntry(entry);
  }

  async function handleApproveCategory() {
    if (!savedEntry) return;
    setApproving(true);
    try {
      const updated = await config.api.approveSuggestedCategory(savedEntry.id);
      setSavedEntry(updated);
    } finally {
      setApproving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{config.labels.captureHeading}</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        {config.labels.captureSubheading}
      </p>

      <div className="mt-4 inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        {(["directory", "project"] as EntryKind[]).map((k) => (
          <button
            key={k}
            type="button"
            title={KIND_DESCRIPTIONS[k]}
            onClick={() => handleKindChange(k)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              kind === k
                ? `${KIND_ACCENT[k].active} shadow`
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <KindIcon kind={k} />
            {KIND_LABELS[k]}
          </button>
        ))}
      </div>

      {savedEntry && (
        <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-900">
          Saved "{savedEntry.name}" to {config.labels.navLabel}.
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
        {config.renderForm({
          formKey: `${kind}-${savedEntry?.id ?? "form"}`,
          onSubmit: handleSubmit,
          submitLabel: `Save to ${config.labels.navLabel}`,
          showUrlExtract: true,
        })}
      </div>
    </div>
  );
}
