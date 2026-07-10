import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import LoadingState from "../components/LoadingState";
import { useAuth } from "../hooks/useAuth";
import { getMyProfile } from "../api/users";
import { getIdea, addSimilarApp, expressInterest, withdrawInterest } from "../api/projectIdeas";
import { getCategoryColor, slugToLabel } from "../api/types";
import type { ProjectIdea, UserProfile } from "../api/types";
import { ApiError } from "../api/client";
import { CHANNEL_LABELS, availableChannels, channelHref } from "../lib/sharedContact";
import ChannelPicker from "../components/ChannelPicker";

const INPUT_CLASSES =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-emerald-500";

export default function IdeaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [idea, setIdea] = useState<ProjectIdea | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [interestBusy, setInterestBusy] = useState(false);
  const [interestError, setInterestError] = useState<string | null>(null);
  const [sharedFields, setSharedFields] = useState<string[]>([]);

  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

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
    if (!user) {
      setMyProfile(null);
      return;
    }
    let cancelled = false;
    getMyProfile().then((profile) => {
      if (!cancelled) setMyProfile(profile);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  function toggleField(key: string) {
    setSharedFields((prev) => (prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]));
  }

  function toggleAllFields(allKeys: string[]) {
    setSharedFields((prev) => (allKeys.every((k) => prev.includes(k)) ? [] : allKeys));
  }

  async function handleExpressInterest() {
    if (!id) return;
    setInterestBusy(true);
    setInterestError(null);
    try {
      const updated = await expressInterest(id, { shared_fields: sharedFields });
      setIdea(updated);
    } catch (err) {
      setInterestError(err instanceof ApiError ? err.message : "Couldn't mark you as interested.");
    } finally {
      setInterestBusy(false);
    }
  }

  async function handleWithdrawInterest() {
    if (!id) return;
    setInterestBusy(true);
    setInterestError(null);
    try {
      const updated = await withdrawInterest(id);
      setIdea(updated);
    } catch (err) {
      setInterestError(err instanceof ApiError ? err.message : "Couldn't withdraw your interest.");
    } finally {
      setInterestBusy(false);
    }
  }

  async function handleAddSimilarApp(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !url.trim()) {
      setFormError("A URL is required.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const app = await addSimilarApp(id, {
        url: url.trim(),
        name: name.trim() || null,
        note: note.trim() || null,
      });
      setIdea((prev) => (prev ? { ...prev, similar_apps: [...prev.similar_apps, app] } : prev));
      setUrl("");
      setName("");
      setNote("");
      setShowForm(false);
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Couldn't add that. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState />;
  if (notFound || !idea) return <p className="text-sm text-slate-400 dark:text-slate-500">Idea not found.</p>;

  const canEdit =
    !!myProfile &&
    idea.submitter_user_id === myProfile.id &&
    (idea.status === "pending" || idea.status === "approved" || idea.status === "claimed");

  const myInterest = idea.interested.find((i) => i.user_id === myProfile?.id) ?? null;
  const channels = myProfile ? availableChannels(myProfile) : [];

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/ideas"
        className="text-sm font-medium text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300"
      >
        ← Back to Ideas
      </Link>

      <div className="mt-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{idea.name}</h1>
          {idea.status !== "pending" && (
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {idea.status}
            </span>
          )}
        </div>

        {canEdit && (
          <Link
            to={`/ideas/${idea.id}/edit`}
            className="mt-1 inline-block text-sm font-medium text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            Edit your idea
          </Link>
        )}

        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{idea.description}</p>

        {idea.submitter_name && (
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            Idea originated by {idea.submitter_name}
          </p>
        )}

        {(idea.status === "approved" || idea.status === "claimed") && (
          <div className="mt-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {idea.interested.length > 0
                ? `${idea.interested.length} ${idea.interested.length === 1 ? "person is" : "people are"} interested in building this.`
                : "Nobody's marked themselves interested yet."}
            </p>

            {idea.interested.length > 0 && (
              <ul className="mt-3 flex max-h-[22rem] flex-col gap-2 overflow-y-auto pr-1">
                {idea.interested.map((person) => (
                  <li
                    key={person.user_id}
                    className="flex items-center gap-3 rounded-lg bg-white p-3 text-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
                  >
                    {person.photo_url ? (
                      <img
                        src={person.photo_url}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="h-8 w-8 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                        {(person.name ?? "?").charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{person.name ?? "Unnamed"}</p>
                      {Object.entries(person.shared_contact).length > 0 && (
                        <ul className="mt-0.5 flex flex-col gap-0.5">
                          {Object.entries(person.shared_contact).map(([key, value]) => {
                            const href = channelHref(key, value);
                            return (
                              <li key={key} className="truncate text-xs text-slate-500 dark:text-slate-400">
                                {CHANNEL_LABELS[key] ?? key}:{" "}
                                {href ? (
                                  <a
                                    href={href}
                                    target={href.startsWith("http") ? "_blank" : undefined}
                                    rel={href.startsWith("http") ? "noreferrer" : undefined}
                                    className="text-emerald-700 hover:underline dark:text-emerald-400"
                                  >
                                    {value}
                                  </a>
                                ) : (
                                  value
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4">
              {!user && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Sign in to mark yourself interested in helping build this.
                </p>
              )}

              {user && !myInterest && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Choose what to share if others want to connect:
                  </p>
                  <ChannelPicker
                    channels={channels}
                    selected={sharedFields}
                    onToggle={toggleField}
                    onToggleAll={toggleAllFields}
                  />
                  <button
                    type="button"
                    onClick={() => void handleExpressInterest()}
                    disabled={interestBusy}
                    className="self-start rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300 dark:disabled:bg-emerald-800"
                  >
                    {interestBusy ? "Joining..." : "I'm interested"}
                  </button>
                </div>
              )}

              {user && myInterest && (
                <button
                  type="button"
                  onClick={() => void handleWithdrawInterest()}
                  disabled={interestBusy}
                  className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                >
                  {interestBusy ? "Withdrawing..." : "I'm no longer interested"}
                </button>
              )}
            </div>

            {interestError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{interestError}</p>}
          </div>
        )}

        {idea.categories.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
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

        <div className="mt-6 border-t border-slate-100 pt-6 dark:border-slate-800">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Similar apps {idea.similar_apps.length > 0 && `(${idea.similar_apps.length})`}
            </h2>
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="text-sm font-medium text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              {showForm ? "Cancel" : "Know one?"}
            </button>
          </div>

          {idea.similar_apps.length === 0 && !showForm && (
            <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">
              Nothing flagged yet. If you know an app already doing this, add it below.
            </p>
          )}

          <ul className="mt-3 flex flex-col gap-2">
            {idea.similar_apps.map((app) => (
              <li
                key={app.id}
                className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800"
              >
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

          {showForm && (
            <form
              onSubmit={handleAddSimilarApp}
              className="mt-4 flex flex-col gap-4 rounded-xl bg-slate-50 p-5 dark:bg-slate-800/50"
            >
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Link *
                </label>
                <input
                  type="text"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className={`w-full ${INPUT_CLASSES}`}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="Optional"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full ${INPUT_CLASSES}`}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  What does it do?
                </label>
                <textarea
                  placeholder="Optional"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className={`w-full resize-none ${INPUT_CLASSES}`}
                />
              </div>
              {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="self-start rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300 dark:disabled:bg-emerald-800"
              >
                {submitting ? "Adding..." : "Add"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
