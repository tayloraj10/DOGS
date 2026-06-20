import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DirectoryEntryForm from "../components/DirectoryEntryForm";
import { getDirectoryEntry, updateDirectoryEntry } from "../api/directory";
import type { DirectoryEntry, DirectoryEntryInput } from "../api/types";

export default function ReviewEntryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<DirectoryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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

  if (loading) return <p className="text-sm text-slate-400">Loading...</p>;
  if (notFound || !entry) return <p className="text-sm text-slate-400">Entry not found.</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">Review submission</h1>
      <p className="mt-2 text-sm text-slate-600">
        Fill in any missing gaps, then publish to make this entry live on the
        showcase.
      </p>

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
