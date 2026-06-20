export type CategorySlug =
  | "animals"
  | "environment"
  | "fitness"
  | "nature"
  | "trash"
  | "water";

export const CATEGORY_DISPLAY_NAMES: Record<CategorySlug, string> = {
  animals: "Animals",
  environment: "Environment",
  fitness: "Fitness",
  nature: "Nature",
  trash: "Trash",
  water: "Water",
};

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
