import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EntryImage from "../components/EntryImage";
import LoadingState from "../components/LoadingState";
import { listIdeas } from "../api/projectIdeas";
import { listProjects } from "../api/projects";
import { getCategoryColor, slugToLabel } from "../api/types";
import type { Project, ProjectIdea } from "../api/types";
import { entryHref } from "../lib/entryKind";

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

interface IdeaCardProps {
  idea: ProjectIdea;
  statusBadge: { label: string; className: string };
}

function IdeaCard({ idea, statusBadge }: IdeaCardProps) {
  return (
    <Link
      to={`/ideas/${idea.id}`}
      className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md dark:bg-slate-900 dark:ring-slate-800 dark:hover:shadow-none"
    >
      <div className="flex items-start justify-between gap-4">
        <p className="font-medium text-slate-900 dark:text-slate-100">{idea.name}</p>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge.className}`}>
          {statusBadge.label}
        </span>
      </div>
      {idea.description && (
        <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{idea.description}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {idea.categories.map((slug) => (
          <span
            key={slug}
            style={{ backgroundColor: `${getCategoryColor(slug)}22`, color: getCategoryColor(slug) }}
            className="rounded-full px-2 py-0.5 text-xs font-medium"
          >
            {slugToLabel(slug)}
          </span>
        ))}
        {idea.similar_apps.length > 0 && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {idea.similar_apps.length} similar app{idea.similar_apps.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
    </Link>
  );
}

type IdeaTab = "approved" | "pending" | "claimed";

export default function IdeasListPage() {
  const [pendingIdeas, setPendingIdeas] = useState<ProjectIdea[]>([]);
  const [approvedIdeas, setApprovedIdeas] = useState<ProjectIdea[]>([]);
  const [claimedIdeas, setClaimedIdeas] = useState<ProjectIdea[]>([]);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<IdeaTab>("claimed");

  useEffect(() => {
    Promise.all([
      listIdeas("pending", 100),
      listIdeas("approved", 100),
      listIdeas("claimed", 100),
      listProjects("published", 500),
    ])
      .then(([pending, approved, claimed, projectResults]) => {
        setPendingIdeas(pending);
        setApprovedIdeas(approved);
        setClaimedIdeas(claimed);
        setRecentProjects(shuffle(projectResults).slice(0, 6));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl bg-emerald-50 p-6 text-center dark:bg-emerald-950/30 sm:p-10">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          Got an idea for a social-good app?
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600 dark:text-slate-400">
          Pitch it in a couple minutes. We'll check whether someone's already built it, and if not,
          it goes into the pipeline for builders to pick up.
        </p>
        <Link
          to="/ideas/submit"
          className="mt-5 inline-block rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          Submit your idea
        </Link>
      </div>

      {loading && <LoadingState />}

      {!loading && recentProjects.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Recently built from ideas like yours
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {recentProjects.map((project, index) => (
              <Link
                key={project.id}
                to={entryHref("project", project.id, project.name)}
                className={`items-center gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md dark:bg-slate-900 dark:ring-slate-800 dark:hover:shadow-none ${
                  index < 3 ? "flex" : "hidden sm:flex"
                }`}
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                  {project.image_url ? (
                    <EntryImage src={project.image_url} alt={project.name} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
                      <span className="text-lg font-semibold">{project.name.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900 dark:text-slate-100">{project.name}</p>
                  {project.description && (
                    <p className="line-clamp-1 text-sm text-slate-500 dark:text-slate-400">
                      {project.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: "claimed", label: "Being built", count: claimedIdeas.length },
              { key: "approved", label: "Ready to build", count: approvedIdeas.length },
              { key: "pending", label: "Just submitted", count: pendingIdeas.length },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {tab.label}
              {!loading && ` (${tab.count})`}
            </button>
          ))}
        </div>

        {activeTab === "approved" && (
          <div className="mt-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Reviewed and approved by an admin — nobody's claimed these yet. Jump in and start a team.
            </p>

            {!loading && approvedIdeas.length === 0 && (
              <p className="mt-6 text-sm text-slate-400 dark:text-slate-500">
                No approved ideas right now — check back soon.
              </p>
            )}

            <div className="mt-4 flex flex-col gap-3">
              {approvedIdeas.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  statusBadge={{
                    label: "Approved",
                    className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === "pending" && (
          <div className="mt-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Waiting on review before we're ready for a team to form around them.
            </p>

            {!loading && pendingIdeas.length === 0 && (
              <p className="mt-6 text-sm text-slate-400 dark:text-slate-500">
                No pending ideas right now — be the first to submit one.
              </p>
            )}

            <div className="mt-4 flex flex-col gap-3">
              {pendingIdeas.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  statusBadge={{
                    label: "Pending review",
                    className: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === "claimed" && (
          <div className="mt-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              People are already interested in these — join in or check in with them before starting your own.
            </p>

            {!loading && claimedIdeas.length === 0 && (
              <p className="mt-6 text-sm text-slate-400 dark:text-slate-500">
                Nothing's been claimed yet.
              </p>
            )}

            <div className="mt-4 flex flex-col gap-3">
              {claimedIdeas.map((idea) => (
                <Link
                  key={idea.id}
                  to={`/ideas/${idea.id}`}
                  className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md dark:bg-slate-900 dark:ring-slate-800 dark:hover:shadow-none"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{idea.name}</p>
                    {idea.interested.length > 0 && (
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                        {idea.interested.length} interested
                      </span>
                    )}
                  </div>
                  {idea.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                      {idea.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
