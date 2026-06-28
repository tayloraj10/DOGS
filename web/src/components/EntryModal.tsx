import { useNavigate } from "react-router-dom";
import SocialIcon, { SOCIAL_FIELDS } from "./SocialIcon";
import type { DirectoryEntry } from "../api/types";
import { getCategoryColor, slugToLabel } from "../api/types";

interface EntryModalProps {
  entry: DirectoryEntry | null;
  onClose: () => void;
}

export default function EntryModal({ entry, onClose }: EntryModalProps) {
  const navigate = useNavigate();

  if (!entry) return null;

  const color = getCategoryColor(entry.categories[0]);

  return (
    <div
      className="absolute inset-0 z-[2000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[4/3] w-full bg-slate-100 dark:bg-slate-800">
          {entry.image_url ? (
            <>
              <img
                src={entry.image_url}
                alt={entry.name}
                className="h-full w-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to right, ${entry.categories.map(getCategoryColor).join(", ")})`,
                  maskImage: "linear-gradient(to top, black 0%, transparent 55%)",
                  WebkitMaskImage: "linear-gradient(to top, black 0%, transparent 55%)",
                }}
              />
            </>
          ) : (
            <div className="flex h-full items-center justify-center" style={{ backgroundColor: color }}>
              <span className="text-6xl font-semibold text-white/60">
                {entry.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="h-4 w-4">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="flex flex-col gap-3 p-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 leading-tight">
              {entry.name}
            </h2>
            {entry.location?.city && (
              <p className="mt-0.5 text-sm text-slate-400 dark:text-slate-500">
                {[entry.location.city, entry.location.state, entry.location.country]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </div>

          {entry.description && (
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 line-clamp-3">
              {entry.description}
            </p>
          )}

          {entry.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {entry.categories.map((slug) => (
                <span
                  key={slug}
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: getCategoryColor(slug) }}
                >
                  {slugToLabel(slug)}
                </span>
              ))}
            </div>
          )}

          {SOCIAL_FIELDS.filter((f) => entry.social_links?.[f]).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {SOCIAL_FIELDS.filter((f) => entry.social_links?.[f]).map((field) => (
                <SocialIcon key={field} field={field} href={entry.social_links![field]!} />
              ))}
            </div>
          )}

          <button
            onClick={() => navigate(`/entry/${entry.id}`)}
            className="mt-1 w-full rounded-xl py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: color }}
          >
            View full profile →
          </button>
        </div>
      </div>
    </div>
  );
}
