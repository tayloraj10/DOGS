import { useEffect, useState } from "react";
import { FirebaseError } from "firebase/app";
import { useAuth } from "../hooks/useAuth";

interface LoginModalProps {
  onClose: () => void;
}

const IGNORED_ERROR_CODES = new Set([
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
]);

const INPUT_CLASSES =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-emerald-500";

function friendlyErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "auth/invalid-email":
        return "That email address doesn't look right.";
      case "auth/user-disabled":
        return "This account has been disabled.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Incorrect email or password.";
      case "auth/email-already-in-use":
        return "An account with that email already exists — try signing in instead.";
      case "auth/weak-password":
        return "Password should be at least 6 characters.";
      case "auth/too-many-requests":
        return "Too many attempts. Please wait a moment and try again.";
      case "auth/network-request-failed":
        return "Network error — please check your connection and try again.";
      default:
        return "Something went wrong. Please try again.";
    }
  }
  return "Something went wrong. Please try again.";
}

export default function LoginModal({ onClose }: LoginModalProps) {
  const { user, signIn, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const [mode, setMode] = useState<"sign-in" | "sign-up" | "reset">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (user) onClose();
  }, [user, onClose]);

  const handleGoogleSignIn = async () => {
    setPending(true);
    setError(null);
    try {
      await signIn();
    } catch (err) {
      if (err instanceof FirebaseError && IGNORED_ERROR_CODES.has(err.code)) {
        return;
      }
      setError(friendlyErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in both fields.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      if (mode === "sign-up") {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  const switchMode = (next: "sign-in" | "sign-up" | "reset") => {
    setMode(next);
    setError(null);
    setResetSent(false);
  };

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {mode === "sign-up" ? "Create account" : mode === "reset" ? "Reset password" : "Sign in"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="h-4 w-4">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {mode === "reset" ? (
          <div className="px-6 py-6 flex flex-col gap-4">
            {resetSent ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                If an account exists for <span className="font-medium">{email}</span>, a password
                reset email has been sent.
              </p>
            ) : (
              <>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Enter your email and we&apos;ll send you a link to reset your password.
                </p>
                <form onSubmit={(e) => void handleResetSubmit(e)} className="flex flex-col gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    autoComplete="email"
                    className={INPUT_CLASSES}
                  />
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300 dark:disabled:bg-emerald-800"
                  >
                    {pending ? "Please wait…" : "Send reset email"}
                  </button>
                </form>
                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              </>
            )}

            <button
              type="button"
              onClick={() => switchMode("sign-in")}
              className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <div className="px-6 py-6 flex flex-col gap-4">
            <button
              type="button"
              onClick={() => void handleGoogleSignIn()}
              disabled={pending}
              className="flex items-center justify-center gap-3 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4">
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.43 3.58v2.98h3.93c2.3-2.12 3.52-5.24 3.52-8.8z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.92l-3.93-2.98c-1.09.73-2.48 1.16-4 1.16-3.08 0-5.69-2.08-6.62-4.87H1.32v3.07C3.29 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.38 14.39c-.24-.73-.38-1.5-.38-2.39s.14-1.66.38-2.39V6.54H1.32C.48 8.19 0 10.04 0 12s.48 3.81 1.32 5.46l4.06-3.07z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.48-3.48C17.95 1.19 15.24 0 12 0 7.31 0 3.29 2.7 1.32 6.54l4.06 3.07C6.31 6.83 8.92 4.75 12 4.75z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span className="text-xs text-slate-400 dark:text-slate-500">or</span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>

            <form onSubmit={(e) => void handleEmailSubmit(e)} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                autoComplete="email"
                className={INPUT_CLASSES}
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                  className={`${INPUT_CLASSES} w-full pr-16`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {mode === "sign-in" && (
                <button
                  type="button"
                  onClick={() => switchMode("reset")}
                  className="self-end text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Forgot password?
                </button>
              )}

              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300 dark:disabled:bg-emerald-800"
              >
                {pending
                  ? "Please wait…"
                  : mode === "sign-up"
                    ? "Create account"
                    : "Sign in"}
              </button>
            </form>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <button
              type="button"
              onClick={() => switchMode(mode === "sign-up" ? "sign-in" : "sign-up")}
              className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {mode === "sign-up"
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
