import { useNavigate } from "react-router-dom";
import type { DirectoryEntry } from "../api/types";
import { CATEGORY_DISPLAY_NAMES } from "../api/types";
import EntryImage from "./EntryImage";
import SocialIcon, { SOCIAL_FIELDS } from "./SocialIcon";

interface EntryCardProps {
  entry: DirectoryEntry;
}

export default function EntryCard({ entry }: EntryCardProps) {
  const navigate = useNavigate();
  const activeSocialFields = SOCIAL_FIELDS.filter(
    (field) => entry.social_links?.[field],
  );

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => navigate(`/entry/${entry.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter") navigate(`/entry/${entry.id}`);
      }}
      className="flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md dark:bg-slate-900 dark:ring-slate-800 dark:hover:shadow-none"
    >
      <div className="aspect-[4/3] w-full bg-slate-100 dark:bg-slate-800">
        {entry.image_url ? (
          <EntryImage src={entry.image_url} alt={entry.name} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
            <span className="text-3xl font-semibold">
              {entry.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{entry.name}</h3>
          {entry.location?.city && (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              {[entry.location.city, entry.location.state]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
        </div>

        {entry.description && (
          <p className="line-clamp-3 text-sm text-slate-600 dark:text-slate-400">{entry.description}</p>
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
          <div className="mt-auto flex gap-2 pt-2">
            {activeSocialFields.map((field) => (
              <SocialIcon key={field} field={field} href={entry.social_links![field]!} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
