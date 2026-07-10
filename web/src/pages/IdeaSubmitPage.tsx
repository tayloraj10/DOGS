import { useState } from "react";
import { Link } from "react-router-dom";
import IdeaForm from "../components/IdeaForm";
import { createIdea, getIdeaEditLink } from "../api/projectIdeas";
import type { ProjectIdeaInput } from "../api/types";

export default function IdeaSubmitPage() {
  const [ideaId, setIdeaId] = useState<string | null>(null);
  const [editLink, setEditLink] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  async function handleSubmit(values: ProjectIdeaInput) {
    const idea = await createIdea(values);
    setIdeaId(idea.id);
    try {
      const { token } = await getIdeaEditLink(idea.id);
      setEditLink(`${window.location.origin}/ideas/${idea.id}/edit?token=${token}`);
    } catch {
      setEditLink(null);
    }
  }

  async function handleCopyEditLink() {
    if (!editLink) return;
    try {
      await navigator.clipboard.writeText(editLink);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  if (ideaId) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Thanks for submitting your idea!
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          We'll review it and reach out if we need anything else. Anyone can also point out
          existing apps doing something similar from your idea's page.
        </p>

        {editLink && (
          <div className="mt-6 rounded-lg bg-slate-50 p-4 text-left dark:bg-slate-800">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Save this link to edit your idea later — it's the only way back in if you're not
              signed in:
            </p>
            <div className="mt-2 flex items-center gap-2">
              <input
                readOnly
                value={editLink}
                onFocus={(e) => e.target.select()}
                className="min-w-0 flex-1 truncate rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              />
              <button
                type="button"
                onClick={() => void handleCopyEditLink()}
                className="shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                {copyState === "copied" ? "Copied!" : copyState === "error" ? "Couldn't copy" : "Copy"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-center gap-4">
          <Link
            to={`/ideas/${ideaId}`}
            className="text-sm font-medium text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            View your idea
          </Link>
          <Link
            to="/ideas"
            className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Back to Ideas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
        Submit a project idea
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Got an idea for a social-good app or site that isn't built yet? Tell us about it — we'll
        check it against what's already out there before it goes live.
      </p>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <IdeaForm onSubmit={handleSubmit} submitLabel="Submit idea" />
      </div>
    </div>
  );
}
