import { KIND_ACCENT, KIND_DESCRIPTIONS, KIND_LABELS } from "../lib/entryKind";
import type { EntryKind } from "../lib/entryKind";
import KindIcon from "./KindIcon";

const KINDS: EntryKind[] = ["directory", "project"];

interface TypeFilterBarProps {
  selected: Set<EntryKind>;
  onToggle: (kind: EntryKind) => void;
}

export default function TypeFilterBar({ selected, onToggle }: TypeFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {KINDS.map((kind) => {
        const active = selected.has(kind);
        return (
          <button
            key={kind}
            type="button"
            title={KIND_DESCRIPTIONS[kind]}
            onClick={() => onToggle(kind)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              active ? KIND_ACCENT[kind].active : KIND_ACCENT[kind].inactive
            }`}
          >
            <KindIcon kind={kind} />
            {KIND_LABELS[kind]}
          </button>
        );
      })}
    </div>
  );
}
