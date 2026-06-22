import { useState } from "react";
import { extractFromUrl } from "../api/directory";
import type { DirectoryExtractResponse } from "../api/types";

interface UrlExtractBoxProps {
  onResult: (result: DirectoryExtractResponse) => void;
}

export default function UrlExtractBox({ onResult }: UrlExtractBoxProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otherLinks, setOtherLinks] = useState<string[]>([]);

  async function handleFetch() {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await extractFromUrl(url.trim());
      onResult(result);
      setOtherLinks(result.other_links);
    } catch {
      setError("Couldn't fetch that URL. You can still fill in the form manually.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-100 dark:bg-emerald-900/20 dark:ring-emerald-900">
      <label className="block text-sm font-medium text-emerald-900 dark:text-emerald-200">
        Paste a profile or website link to auto-fill what we can find
      </label>
      <div className="mt-2 flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://instagram.com/someaccount"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
        />
        <button
          type="button"
          onClick={handleFetch}
          disabled={loading || !url.trim()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300 dark:disabled:bg-emerald-800"
        >
          {loading ? "Fetching..." : "Fetch"}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {otherLinks.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-emerald-900 dark:text-emerald-200">
            Other links found on the page (not auto-filled):
          </p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {otherLinks.slice(0, 8).map((link) => (
              <li key={link}>
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-emerald-700 underline hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  {link.replace(/^https?:\/\//, "").slice(0, 40)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
