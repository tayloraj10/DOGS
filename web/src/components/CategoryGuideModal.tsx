import { getCategoryColor, slugToLabel } from "../api/types";

const CATEGORY_DEFINITIONS: Record<string, string> = {
  animals:
    "Organizations and initiatives focused on animal welfare, rescue, sanctuaries, and the wellbeing of non-human life.",
  environment:
    "Advocacy and action around protecting ecosystems, conserving natural spaces, restoring biodiversity, reducing pollution, and environmental justice.",
  "ethical-marketplace":
    "Businesses and platforms centered on fair trade, ethical sourcing, regenerative economics, or values-aligned commerce.",
  fitness:
    "Wellness, movement, and physical health practices that align with a holistic or community-centered philosophy.",
  media:
    "Independent media, journalism, podcasts, and storytelling that amplifies underrepresented or regenerative narratives.",
  "mutual-aid":
    "Community-led support networks that share resources, food, care, or skills outside traditional charity structures.",
  nature:
    "Getting outside and connecting with the natural world, whether through hiking, foraging, outdoor education, or simply spending time in nature.",
  regeneration:
    "Building new social structures and ways of life rooted in healing, connection, and co-creating systems that are aligned with people and planet.",
  trash:
    "Community cleanups, litter removal, waste reduction, upcycling, and initiatives tackling the root causes of trash and the throwaway economy.",
  water:
    "Access to clean water, watershed and river health, ocean advocacy, wetlands preservation, water conservation, and the fight for water sovereignty and quality for all.",
};

interface CategoryGuideModalProps {
  onClose: () => void;
}

export default function CategoryGuideModal({ onClose }: CategoryGuideModalProps) {
  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Category Guide
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="h-4 w-4">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto max-h-[70vh] px-6 py-4 flex flex-col gap-4">
          {Object.entries(CATEGORY_DEFINITIONS).map(([slug, definition]) => {
            const color = getCategoryColor(slug);
            return (
              <div key={slug} className="flex gap-3">
                <div
                  className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <div>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {slugToLabel(slug)}
                  </span>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {definition}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
