import type { SocialField } from "../components/SocialIcon";
import { SOCIAL_FIELDS, resolveSocialUrl } from "../components/SocialIcon";
import type { UserProfile } from "../api/types";

export const SOCIAL_LABELS: Record<SocialField, string> = {
  website: "Website",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  twitter: "X / Twitter",
  app_store: "App Store",
  google_play: "Google Play",
  github: "GitHub",
  discord: "Discord",
};

export const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Phone",
  ...SOCIAL_LABELS,
};

export interface Channel {
  key: string;
  label: string;
  value: string;
}

export function availableChannels(profile: UserProfile): Channel[] {
  const channels: Channel[] = [{ key: "email", label: "Email", value: profile.email }];
  if (profile.phone) channels.push({ key: "phone", label: "Phone", value: profile.phone });
  for (const field of SOCIAL_FIELDS) {
    const value = profile.social_links?.[field];
    if (value) channels.push({ key: field, label: SOCIAL_LABELS[field], value });
  }
  return channels;
}

export function channelHref(key: string, value: string): string | null {
  if (key === "email") return `mailto:${value}`;
  if (key === "phone") return `tel:${value}`;
  if ((SOCIAL_FIELDS as string[]).includes(key)) {
    return resolveSocialUrl(key as SocialField, value);
  }
  return null;
}
