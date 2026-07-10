import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCategories } from "../hooks/useCategories";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { searchSimilarIdeas } from "../api/projectIdeas";
import { ApiError } from "../api/client";
import { getCategoryColor } from "../api/types";
import type { CategorySlug, ProjectIdeaInput, SimilarMatch } from "../api/types";
import { entryHref } from "../lib/entryKind";

const INPUT_CLASSES =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-emerald-500";

interface IdeaFormProps {
  initialValues?: Partial<ProjectIdeaInput>;
  onSubmit: (values: ProjectIdeaInput) => Promise<void>;
  submitLabel: string;
  excludeIdeaId?: string;
}

export default function IdeaForm({
  initialValues,
  onSubmit,
  submitLabel,
  excludeIdeaId,
}: IdeaFormProps) {
  const { categories } = useCategories();

  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [selectedCategories, setSelectedCategories] = useState<CategorySlug[]>(
    initialValues?.categories ?? [],
  );
  const [suggestedCategory, setSuggestedCategory] = useState(
    initialValues?.suggested_category ?? "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [matches, setMatches] = useState<SimilarMatch[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const debouncedName = useDebouncedValue(name, 400);
  const debouncedDescription = useDebouncedValue(description, 400);

  useEffect(() => {
    const trimmedName = debouncedName.trim();
    if (trimmedName.length < 3) {
      setMatches([]);
      return;
    }
    let cancelled = false;
    searchSimilarIdeas(trimmedName, debouncedDescription.trim(), excludeIdeaId)
      .then((results) => {
        if (cancelled) return;
        setMatches(results);
        setDismissed(false);
      })
      .catch(() => {
        if (!cancelled) setMatches([]);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedName, debouncedDescription, excludeIdeaId]);

  function toggleCategory(slug: CategorySlug) {
    setSelectedCategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setSubmitError("Name is required.");
      return;
    }
    if (!description.trim()) {
      setSubmitError("Description is required.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        categories: selectedCategories,
        suggested_category: suggestedCategory.trim() || null,
      });
    } catch (err) {
      setSubmitError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong while saving. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const showSimilarPanel = !dismissed && matches.length > 0;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What's your idea called?"
          className={`mt-1 w-full ${INPUT_CLASSES}`}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Description *
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="What would it do, and who's it for?"
          className={`mt-1 w-full ${INPUT_CLASSES}`}
        />
      </div>

      {showSimilarPanel && (
        <div className="rounded-lg bg-amber-50 p-4 text-sm ring-1 ring-amber-200 dark:bg-amber-900/20 dark:ring-amber-800">
          <div className="flex items-start justify-between gap-4">
            <p className="font-medium text-amber-800 dark:text-amber-300">
              These look similar — is one of these yours?
            </p>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="shrink-0 text-amber-600 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
          <ul className="mt-2 flex flex-col gap-2">
            {matches.map((match) => (
              <li key={`${match.kind}-${match.id}`}>
                {match.kind === "project" ? (
                  <Link
                    to={entryHref("project", match.id, match.name)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-amber-900 underline hover:text-amber-700 dark:text-amber-200 dark:hover:text-amber-100"
                  >
                    {match.name}
                  </Link>
                ) : (
                  <Link
                    to={`/ideas/${match.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-amber-900 underline hover:text-amber-700 dark:text-amber-200 dark:hover:text-amber-100"
                  >
                    {match.name}
                  </Link>
                )}
                <span className="ml-2 text-xs uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  {match.kind === "project" ? "existing project" : "existing idea"}
                </span>
                {match.description && (
                  <p className="line-clamp-1 text-xs text-amber-700 dark:text-amber-400">
                    {match.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="block text-sm font-medium text-slate-700 dark:text-slate-300">Categories</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => toggleCategory(category.slug)}
              style={
                selectedCategories.includes(category.slug)
                  ? { backgroundColor: getCategoryColor(category.slug), borderColor: getCategoryColor(category.slug) }
                  : { borderColor: getCategoryColor(category.slug), color: getCategoryColor(category.slug) }
              }
              className={`rounded-full border-2 px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedCategories.includes(category.slug)
                  ? "text-white"
                  : "bg-white hover:opacity-75 dark:bg-slate-900"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
            Don't see a category that fits? Suggest one (we'll review and add it)
          </label>
          <input
            type="text"
            placeholder="e.g. Community gardens"
            value={suggestedCategory}
            onChange={(e) => setSuggestedCategory(e.target.value)}
            className={`mt-1 w-full ${INPUT_CLASSES}`}
          />
        </div>
      </div>

      {submitError && <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300 dark:disabled:bg-emerald-800"
      >
        {submitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
