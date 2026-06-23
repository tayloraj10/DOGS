import type { ReactNode } from "react";
import type { SocialLinks } from "../api/types";

type SocialField = keyof SocialLinks;

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
};

const LABELS: Record<SocialField, string> = {
  website: "Website",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  twitter: "X / Twitter",
};

const PROFILE_URL_BUILDERS: Record<Exclude<SocialField, "website">, (username: string) => string> = {
  instagram: (username) => `https://instagram.com/${username}`,
  tiktok: (username) => `https://tiktok.com/@${username}`,
  youtube: (username) => `https://youtube.com/@${username}`,
  facebook: (username) => `https://facebook.com/${username}`,
  twitter: (username) => `https://x.com/${username}`,
};

interface SocialIconProps {
  field: SocialField;
  href: string;
}

export default function SocialIcon({ field, href }: SocialIconProps) {
  let url: string;
  if (href.startsWith("http")) {
    url = href;
  } else if (field === "website") {
    url = `https://${href}`;
  } else {
    url = PROFILE_URL_BUILDERS[field](href);
  }
  const { viewBox, content } = ICONS[field];
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title={LABELS[field]}
      onClick={(e) => e.stopPropagation()}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-emerald-100 hover:text-emerald-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-emerald-900/40 dark:hover:text-emerald-400"
    >
      <svg viewBox={viewBox} fill="currentColor" className="h-4 w-4">
        {content}
      </svg>
    </a>
  );
}

export const SOCIAL_FIELDS: SocialField[] = [
  "website",
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
  "twitter",
];
