import { useEffect, useRef, useState } from "react";
import DirectoryEntryForm from "./DirectoryEntryForm";
import type { DirectoryEntryFormHandle } from "./DirectoryEntryForm";
import { listDirectoryEntries } from "../api/directory";
import { SOCIAL_FIELDS } from "./SocialIcon";
import { PROJECT_STAGE_LABELS } from "../api/types";
import type {
  DirectoryEntry,
  DirectoryEntryInput,
  LinkedDirectoryEntry,
  ProjectInput,
  ProjectStage,
} from "../api/types";

const STAGE_OPTIONS = Object.entries(PROJECT_STAGE_LABELS) as [ProjectStage, string][];

const INPUT_CLASSES =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-emerald-500";

interface ProjectFormProps {
  initialValues?: Partial<ProjectInput> & { directory_entries?: LinkedDirectoryEntry[] };
  onSubmit: (values: ProjectInput) => Promise<void>;
  submitLabel: string;
  showUrlExtract?: boolean;
}

export default function ProjectForm({
  initialValues,
  onSubmit,
  submitLabel,
  showUrlExtract,
}: ProjectFormProps) {
  const [stage, setStage] = useState<ProjectStage | null>(initialValues?.stage ?? null);
  const [linkedEntries, setLinkedEntries] = useState<LinkedDirectoryEntry[]>(
    initialValues?.directory_entries ?? [],
  );
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<DirectoryEntry[]>([]);
  const formRef = useRef<DirectoryEntryFormHandle>(null);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    listDirectoryEntries("published", 500).then((entries) => {
      if (cancelled) return;
      const query = q.toLowerCase();
      setOptions(
        entries
          .filter(
            (e) =>
              e.name.toLowerCase().includes(query) &&
              !linkedEntries.some((linked) => linked.id === e.id),
          )
          .slice(0, 8),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [search, linkedEntries]);

  function addLinkedEntry(entry: DirectoryEntry) {
    setLinkedEntries((prev) => [...prev, { id: entry.id, name: entry.name }]);
    setSearch("");
    setOptions([]);
    formRef.current?.applyPrefill(entry);
  }

  function removeLinkedEntry(id: string) {
    setLinkedEntries((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleSubmit(values: DirectoryEntryInput) {
    await onSubmit({
      ...values,
      stage,
      directory_entry_ids: linkedEntries.map((e) => e.id),
    });
  }

  return (
    <DirectoryEntryForm
      ref={formRef}
      initialValues={initialValues}
      onSubmit={handleSubmit}
      submitLabel={submitLabel}
      showUrlExtract={showUrlExtract}
      socialFields={SOCIAL_FIELDS}
      extraFields={
        <>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Stage
            </label>
            <select
              value={stage ?? ""}
              onChange={(e) => setStage((e.target.value || null) as ProjectStage | null)}
              className={`mt-1 w-full ${INPUT_CLASSES}`}
            >
              <option value="">Not set</option>
              {STAGE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Linked Community entries
            </label>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Search for people or groups in Community connected to this project. Picking one
              will prefill any empty fields above from their entry.
            </p>
            {linkedEntries.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {linkedEntries.map((entry) => (
                  <span
                    key={entry.id}
                    className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  >
                    {entry.name}
                    <button
                      type="button"
                      onClick={() => removeLinkedEntry(entry.id)}
                      className="text-emerald-500 hover:text-emerald-800 dark:hover:text-emerald-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative mt-2">
              <input
                type="text"
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full ${INPUT_CLASSES}`}
              />
              {options.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                  {options.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => addLinkedEntry(entry)}
                      className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      {entry.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      }
    />
  );
}
