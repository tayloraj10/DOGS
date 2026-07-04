import type { EntryKind } from "../lib/entryKind";

interface KindIconProps {
  kind: EntryKind;
  className?: string;
}

export default function KindIcon({ kind, className = "h-4 w-4" }: KindIconProps) {
  if (kind === "project") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="9" cy="8" r="3" />
      <path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
      <circle cx="17" cy="8.5" r="2.5" />
      <path d="M15.5 13.8c2.9.5 5 2.9 5 6.2" />
    </svg>
  );
}
