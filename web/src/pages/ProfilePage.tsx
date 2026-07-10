import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getMyProfile, updateMyProfile } from "../api/users";
import { uploadUserPhoto } from "../api/photos";
import { ApiError } from "../api/client";
import { extractSocialUsername } from "../utils/socialLinks";
import type { SocialField } from "../components/SocialIcon";
import { RAW_URL_FIELDS, SOCIAL_FIELDS } from "../components/SocialIcon";
import type { SocialLinks, UserProfile } from "../api/types";

const INPUT_CLASSES =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-emerald-500";

const EMPTY_SOCIAL: SocialLinks = {
  website: null,
  instagram: null,
  tiktok: null,
  youtube: null,
  facebook: null,
  twitter: null,
  app_store: null,
  google_play: null,
  github: null,
  discord: null,
};

const SOCIAL_LABELS: Record<SocialField, string> = {
  website: "Website",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  twitter: "X / Twitter",
  app_store: "App Store",
  google_play: "Google Play",
  github: "GitHub",
  discord: "Discord",
};

type SocialUsernameField = Exclude<
  SocialField,
  "website" | "app_store" | "google_play" | "discord"
>;

export default function ProfilePage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(EMPTY_SOCIAL);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getMyProfile()
      .then((p) => {
        if (cancelled) return;
        setProfile(p);
        setName(p.name ?? "");
        setPhone(p.phone ?? "");
        setSocialLinks({ ...EMPTY_SOCIAL, ...(p.social_links ?? {}) });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Could not load your profile.");
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  function handleSocialBlur(field: SocialUsernameField) {
    setSocialLinks((s) => {
      const value = s[field];
      if (!value) return s;
      const username = extractSocialUsername(field, value);
      return username === value ? s : { ...s, [field]: username };
    });
  }

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const updated = await updateMyProfile({
        name: name.trim() || null,
        phone: phone.trim() || null,
        social_links: socialLinks,
      });
      setProfile(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setPhotoError(null);
    try {
      const updated = await uploadUserPhoto(file);
      setProfile(updated);
    } catch (err) {
      setPhotoError(err instanceof ApiError ? err.message : "Could not upload photo.");
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  if (authLoading) {
    return null;
  }

  if (!user) {
    return (
      <div className="max-w-md">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Profile</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Sign in to view your profile.
        </p>
      </div>
    );
  }

  const dirty =
    !!profile &&
    (name.trim() !== (profile.name ?? "") ||
      phone.trim() !== (profile.phone ?? "") ||
      JSON.stringify(socialLinks) !== JSON.stringify({ ...EMPTY_SOCIAL, ...(profile.social_links ?? {}) }));

  return (
    <div className="mx-auto max-w-md">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Profile</h1>
        <button
          type="button"
          onClick={() => {
            void signOut().finally(() => navigate("/"));
          }}
          className="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Sign out
        </button>
      </div>

      {dirty && (
        <div className="sticky top-4 z-10 mt-4 flex items-center justify-between gap-3 rounded-lg border border-amber-400 bg-amber-50 px-4 py-2.5 shadow-sm dark:border-amber-600 dark:bg-amber-950/40">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">You have unsaved changes</p>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-amber-300 dark:disabled:bg-amber-800"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      )}

      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          disabled={uploadingPhoto}
          className="group relative h-16 w-16 shrink-0 rounded-full disabled:cursor-not-allowed"
          aria-label="Change profile photo"
        >
          {profile?.photo_url ? (
            <img
              src={profile.photo_url}
              alt=""
              referrerPolicy="no-referrer"
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-xl font-semibold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
              {(profile?.name ?? profile?.email ?? "?").charAt(0).toUpperCase()}
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
            {uploadingPhoto ? "…" : "Change"}
          </span>
        </button>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={(e) => void handlePhotoSelected(e)}
          className="hidden"
        />
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{profile?.email}</p>
          {profile && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Member since {new Date(profile.created_at).toLocaleDateString()}
            </p>
          )}
          {photoError && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{photoError}</p>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-1.5">
        <label htmlFor="profile-name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Name
        </label>
        <input
          id="profile-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          placeholder="Your name"
          className={INPUT_CLASSES}
        />
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        <label htmlFor="profile-phone" className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Phone
        </label>
        <input
          id="profile-phone"
          type="tel"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setSaved(false);
          }}
          placeholder="Your phone number"
          className={INPUT_CLASSES}
        />
      </div>

      <div className="mt-6">
        <p className="block text-sm font-medium text-slate-700 dark:text-slate-300">Social links</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          These stay private on your profile. When you join a project you'll choose which of
          them (plus your email and phone) to share with that team.
        </p>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SOCIAL_FIELDS.map((field) => {
            const isRawUrl = RAW_URL_FIELDS.includes(field);
            return (
              <div key={field}>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                  {SOCIAL_LABELS[field]}
                </label>
                <div className="relative mt-0.5">
                  {!isRawUrl && (
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400 dark:text-slate-500">
                      @
                    </span>
                  )}
                  <input
                    type="text"
                    placeholder={isRawUrl ? "https://example.com" : "username"}
                    value={socialLinks[field] ?? ""}
                    onChange={(e) => {
                      setSocialLinks((s) => ({ ...s, [field]: e.target.value || null }));
                      setSaved(false);
                    }}
                    onBlur={() => !isRawUrl && handleSocialBlur(field as SocialUsernameField)}
                    className={`w-full ${INPUT_CLASSES} ${isRawUrl ? "px-3" : "pl-7 pr-3"}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {saved && !error && (
        <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">Saved.</p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || !profile || !dirty}
          className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed ${
            dirty
              ? "bg-amber-600 ring-2 ring-amber-400 hover:bg-amber-700 disabled:bg-amber-300 dark:ring-amber-600 dark:disabled:bg-amber-800"
              : "bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 dark:disabled:bg-emerald-800"
          }`}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
