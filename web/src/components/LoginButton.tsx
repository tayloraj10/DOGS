import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { firebaseEnabled } from "../lib/firebase";
import LoginModal from "./LoginModal";

export default function LoginButton() {
  const { user, loading } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  if (!firebaseEnabled) {
    return null;
  }

  if (loading) {
    return <div className="h-7 w-7" />;
  }

  if (user) {
    const label = user.displayName ?? user.email ?? "Account";
    return (
      <Link
        to="/profile"
        title={`Signed in as ${label} — view profile`}
        className="flex h-7 w-7 items-center justify-center rounded-full overflow-hidden text-slate-500 transition-opacity hover:opacity-80 dark:text-slate-400"
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-7 w-7 rounded-full" />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
            {label.charAt(0).toUpperCase()}
          </span>
        )}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        Sign in
      </button>
      {modalOpen && <LoginModal onClose={() => setModalOpen(false)} />}
    </>
  );
}
