import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import EntryImage from "../components/EntryImage";
import SocialIcon, { SOCIAL_FIELDS } from "../components/SocialIcon";
import LoadingState from "../components/LoadingState";
import { getDirectoryEntry } from "../api/directory";
import type { DirectoryEntry } from "../api/types";
import { CATEGORY_DISPLAY_NAMES } from "../api/types";

export default function EntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [entry, setEntry] = useState<DirectoryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    getDirectoryEntry(id)
      .then(setEntry)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingState />;
  if (notFound || !entry) return <p className="text-sm text-slate-400 dark:text-slate-500">Entry not found.</p>;

  const activeSocialFields = SOCIAL_FIELDS.filter((field) => entry.social_links?.[field]);

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/" className="text-sm font-medium text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300">
        ← Back to directory
      </Link>

      <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <div className="aspect-[16/9] w-full bg-slate-100 dark:bg-slate-800">
          {entry.image_url ? (
            <EntryImage src={entry.image_url} alt={entry.name} />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
              <span className="text-5xl font-semibold">{entry.name.charAt(0).toUpperCase()}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 p-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{entry.name}</h1>
            {entry.location?.city && (
              <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
                {[entry.location.city, entry.location.state, entry.location.country]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </div>

          {entry.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400">{entry.description}</p>
          )}

          {entry.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {entry.categories.map((slug) => (
                <span
                  key={slug}
                  className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                >
                  {CATEGORY_DISPLAY_NAMES[slug]}
                </span>
              ))}
            </div>
          )}

          {activeSocialFields.length > 0 && (
            <div className="flex gap-2 pt-2">
              {activeSocialFields.map((field) => (
                <SocialIcon key={field} field={field} href={entry.social_links![field]!} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
