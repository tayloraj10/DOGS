import { useState } from "react";
import { useCategories } from "../hooks/useCategories";
import UrlExtractBox from "./UrlExtractBox";
import type {
  CategorySlug,
  DirectoryEntryInput,
  DirectoryExtractResponse,
  SocialLinks,
  StructuredLocation,
} from "../api/types";
import { SOCIAL_FIELDS } from "./SocialIcon";

const EMPTY_LOCATION: StructuredLocation = {
  city: null,
  state: null,
  zip_code: null,
  country: null,
};

const EMPTY_SOCIAL: SocialLinks = {
  website: null,
  instagram: null,
  tiktok: null,
  youtube: null,
  facebook: null,
  twitter: null,
};

const SOCIAL_LABELS: Record<keyof SocialLinks, string> = {
  website: "Website",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  twitter: "X / Twitter",
};

interface DirectoryEntryFormProps {
  initialValues?: Partial<DirectoryEntryInput>;
  onSubmit: (values: DirectoryEntryInput) => Promise<void>;
  submitLabel: string;
  showUrlExtract?: boolean;
}

export default function DirectoryEntryForm({
  initialValues,
  onSubmit,
  submitLabel,
  showUrlExtract = false,
}: DirectoryEntryFormProps) {
  const { categories } = useCategories();

  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [imageUrl, setImageUrl] = useState(initialValues?.image_url ?? "");
  const [location, setLocation] = useState<StructuredLocation>({
    ...EMPTY_LOCATION,
    ...initialValues?.location,
  });
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    ...EMPTY_SOCIAL,
    ...initialValues?.social_links,
  });
  const [selectedCategories, setSelectedCategories] = useState<CategorySlug[]>(
    initialValues?.categories ?? [],
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function handleExtractResult(result: DirectoryExtractResponse) {
    if (!name && result.name) setName(result.name);
    if (!description && result.description) setDescription(result.description);
    if (!imageUrl && result.image_url) setImageUrl(result.image_url);
    if (result.social_links) {
      setSocialLinks((prev) => {
        const next = { ...prev };
        for (const field of SOCIAL_FIELDS) {
          if (!next[field] && result.social_links![field]) {
            next[field] = result.social_links![field];
          }
        }
        return next;
      });
    }
  }

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
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        location:
          Object.values(location).some(Boolean) ? location : null,
        social_links:
          Object.values(socialLinks).some(Boolean) ? socialLinks : null,
        categories: selectedCategories,
      });
    } catch {
      setSubmitError("Something went wrong while saving. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {showUrlExtract && <UrlExtractBox onResult={handleExtractResult} />}

      <div>
        <label className="block text-sm font-medium text-slate-700">Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Description</label>
        <textarea
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Image URL</label>
        <input
          type="text"
          value={imageUrl ?? ""}
          onChange={(e) => setImageUrl(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <div>
        <p className="block text-sm font-medium text-slate-700">Location</p>
        <div className="mt-1 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <input
            type="text"
            placeholder="City"
            value={location.city ?? ""}
            onChange={(e) => setLocation((l) => ({ ...l, city: e.target.value || null }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
          <input
            type="text"
            placeholder="State"
            value={location.state ?? ""}
            onChange={(e) => setLocation((l) => ({ ...l, state: e.target.value || null }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Zip code"
            value={location.zip_code ?? ""}
            onChange={(e) => setLocation((l) => ({ ...l, zip_code: e.target.value || null }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Country"
            value={location.country ?? ""}
            onChange={(e) => setLocation((l) => ({ ...l, country: e.target.value || null }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <p className="block text-sm font-medium text-slate-700">Social links</p>
        <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SOCIAL_FIELDS.map((field) => (
            <input
              key={field}
              type="text"
              placeholder={SOCIAL_LABELS[field]}
              value={socialLinks[field] ?? ""}
              onChange={(e) =>
                setSocialLinks((s) => ({ ...s, [field]: e.target.value || null }))
              }
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          ))}
        </div>
      </div>

      <div>
        <p className="block text-sm font-medium text-slate-700">Categories</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => toggleCategory(category.slug)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedCategories.includes(category.slug)
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
      >
        {submitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
