import type { SocialLinks } from "../api/types";

type SocialField = keyof SocialLinks;

const PATHS: Record<SocialField, string> = {
  website:
    "M12 21a9 9 0 100-18 9 9 0 000 18zM3.6 9h16.8M3.6 15h16.8M12 3a13.5 13.5 0 010 18 13.5 13.5 0 010-18z",
  instagram:
    "M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5zm10 2H7a3 3 0 00-3 3v10a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3zm-5 3.5a4.5 4.5 0 110 9 4.5 4.5 0 010-9zm0 2a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM17.5 6a1 1 0 110 2 1 1 0 010-2z",
  tiktok:
    "M16.5 2h-3v13a3 3 0 11-2-2.83V9.05A5 5 0 1018.5 14V9.5a6.5 6.5 0 002-.34V6.16a4 4 0 01-4-4.16z",
  youtube:
    "M22 8.5s-.2-1.6-.8-2.3c-.8-.9-1.7-.9-2.1-1C16.4 5 12 5 12 5h0s-4.4 0-7.1.2c-.4.1-1.3.1-2.1 1C2.2 6.9 2 8.5 2 8.5S1.8 10.4 1.8 12.3v1.4C1.8 15.6 2 17.5 2 17.5s.2 1.6.8 2.3c.8.9 1.9.9 2.4 1 1.7.2 7 .2 7 .2s4.4 0 7.1-.2c.4-.1 1.3-.1 2.1-1 .6-.7.8-2.3.8-2.3s.2-1.9.2-3.8v-1.4c0-1.9-.2-3.8-.2-3.8zM9.8 15.3V9.7l5.3 2.8-5.3 2.8z",
  facebook:
    "M14 9h2.5l-.4 3H14v8h-3v-8H9V9h2V7.3C11 5.2 11.9 4 14.4 4H17v3h-1.7C14.5 7 14 7.4 14 8.2V9z",
  twitter:
    "M21 5.3a7.7 7.7 0 01-2.2.9 3.7 3.7 0 00-6.4 2.5v.9A8.8 8.8 0 014 6.6s-2 4.5 2.5 7a4 4 0 01-2.5.2c0 2 1.8 3.8 4 4a8.9 8.9 0 01-5 1.4A12.4 12.4 0 0010 21c8.4 0 11.6-7.3 11.3-12.4A7.8 7.8 0 0021 5.3z",
};

const LABELS: Record<SocialField, string> = {
  website: "Website",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  twitter: "X / Twitter",
};

interface SocialIconProps {
  field: SocialField;
  href: string;
}

export default function SocialIcon({ field, href }: SocialIconProps) {
  const url = href.startsWith("http") ? href : `https://${href}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title={LABELS[field]}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-emerald-100 hover:text-emerald-700"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d={PATHS[field]} />
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
