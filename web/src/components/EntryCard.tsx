import { useNavigate } from "react-router-dom";
import type { DirectoryEntry, LinkedDirectoryEntry, ProjectStage } from "../api/types";
import { PROJECT_STAGE_LABELS, slugToLabel } from "../api/types";
import { KIND_ACCENT, KIND_LABELS, entryHref } from "../lib/entryKind";
import type { EntryKind } from "../lib/entryKind";
import EntryImage from "./EntryImage";
import KindIcon from "./KindIcon";
import SocialIcon, { SOCIAL_FIELDS } from "./SocialIcon";

interface EntryCardProps {
  entry: DirectoryEntry & {
    stage?: ProjectStage | null;
    kind: EntryKind;
    directory_entries?: LinkedDirectoryEntry[];
  };
}

export default function EntryCard({ entry }: EntryCardProps) {
  const navigate = useNavigate();
  const activeSocialFields = SOCIAL_FIELDS.filter(
    (field) => entry.social_links?.[field],
  );
  const href = entryHref(entry.kind, entry.id, entry.name);
  const isProject = entry.kind === "project";

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => navigate(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter") navigate(href);
      }}
      className={`flex cursor-pointer flex-col overflow-hidden rounded-2xl border-b-4 bg-white shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md dark:bg-slate-900 dark:ring-slate-800 dark:hover:shadow-none ${
        isProject ? "border-violet-500" : "border-sky-500"
      }`}
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
          {isProject && entry.directory_entries && entry.directory_entries.length > 0 && (
            <p className="mt-1 text-xs text-violet-600 dark:text-violet-400">
              Run by {entry.directory_entries.map((d) => d.name).join(", ")}
            </p>
          )}
        </div>

        {entry.stage && (
          <span className="w-fit rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {PROJECT_STAGE_LABELS[entry.stage]}
          </span>
        )}

        {entry.description && (
          <p className="line-clamp-3 text-sm text-slate-600 dark:text-slate-400">{entry.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${KIND_ACCENT[entry.kind].active}`}
          >
            <KindIcon kind={entry.kind} className="h-3 w-3" />
            {KIND_LABELS[entry.kind]}
          </span>
          {entry.categories.map((slug) => (
            <span
              key={slug}
              className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            >
              {slugToLabel(slug)}
            </span>
          ))}
        </div>

        {activeSocialFields.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-2 pt-2">
            {activeSocialFields.map((field) => (
              <SocialIcon key={field} field={field} href={entry.social_links![field]!} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
