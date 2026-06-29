export type CategorySlug = string;

export function slugToLabel(slug: string): string {
  return slug.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const CATEGORY_COLORS: Record<CategorySlug, string> = {
  animals: "#f59e0b",
  environment: "#22c55e",
  "ethical-marketplace": "#f97316",
  fitness: "#ec4899",
  media: "#8b5cf6",
  "mutual-aid": "#06b6d4",
  nature: "#84cc16",
  regeneration: "#34d399",
  trash: "#ef4444",
  water: "#3b82f6",
};

export function getCategoryColor(slug: string): string {
  if (CATEGORY_COLORS[slug]) return CATEGORY_COLORS[slug];
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) & 0xffff;
  }
  // Constrain to hues in gaps between dedicated palette colors (58°=yellow, 240°=indigo, 295°=violet)
  const fallbackHues = [58, 240, 295];
  return `hsl(${fallbackHues[hash % fallbackHues.length]}, 60%, 50%)`;
}

export type DirectoryEntryStatus = "pending" | "published";

export interface StructuredLocation {
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface SocialLinks {
  website: string | null;
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  facebook: string | null;
  twitter: string | null;
}

export interface Category {
  id: string;
  slug: CategorySlug;
  name: string;
}

export interface DirectoryEntry {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  image_is_external: boolean;
  location: StructuredLocation | null;
  coordinates: Coordinates | null;
  social_links: SocialLinks | null;
  categories: CategorySlug[];
  suggested_category: string | null;
  featured: boolean;
  status: DirectoryEntryStatus;
  user_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface DirectoryEntryInput {
  name: string;
  description?: string | null;
  image_url?: string | null;
  location?: StructuredLocation | null;
  social_links?: SocialLinks | null;
  categories?: CategorySlug[];
  suggested_category?: string | null;
  featured?: boolean;
  status?: DirectoryEntryStatus;
}

export interface DirectoryExtractResponse {
  name: string | null;
  description: string | null;
  image_url: string | null;
  social_links: SocialLinks | null;
  other_links: string[];
  source_url: string;
}

export interface DirectoryPhotoUploadResponse {
  url: string;
}

export interface DirectoryEntryEditLink {
  token: string;
}

export interface BackfillEditTokensResponse {
  backfilled: number;
}

export interface SheetSyncResponse {
  created: number;
  updated: number;
  skipped: number;
  rows_seen: number;
  geocoded: number;
  geo_failed: number;
  images_skipped: number;
  errors: string[];
}

export interface OrphanedImage {
  name: string;
  url: string;
  size_bytes: number;
}

export interface OrphanedImagesResponse {
  orphans: OrphanedImage[];
}

export interface DeleteOrphanedImagesResponse {
  deleted: number;
}
