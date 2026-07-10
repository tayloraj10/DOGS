import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LoadingState from "../components/LoadingState";
import {
  getIdea,
  getIdeaEditLink,
  approveIdea,
  convertIdea,
  rejectIdea,
  mergeIdea,
} from "../api/projectIdeas";
import { listProjects } from "../api/projects";
import { getCategoryColor, slugToLabel } from "../api/types";
import type { Project, ProjectIdea } from "../api/types";
import { ApiError } from "../api/client";

const INPUT_CLASSES =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-emerald-500";

export default function ReviewIdeaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [idea, setIdea] = useState<ProjectIdea | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied" | "error">("idle");

  const [showMergePicker, setShowMergePicker] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<Project[]>([]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    getIdea(id)
      .then(setIdea)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    listProjects("published", 500).then((projects) => {
      if (cancelled) return;
      const query = q.toLowerCase();
      setOptions(projects.filter((p) => p.name.toLowerCase().includes(query)).slice(0, 8));
    });
    return () => {
      cancelled = true;
    };
  }, [search]);

  async function handleApprove() {
    if (!id) return;
    setBusy(true);
    setActionError(null);
    try {
      const updated = await approveIdea(id);
      setIdea(updated);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't approve this idea.");
    } finally {
      setBusy(false);
    }
  }

  async function handleConvert() {
    if (!id) return;
    setBusy(true);
    setActionError(null);
    try {
      const project = await convertIdea(id);
      navigate(`/review/${project.id}`);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't convert this idea into a project.");
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!id) return;
    setBusy(true);
    setActionError(null);
    try {
      await rejectIdea(id);
      navigate("/review/ideas");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't reject this idea.");
      setBusy(false);
    }
  }

  async function handleCopyEditLink() {
    if (!id) return;
    setCopyState("copying");
    try {
      const { token } = await getIdeaEditLink(id);
      const url = `${window.location.origin}/ideas/${id}/edit?token=${token}`;
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  async function handleMerge(project: Project) {
    if (!id) return;
    setBusy(true);
    setActionError(null);
    try {
      await mergeIdea(id, project.id);
      navigate("/review/ideas");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't merge this idea.");
      setBusy(false);
    }
  }

  if (loading) return <LoadingState />;
  if (notFound || !idea) return <p className="text-sm text-slate-400 dark:text-slate-500">Idea not found.</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Review idea</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Approve to vet it as open for claiming, merge it into an existing project, or reject it.
            Once a builder claims it, you can convert it into a live project.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopyEditLink}
          disabled={copyState === "copying"}
          className="shrink-0 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:text-slate-400 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:disabled:text-slate-600"
        >
          {copyState === "copied"
            ? "Copied!"
            : copyState === "error"
              ? "Couldn't copy"
              : copyState === "copying"
                ? "Copying..."
                : "Copy edit link"}
        </button>
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{idea.name}</h2>
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {idea.status}
          </span>
        </div>
        {idea.status === "claimed" && idea.interested.length > 0 && (
          <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">
            Interested: {idea.interested.map((i) => i.name ?? "Unnamed").join(", ")}
          </p>
        )}
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{idea.description}</p>

        {idea.categories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {idea.categories.map((slug) => (
              <span
                key={slug}
                style={{ backgroundColor: `${getCategoryColor(slug)}22`, color: getCategoryColor(slug) }}
                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
              >
                {slugToLabel(slug)}
              </span>
            ))}
          </div>
        )}

        {idea.suggested_category && (
          <p className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-800">
            Suggested new category: <span className="font-medium">{idea.suggested_category}</span>
          </p>
        )}

        {idea.similar_apps.length > 0 && (
          <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Similar apps flagged ({idea.similar_apps.length})
            </h3>
            <ul className="mt-2 flex flex-col gap-2">
              {idea.similar_apps.map((app) => (
                <li key={app.id} className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">
                  <a
                    href={app.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-emerald-700 underline hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300"
                  >
                    {app.name || app.url}
                  </a>
                  {app.note && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{app.note}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {actionError && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{actionError}</p>}

        <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-6 dark:border-slate-800">
          {idea.status === "pending" && (
            <button
              type="button"
              onClick={handleApprove}
              disabled={busy}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300 dark:disabled:bg-emerald-800"
            >
              Approve → open for claiming
            </button>
          )}
          {idea.status === "claimed" && (
            <button
              type="button"
              onClick={handleConvert}
              disabled={busy}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300 dark:disabled:bg-emerald-800"
            >
              Convert → create project
            </button>
          )}
          {(idea.status === "pending" || idea.status === "approved" || idea.status === "claimed") && (
            <>
              <button
                type="button"
                onClick={() => setShowMergePicker((v) => !v)}
                disabled={busy}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Merge into existing project
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={busy}
                className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
              >
                Reject
              </button>
            </>
          )}
        </div>

        {showMergePicker && (
          <div className="relative mt-4">
            <input
              type="text"
              placeholder="Search published projects by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full ${INPUT_CLASSES}`}
            />
            {options.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                {options.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => void handleMerge(project)}
                    disabled={busy}
                    className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    {project.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
