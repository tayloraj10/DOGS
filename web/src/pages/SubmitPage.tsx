import { useState } from "react";
import DirectoryEntryForm from "../components/DirectoryEntryForm";
import { createDirectoryEntry } from "../api/directory";
import type { DirectoryEntryInput } from "../api/types";

export default function SubmitPage() {
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(values: DirectoryEntryInput) {
    await createDirectoryEntry({ ...values, status: "pending" });
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Thanks for submitting!</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          We'll review your submission and reach out if we need anything else before
          it's added to the Directory of Good.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Submit an entry</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Tell us about yourself or your group. We'll review what you share and follow
        up before it goes live on the Directory of Good.
      </p>
      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <DirectoryEntryForm onSubmit={handleSubmit} submitLabel="Submit for review" />
      </div>
    </div>
  );
}
