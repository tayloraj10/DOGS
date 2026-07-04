import { useState } from "react";
import type { DirectoryEntryInput } from "../api/types";
import { KIND_ACCENT, KIND_DESCRIPTIONS, KIND_LABELS, configForKind } from "../lib/entryKind";
import type { EntryKind } from "../lib/entryKind";
import KindIcon from "../components/KindIcon";

export default function SubmitPage() {
  const [kind, setKind] = useState<EntryKind>("directory");
  const [submitted, setSubmitted] = useState(false);
  const config = configForKind(kind);

  async function handleSubmit(values: DirectoryEntryInput) {
    await config.api.create({ ...values, status: "pending" });
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{config.labels.submitThanksHeading}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {config.labels.submitThanksBody}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{config.labels.submitHeading}</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        {config.labels.submitSubheading}
      </p>

      <div className="mt-4 inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        {(["directory", "project"] as EntryKind[]).map((k) => (
          <button
            key={k}
            type="button"
            title={KIND_DESCRIPTIONS[k]}
            onClick={() => setKind(k)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              kind === k
                ? `${KIND_ACCENT[k].active} shadow`
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <KindIcon kind={k} />
            {KIND_LABELS[k]}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        {config.renderForm({ formKey: kind, onSubmit: handleSubmit, submitLabel: "Submit for review" })}
      </div>
    </div>
  );
}
