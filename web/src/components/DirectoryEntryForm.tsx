import { useState } from "react";
import { useCategories } from "../hooks/useCategories";
import CategoryGuideModal from "./CategoryGuideModal";
import { lookupLocation } from "../api/directory";
import { uploadDirectoryPhotoFromUrl } from "../api/photos";
import { ApiError } from "../api/client";
import { extractSocialUsername } from "../utils/socialLinks";
import UrlExtractBox from "./UrlExtractBox";
import PhotoUploadField from "./PhotoUploadField";
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

const INPUT_CLASSES =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-emerald-500";

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
  const [suggestedCategory, setSuggestedCategory] = useState(
    initialValues?.suggested_category ?? "",
  );
  const [showCategoryGuide, setShowCategoryGuide] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lookingUpLocation, setLookingUpLocation] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  function handleExtractResult(result: DirectoryExtractResponse) {
    if (!name && result.name) setName(result.name);
    if (!description && result.description) setDescription(result.description);
    if (!imageUrl && result.image_url) {
      uploadDirectoryPhotoFromUrl(result.image_url)
        .then((uploaded) => setImageUrl(uploaded.url))
        .catch(() => { });
    }
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

  function handleSocialBlur(field: Exclude<keyof SocialLinks, "website">) {
    setSocialLinks((s) => {
      const value = s[field];
      if (!value) return s;
      const username = extractSocialUsername(field, value);
      return username === value ? s : { ...s, [field]: username };
    });
  }

  async function handleLocationLookup() {
    if (!Object.values(location).some(Boolean)) return;
    setLookingUpLocation(true);
    setLookupError(null);
    try {
      const result = await lookupLocation(location);
      setLocation((l) => {
        const isAbbr = (s: string | null) => s !== null && /^[A-Z]{2}$/.test(s);
        return {
          city: l.city || result.city,
          state: (isAbbr(l.state) && result.state) ? result.state : (l.state || result.state),
          zip_code: l.zip_code || result.zip_code,
          country: l.country || result.country,
        };
      });
    } catch (err) {
      setLookupError(
        err instanceof ApiError
          ? err.message
          : "Couldn't look up that location. Try filling in more fields manually.",
      );
    } finally {
      setLookingUpLocation(false);
    }
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {showUrlExtract && <UrlExtractBox onResult={handleExtractResult} />}

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`mt-1 w-full ${INPUT_CLASSES}`}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
        <textarea
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={`mt-1 w-full ${INPUT_CLASSES}`}
        />
      </div>

      <PhotoUploadField value={imageUrl || null} onChange={(url) => setImageUrl(url ?? "")} />

      <div>
        <div className="flex items-center justify-between">
          <p className="block text-sm font-medium text-slate-700 dark:text-slate-300">Location</p>
          <button
            type="button"
            onClick={handleLocationLookup}
            disabled={lookingUpLocation || !Object.values(location).some(Boolean)}
            className="text-sm font-medium text-emerald-700 hover:text-emerald-900 disabled:cursor-not-allowed disabled:text-slate-300 dark:text-emerald-400 dark:hover:text-emerald-300 dark:disabled:text-slate-600"
          >
            {lookingUpLocation ? "Looking up..." : "Fill in the rest"}
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Fill in whatever you know (e.g. just a zip code) and use "Fill in the rest" to
          look up the rest.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <input
            type="text"
            placeholder="City"
            value={location.city ?? ""}
            onChange={(e) => setLocation((l) => ({ ...l, city: e.target.value || null }))}
            className={INPUT_CLASSES}
          />
          <input
            type="text"
            placeholder="State / Province"
            value={location.state ?? ""}
            onChange={(e) => setLocation((l) => ({ ...l, state: e.target.value || null }))}
            className={INPUT_CLASSES}
          />
          <input
            type="text"
            placeholder="Zip code"
            value={location.zip_code ?? ""}
            onChange={(e) => setLocation((l) => ({ ...l, zip_code: e.target.value || null }))}
            className={INPUT_CLASSES}
          />
          <input
            type="text"
            placeholder="Country"
            value={location.country ?? ""}
            onChange={(e) => setLocation((l) => ({ ...l, country: e.target.value || null }))}
            className={INPUT_CLASSES}
          />
        </div>
        {lookupError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{lookupError}</p>}
      </div>

      <div>
        <p className="block text-sm font-medium text-slate-700 dark:text-slate-300">Social links</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Just the username, not the full link (e.g. "dogs", not
          instagram.com/dogs) — paste a full link and we'll trim it down for you.
        </p>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SOCIAL_FIELDS.map((field) => (
            <div key={field}>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                {SOCIAL_LABELS[field]}
              </label>
              <div className="relative mt-0.5">
                {field !== "website" && (
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400 dark:text-slate-500">
                    @
                  </span>
                )}
                <input
                  type="text"
                  placeholder={field === "website" ? "https://example.com" : "username"}
                  value={socialLinks[field] ?? ""}
                  onChange={(e) =>
                    setSocialLinks((s) => ({ ...s, [field]: e.target.value || null }))
                  }
                  onBlur={() => field !== "website" && handleSocialBlur(field)}
                  className={`w-full ${INPUT_CLASSES} ${field !== "website" ? "pl-7 pr-3" : "px-3"
                    }`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCategoryGuide && <CategoryGuideModal onClose={() => setShowCategoryGuide(false)} />}

      <div>
        <div className="flex items-center gap-2">
          <p className="block text-sm font-medium text-slate-700 dark:text-slate-300">Categories</p>
          <button
            type="button"
            onClick={() => setShowCategoryGuide(true)}
            title="What do these categories mean?"
            className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 ring-1 ring-slate-300 hover:bg-slate-100 hover:text-slate-600 transition-colors dark:ring-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </button>
        </div>
        <div className="mt-1 flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => toggleCategory(category.slug)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${selectedCategories.includes(category.slug)
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800"
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
