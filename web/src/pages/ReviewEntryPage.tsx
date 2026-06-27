import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DirectoryEntryForm from "../components/DirectoryEntryForm";
import LoadingState from "../components/LoadingState";
import { approveSuggestedCategory, getDirectoryEntry, getDirectoryEntryEditLink, updateDirectoryEntry } from "../api/directory";
import type { DirectoryEntry, DirectoryEntryInput } from "../api/types";

export default function ReviewEntryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<DirectoryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied" | "error">("idle");
  const [approvingCategory, setApprovingCategory] = useState(false);

  useEffect(() => {
    if (!id) return;
    getDirectoryEntry(id)
      .then(setEntry)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(values: DirectoryEntryInput) {
    if (!id) return;
    await updateDirectoryEntry(id, { ...values, status: "published" });
    navigate("/review");
  }

  async function handleApproveCategory() {
    if (!id) return;
    setApprovingCategory(true);
    try {
      const updated = await approveSuggestedCategory(id);
      setEntry(updated);
    } finally {
      setApprovingCategory(false);
    }
  }

  async function handleCopyEditLink() {
    if (!id) return;
    setCopyState("copying");
    try {
      const { token } = await getDirectoryEntryEditLink(id);
      const url = `${window.location.origin}/entry/${id}/edit?token=${token}`;
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  if (loading) return <LoadingState />;
  if (notFound || !entry) return <p className="text-sm text-slate-400 dark:text-slate-500">Entry not found.</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {entry.status === "pending" ? "Review submission" : "Edit entry"}
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {entry.status === "pending"
              ? "Fill in any missing gaps, then publish to make this entry live on the showcase."
              : "Update the details for this entry."}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopyEditLink}
          disabled={copyState === "copying"}
          className="shrink-0 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:text-slate-400 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:disabled:text-slate-600"
        >
          {copyState === "copied"
            ? "Copied!"
            : copyState === "error"
              ? "Couldn't copy"
              : copyState === "copying"
                ? "Copying..."
                : "Copy edit link"}
        </button>
      </div>

      {entry.suggested_category && (
        <div className="mt-4 flex items-center justify-between gap-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-800">
          <span>
            Suggested new category: <span className="font-medium">{entry.suggested_category}</span>
          </span>
          <button
            type="button"
            onClick={handleApproveCategory}
            disabled={approvingCategory}
            className="shrink-0 rounded-md bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-800/40 dark:text-amber-200 dark:hover:bg-amber-800/60"
          >
            {approvingCategory ? "Adding..." : "Create & assign"}
          </button>
        </div>
      )}

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <DirectoryEntryForm
          initialValues={entry}
          onSubmit={handleSubmit}
          submitLabel={entry.status === "pending" ? "Publish to directory" : "Save changes"}
          showUrlExtract
        />
      </div>
    </div>
  );
}
