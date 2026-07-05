import { directoryConfig, projectsConfig } from "../config/entityConfig";
import type { EntityConfig } from "../config/entityConfig";
import type { DirectoryEntry, Project } from "../api/types";

export type EntryKind = "directory" | "project";

export const KIND_LABELS: Record<EntryKind, string> = {
  directory: "Community",
  project: "Tech for Good",
};

export const KIND_DESCRIPTIONS: Record<EntryKind, string> = {
  directory:
    "People, groups, and organizations doing good in the world — including physical efforts like a shelter or a mutual aid group.",
  project:
    "Apps, websites, and other tech built for social good — the digital tools and resources themselves, not who runs them.",
};

export const KIND_ACCENT: Record<EntryKind, { active: string; inactive: string }> = {
  directory: {
    active: "bg-sky-600 text-white",
    inactive:
      "bg-white text-sky-700 ring-1 ring-sky-200 hover:bg-sky-50 dark:bg-slate-900 dark:text-sky-400 dark:ring-sky-900 dark:hover:bg-sky-950/40",
  },
  project: {
    active: "bg-violet-600 text-white",
    inactive:
      "bg-white text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50 dark:bg-slate-900 dark:text-violet-400 dark:ring-violet-900 dark:hover:bg-violet-950/40",
  },
};

export type MergedEntry = (DirectoryEntry | Project) & { kind: EntryKind };

export function tagKind<T>(items: T[], kind: EntryKind): (T & { kind: EntryKind })[] {
  return items.map((item) => ({ ...item, kind }));
}

// Drops directory entries that a project has explicitly linked to (e.g. "run by" this
// org) — the project entry is shown instead. Uses the actual directory_entries link
// rather than guessing from the name, since two unrelated entries can share a name and
// a linked org's name can differ from its project's name.
export function excludeLinkedDirectoryEntries<
  T extends { id: string; kind: EntryKind; directory_entries?: { id: string }[] },
>(items: T[]): T[] {
  const linkedIds = new Set(
    items
      .filter((item) => item.kind === "project")
      .flatMap((item) => item.directory_entries?.map((d) => d.id) ?? []),
  );
  return items.filter((item) => !(item.kind === "directory" && linkedIds.has(item.id)));
}

const ROUTE_PREFIX: Record<EntryKind, string> = {
  directory: "",
  project: "p-",
};

export function toRouteId(kind: EntryKind, id: string): string {
  return `${ROUTE_PREFIX[kind]}${id}`;
}

export function parseRouteId(routeId: string): { kind: EntryKind; id: string } {
  if (routeId.startsWith("p-")) {
    return { kind: "project", id: routeId.slice(2) };
  }
  return { kind: "directory", id: routeId };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Builds the public entry detail URL. The trailing slug is cosmetic only — the id is
// still the actual lookup key, so this stays safe even if two entries share a name or
// an entry is renamed later (old links without a slug, or with a stale one, still work).
export function entryHref(kind: EntryKind, id: string, name: string): string {
  const slug = slugify(name);
  return slug ? `/entry/${toRouteId(kind, id)}/${slug}` : `/entry/${toRouteId(kind, id)}`;
}

export function configForKind(kind: EntryKind): EntityConfig {
  return kind === "project" ? projectsConfig : directoryConfig;
}
