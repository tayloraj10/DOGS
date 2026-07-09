import { useAuth } from "../hooks/useAuth";
import { firebaseEnabled } from "../lib/firebase";

export default function LoginButton() {
  const { user, loading, signIn, signOut } = useAuth();

  if (!firebaseEnabled) {
    return null;
  }

  if (loading) {
    return <div className="h-7 w-7" />;
  }

  if (user) {
    const label = user.displayName ?? user.email ?? "Account";
    return (
      <button
        type="button"
        onClick={() => void signOut()}
        title={`Signed in as ${label} — click to sign out`}
        className="flex h-7 w-7 items-center justify-center rounded-full overflow-hidden text-slate-500 transition-opacity hover:opacity-80 dark:text-slate-400"
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-7 w-7 rounded-full" />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
            {label.charAt(0).toUpperCase()}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void signIn()}
      className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
    >
      Sign in
    </button>
  );
}
