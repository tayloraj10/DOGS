import { useEffect, useState } from "react";

const COLD_START_DELAY_MS = 3000;
const BREATH_PHASE_MS = 4000;

export default function LoadingState({ label = "Loading..." }: { label?: string }) {
  const [coldStart, setColdStart] = useState(false);
  const [breathingIn, setBreathingIn] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setColdStart(true), COLD_START_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!coldStart) return;
    const interval = setInterval(() => setBreathingIn((prev) => !prev), BREATH_PHASE_MS);
    return () => clearInterval(interval);
  }, [coldStart]);

  if (!coldStart) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600 dark:border-slate-700 dark:border-t-emerald-400" />
        <p className="text-sm text-slate-400 dark:text-slate-500">{label}</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="mx-4 max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Getting Ready To Save The World?
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Take a few deep breaths while the data loads
        </p>

        <div className="mx-auto mt-6 flex h-16 w-16 items-center justify-center">
          <div
            className={`h-16 w-16 rounded-full border-2 border-emerald-500 bg-emerald-500/20 transition-transform ease-in-out dark:border-emerald-400 dark:bg-emerald-400/20 ${breathingIn ? "scale-100" : "scale-50"
              }`}
            style={{ transitionDuration: `${BREATH_PHASE_MS}ms` }}
          />
        </div>

        <p className="mt-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
          {breathingIn ? "Breathe out..." : "Breathe in..."}
        </p>

        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          The short wait helps keep costs down. Thanks for your patience.
        </p>
      </div>
    </div>
  );
}
