import type { SocialLinks } from "../api/types";

type SocialUsernameField = Exclude<keyof SocialLinks, "website">;

const PLATFORM_URL_PATTERNS: Record<SocialUsernameField, RegExp> = {
  instagram: /instagram\.com\/([A-Za-z0-9_.]+)/i,
  tiktok: /tiktok\.com\/@?([A-Za-z0-9_.]+)/i,
  youtube: /youtube\.com\/(?:@|c\/|channel\/|user\/)?([A-Za-z0-9_.-]+)/i,
  facebook: /facebook\.com\/(?:pages\/)?([A-Za-z0-9_.-]+)/i,
  twitter: /(?:twitter|x)\.com\/([A-Za-z0-9_]+)/i,
};

const RESERVED_PATH_SEGMENTS = new Set([
  "p", "reel", "tv", "explore", "status", "i", "share", "watch", "video", "home",
]);

/** If the user pasted a full profile URL, pull out just the username. Plain usernames pass through unchanged. */
export function extractSocialUsername(field: SocialUsernameField, value: string): string {
  const trimmed = value.trim().replace(/^@/, "");
  if (!trimmed) return trimmed;
  const pattern = PLATFORM_URL_PATTERNS[field];
  const match = pattern.exec(trimmed);
  if (!match) return trimmed;
  const candidate = match[1]?.replace(/\/+$/, "");
  if (!candidate || RESERVED_PATH_SEGMENTS.has(candidate.toLowerCase())) return trimmed;
  return candidate;
}
