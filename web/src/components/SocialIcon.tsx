import type { ReactNode } from "react";
import type { SocialLinks } from "../api/types";

export type SocialField = keyof SocialLinks;

const ICONS: Record<SocialField, { viewBox: string; content: ReactNode }> = {
  website: {
    viewBox: "0 0 24 24",
    content: (
      <g fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="4" ry="9" />
        <path d="M3.5 9h17M3.5 15h17" />
      </g>
    ),
  },
  instagram: {
    viewBox: "0 0 24 24",
    content: (
      <path d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5zm10 2H7a3 3 0 00-3 3v10a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3zm-5 3.5a4.5 4.5 0 110 9 4.5 4.5 0 010-9zm0 2a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM17.5 6a1 1 0 110 2 1 1 0 010-2z" />
    ),
  },
  tiktok: {
    viewBox: "0 0 16 16",
    content: (
      <path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3V0Z" />
    ),
  },
  youtube: {
    viewBox: "0 0 24 24",
    content: (
      <path d="M22 8.5s-.2-1.6-.8-2.3c-.8-.9-1.7-.9-2.1-1C16.4 5 12 5 12 5h0s-4.4 0-7.1.2c-.4.1-1.3.1-2.1 1C2.2 6.9 2 8.5 2 8.5S1.8 10.4 1.8 12.3v1.4C1.8 15.6 2 17.5 2 17.5s.2 1.6.8 2.3c.8.9 1.9.9 2.4 1 1.7.2 7 .2 7 .2s4.4 0 7.1-.2c.4-.1 1.3-.1 2.1-1 .6-.7.8-2.3.8-2.3s.2-1.9.2-3.8v-1.4c0-1.9-.2-3.8-.2-3.8zM9.8 15.3V9.7l5.3 2.8-5.3 2.8z" />
    ),
  },
  facebook: {
    viewBox: "0 0 24 24",
    content: (
      <path d="M14 9h2.5l-.4 3H14v8h-3v-8H9V9h2V7.3C11 5.2 11.9 4 14.4 4H17v3h-1.7C14.5 7 14 7.4 14 8.2V9z" />
    ),
  },
  twitter: {
    viewBox: "0 0 24 24",
    content: (
      <path d="M21 5.3a7.7 7.7 0 01-2.2.9 3.7 3.7 0 00-6.4 2.5v.9A8.8 8.8 0 014 6.6s-2 4.5 2.5 7a4 4 0 01-2.5.2c0 2 1.8 3.8 4 4a8.9 8.9 0 01-5 1.4A12.4 12.4 0 0010 21c8.4 0 11.6-7.3 11.3-12.4A7.8 7.8 0 0021 5.3z" />
    ),
  },
  app_store: {
    viewBox: "0 0 384 512",
    content: (
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76-19.7C63.3 141 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 52.9-13.4 69.5-34.3z" />
    ),
  },
  google_play: {
    viewBox: "0 0 24 24",
    content: (
      <path d="M4.5 3.5c-.3.3-.5.75-.5 1.3v14.4c0 .55.2 1 .5 1.3l.1.1L13 12.4v-.2L4.6 3.4l-.1.1zM16 15.4l-2.5-2.5v-.2L16 10.2l3.4 2c.9.5.9 1.6 0 2.1l-3.4 2zm-11.4 4.9L13 12.6l2 2-9.5 5.4c-.3.2-.6.2-.9.3zm0-16.6l9.4 5.3-2 2-8.6-5.3c.3 0 .6.1.9.3l.3.1z" />
    ),
  },
  github: {
    viewBox: "0 0 24 24",
    content: (
      <path d="M12 2a10 10 0 00-3.16 19.5c.5.1.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.15-1.11-1.46-1.11-1.46-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.34 1.1 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.1.39-1.99 1.03-2.7-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.6 9.6 0 015 0c1.9-1.29 2.74-1.02 2.74-1.02.55 1.38.2 2.4.1 2.65.64.71 1.03 1.6 1.03 2.7 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0012 2z" />
    ),
  },
  discord: {
    viewBox: "0 0 24 24",
    content: (
      <path d="M20.3 5.3A18 18 0 0015.6 4l-.3.6a13 13 0 014.3 1.6 15.3 15.3 0 00-13.2 0A13 13 0 016.7 4.6L6.4 4a18 18 0 00-4.7 1.3C.2 8.9-.3 12.4.1 15.9a17.9 17.9 0 005.5 2.8l.7-1.2a11.5 11.5 0 01-1.8-.9l.4-.3a13 13 0 0014.2 0l.4.3a11.5 11.5 0 01-1.8.9l.7 1.2a17.9 17.9 0 005.5-2.8c.5-4-.6-7.5-3.6-10.6zM8.5 13.8c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8zm7 0c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8z" />
    ),
  },
};

const LABELS: Record<SocialField, string> = {
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

export const RAW_URL_FIELDS: SocialField[] = ["website", "app_store", "google_play", "discord"];

const PROFILE_URL_BUILDERS: Record<
  Exclude<SocialField, "website" | "app_store" | "google_play" | "discord">,
  (username: string) => string
> = {
  instagram: (username) => `https://instagram.com/${username}`,
  tiktok: (username) => `https://tiktok.com/@${username}`,
  youtube: (username) => `https://youtube.com/@${username}`,
  facebook: (username) => `https://facebook.com/${username}`,
  twitter: (username) => `https://x.com/${username}`,
  github: (username) => `https://github.com/${username}`,
};

export function resolveSocialUrl(field: SocialField, href: string): string {
  if (href.startsWith("http")) return href;
  if (RAW_URL_FIELDS.includes(field)) return `https://${href}`;
  return PROFILE_URL_BUILDERS[field as keyof typeof PROFILE_URL_BUILDERS](href);
}

interface SocialIconProps {
  field: SocialField;
  href: string;
}

export default function SocialIcon({ field, href }: SocialIconProps) {
  const url = resolveSocialUrl(field, href);
  const { viewBox, content } = ICONS[field];
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title={LABELS[field]}
      onClick={(e) => e.stopPropagation()}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-emerald-100 hover:text-emerald-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-emerald-900/40 dark:hover:text-emerald-400"
    >
      <svg viewBox={viewBox} fill="currentColor" className="h-4 w-4">
        {content}
      </svg>
    </a>
  );
}

// Full field list — used wherever we just display whichever links happen to be present
// (falsy fields are filtered out), so it's safe to share across entities.
export const SOCIAL_FIELDS: SocialField[] = [
  "website",
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
  "twitter",
  "app_store",
  "google_play",
  "github",
  "discord",
];

// The subset the Directory of Good's own capture/edit form collects. Projects collect the
// full SOCIAL_FIELDS list via ProjectForm.
export const CORE_SOCIAL_FIELDS: SocialField[] = [
  "website",
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
  "twitter",
];
