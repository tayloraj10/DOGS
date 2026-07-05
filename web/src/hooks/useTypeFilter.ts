import { useCallback, useState } from "react";
import type { EntryKind } from "../lib/entryKind";

const ALL_KINDS: EntryKind[] = ["directory", "project"];

export function useTypeFilter() {
  const [selected, setSelected] = useState<Set<EntryKind>>(new Set(ALL_KINDS));

  const toggle = useCallback((kind: EntryKind) => {
    setSelected((prev) => {
      if (prev.has(kind)) {
        if (prev.size === 1) return prev;
        const next = new Set(prev);
        next.delete(kind);
        return next;
      }
      const next = new Set(prev);
      next.add(kind);
      return next;
    });
  }, []);

  return { selected, toggle };
}
