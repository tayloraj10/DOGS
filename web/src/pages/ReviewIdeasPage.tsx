import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ReviewNav from "../components/ReviewNav";
import LoadingState from "../components/LoadingState";
import { listIdeas } from "../api/projectIdeas";
import type { ProjectIdea } from "../api/types";

function IdeaCard({ idea }: { idea: ProjectIdea }) {
  return (
    <Link
      to={`/review/ideas/${idea.id}`}
      className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md dark:bg-slate-900 dark:ring-slate-800 dark:hover:shadow-none"
    >
      <p className="font-medium text-slate-900 dark:text-slate-100">{idea.name}</p>
      {idea.description && (
        <p className="mt-1 line-clamp-1 text-sm text-slate-500 dark:text-slate-400">
          {idea.description}
        </p>
      )}
      {idea.status === "claimed" && idea.interested.length > 0 && (
        <p className="mt-2 inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-800">
          {idea.interested.length} interested
        </p>
      )}
      {idea.similar_apps.length > 0 && (
        <p className="mt-2 inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-800">
          {idea.similar_apps.length} similar app{idea.similar_apps.length === 1 ? "" : "s"} flagged
        </p>
      )}
    </Link>
  );
}

export default function ReviewIdeasPage() {
  const [pendingIdeas, setPendingIdeas] = useState<ProjectIdea[]>([]);
  const [claimedIdeas, setClaimedIdeas] = useState<ProjectIdea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listIdeas("pending", 500), listIdeas("claimed", 500)])
      .then(([pending, claimed]) => {
        setPendingIdeas(pending);
        setClaimedIdeas(claimed);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Review queue</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Pending idea submissions waiting to be approved, rejected, or merged, plus claimed ideas
        ready to convert into a project.
      </p>

      <ReviewNav />

      {loading && <LoadingState />}

      {!loading && (
        <>
          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Pending review
          </h2>
          {pendingIdeas.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">No pending ideas.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {pendingIdeas.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} />
              ))}
            </div>
          )}

          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Claimed, ready to convert
          </h2>
          {claimedIdeas.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">No claimed ideas.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {claimedIdeas.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
