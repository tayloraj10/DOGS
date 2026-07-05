import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import LoadingState from "../components/LoadingState";
import type { DirectoryEntry, DirectoryEntryInput, Project } from "../api/types";
import { configForKind, entryHref, parseRouteId } from "../lib/entryKind";

export default function EditEntryPage() {
  const { id: routeId } = useParams<{ id: string }>();
  const { kind, id } = parseRouteId(routeId ?? "");
  const config = configForKind(kind);
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const [entry, setEntry] = useState<DirectoryEntry | Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    config.api
      .get(id)
      .then(setEntry)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id, config]);

  async function handleSubmit(values: DirectoryEntryInput) {
    if (!id || !token) return;
    await config.api.updatePublic(id, token, values);
    navigate(entryHref(kind, id, values.name));
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

  if (loading) return <LoadingState />;
  if (notFound || !entry) return <p className="text-sm text-slate-400 dark:text-slate-500">Entry not found.</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Edit entry</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Update the details for {entry.name}.</p>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        {config.renderForm({
          initialValues: entry,
          onSubmit: handleSubmit,
          submitLabel: "Save changes",
        })}
      </div>
    </div>
  );
}
