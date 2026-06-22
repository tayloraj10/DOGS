import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DirectoryEntryForm from "../components/DirectoryEntryForm";
import { getDirectoryEntry, getDirectoryEntryEditLink, updateDirectoryEntry } from "../api/directory";
import type { DirectoryEntry, DirectoryEntryInput } from "../api/types";

export default function ReviewEntryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<DirectoryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied" | "error">("idle");

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

  if (loading) return <p className="text-sm text-slate-400">Loading...</p>;
  if (notFound || !entry) return <p className="text-sm text-slate-400">Entry not found.</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Review submission</h1>
          <p className="mt-2 text-sm text-slate-600">
            Fill in any missing gaps, then publish to make this entry live on the
            showcase.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopyEditLink}
          disabled={copyState === "copying"}
          className="shrink-0 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:text-slate-400"
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
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
          They suggested a new category: <span className="font-medium">{entry.suggested_category}</span>.
          If it's worth adding, create it and assign it below before publishing.
        </p>
      )}

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <DirectoryEntryForm
          initialValues={entry}
          onSubmit={handleSubmit}
          submitLabel="Publish to directory"
          showUrlExtract
        />
      </div>
    </div>
  );
}
