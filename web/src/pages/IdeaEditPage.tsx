import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import LoadingState from "../components/LoadingState";
import IdeaForm from "../components/IdeaForm";
import { useAuth } from "../hooks/useAuth";
import { getMyProfile } from "../api/users";
import { getIdea, updateIdeaPublic, updateIdeaMine } from "../api/projectIdeas";
import type { ProjectIdea, ProjectIdeaInput, UserProfile } from "../api/types";

export default function IdeaEditPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [idea, setIdea] = useState<ProjectIdea | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getIdea(id)
      .then(setIdea)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (token || !user) {
      setMyProfile(null);
      setProfileLoading(false);
      return;
    }
    let cancelled = false;
    setProfileLoading(true);
    getMyProfile()
      .then((profile) => {
        if (!cancelled) setMyProfile(profile);
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, user]);

  async function handleSubmit(values: ProjectIdeaInput) {
    if (!id) return;
    if (token) {
      await updateIdeaPublic(id, token, values);
    } else {
      await updateIdeaMine(id, values);
    }
    navigate(`/ideas/${id}`);
  }

  if (!id) return null;

  if (loading || (!token && (authLoading || profileLoading))) return <LoadingState />;
  if (notFound || !idea) return <p className="text-sm text-slate-400 dark:text-slate-500">Idea not found.</p>;

  const isOwner = !token && !!myProfile && idea.submitter_user_id === myProfile.id;

  if (!token && !isOwner) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {user ? "You can't edit this idea" : "Missing edit link"}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {user
            ? "Only the person who submitted this idea can edit it."
            : "This page needs a valid edit link to update an idea. Use the link you saved when you submitted it, or sign in as the original submitter."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Edit idea</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Update the details for {idea.name}.</p>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <IdeaForm
          initialValues={idea}
          onSubmit={handleSubmit}
          submitLabel="Save changes"
          excludeIdeaId={idea.id}
        />
      </div>
    </div>
  );
}
