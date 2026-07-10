import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { getMyProfile } from "../api/users";
import { listProjectMembers, joinProject, leaveProject, updateOwnMembership } from "../api/projectMembers";
import { ApiError } from "../api/client";
import { CHANNEL_LABELS, availableChannels, channelHref } from "../lib/sharedContact";
import ChannelPicker from "./ChannelPicker";
import type { ProjectMember, UserProfile } from "../api/types";

interface TeamSectionProps {
  projectId: string;
}

export default function TeamSection({ projectId }: TeamSectionProps) {
  const { user, loading: authLoading } = useAuth();
  const [members, setMembers] = useState<ProjectMember[] | null>(null);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sharedFields, setSharedFields] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [editingShared, setEditingShared] = useState(false);

  useEffect(() => {
    if (!user) {
      setMembers(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([listProjectMembers(projectId), getMyProfile()])
      .then(([memberList, profile]) => {
        if (cancelled) return;
        setMembers(memberList);
        setMyProfile(profile);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Couldn't load the team.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, user]);

  const myMembership = members?.find((m) => m.user_id === myProfile?.id) ?? null;
  const channels = myProfile ? availableChannels(myProfile) : [];

  function toggleField(key: string) {
    setSharedFields((prev) => (prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]));
  }

  async function handleJoin() {
    setBusy(true);
    setError(null);
    try {
      const member = await joinProject(projectId, { shared_fields: sharedFields });
      setMembers((prev) => [...(prev ?? []), member]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't join this project.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLeave() {
    setBusy(true);
    setError(null);
    try {
      await leaveProject(projectId);
      setMembers((prev) => (prev ? prev.filter((m) => m.user_id !== myProfile?.id) : prev));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't leave this project.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveShared() {
    setBusy(true);
    setError(null);
    try {
      const updated = await updateOwnMembership(projectId, { shared_fields: sharedFields });
      setMembers((prev) => (prev ? prev.map((m) => (m.user_id === myProfile?.id ? updated : m)) : prev));
      setEditingShared(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update what you're sharing.");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) return null;

  return (
    <div className="mt-6 border-t border-slate-100 pt-6 dark:border-slate-800">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Team</h2>

      {!user && (
        <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">
          Sign in to see who's working on this project and join in.
        </p>
      )}

      {user && loading && <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">Loading team...</p>}

      {user && !loading && members && (
        <>
          <ul className="mt-3 flex flex-col gap-2">
            {members.map((member) => (
              <li
                key={member.user_id}
                className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800"
              >
                {member.photo_url ? (
                  <img
                    src={member.photo_url}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                    {(member.name ?? "?").charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {member.name ?? "Unnamed"}
                    {member.is_originator && (
                      <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Originator
                      </span>
                    )}
                  </p>
                  {Object.entries(member.shared_contact).length > 0 && (
                    <ul className="mt-0.5 flex flex-col gap-0.5">
                      {Object.entries(member.shared_contact).map(([key, value]) => {
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
            {members.length === 0 && (
              <p className="text-sm text-slate-400 dark:text-slate-500">No one's joined yet.</p>
            )}
          </ul>

          {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="mt-4">
            {!myMembership && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Choose what to share with this team:
                </p>
                <ChannelPicker channels={channels} selected={sharedFields} onToggle={toggleField} />
                <button
                  type="button"
                  onClick={() => void handleJoin()}
                  disabled={busy}
                  className="self-start rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300 dark:disabled:bg-emerald-800"
                >
                  {busy ? "Joining..." : "Join this project"}
                </button>
              </div>
            )}

            {myMembership && !editingShared && (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSharedFields(Object.keys(myMembership.shared_contact));
                    setEditingShared(true);
                  }}
                  disabled={busy}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Edit sharing
                </button>
                <button
                  type="button"
                  onClick={() => void handleLeave()}
                  disabled={busy}
                  className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                >
                  {busy ? "Leaving..." : "Leave project"}
                </button>
              </div>
            )}

            {myMembership && editingShared && (
              <div className="flex flex-col gap-2">
                <ChannelPicker channels={channels} selected={sharedFields} onToggle={toggleField} />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSaveShared()}
                    disabled={busy}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300 dark:disabled:bg-emerald-800"
                  >
                    {busy ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingShared(false)}
                    disabled={busy}
                    className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
