import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import DirectoryEntryForm from "../components/DirectoryEntryForm";
import { getDirectoryEntry, updateDirectoryEntryPublic } from "../api/directory";
import type { DirectoryEntry, DirectoryEntryInput } from "../api/types";

export default function EditEntryPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
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
    if (!id || !token) return;
    await updateDirectoryEntryPublic(id, token, values);
    navigate(`/entry/${id}`);
  }

  if (!id || !token) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Missing edit link</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          This page needs a valid edit link to update an entry. Ask whoever manages the
          directory for your entry's edit link.
        </p>
      </div>
    );
  }

  if (loading) return <p className="text-sm text-slate-400 dark:text-slate-500">Loading...</p>;
  if (notFound || !entry) return <p className="text-sm text-slate-400 dark:text-slate-500">Entry not found.</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Edit entry</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Update the details for {entry.name}.</p>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <DirectoryEntryForm
          initialValues={entry}
          onSubmit={handleSubmit}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}
