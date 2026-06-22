import { useRef, useState } from "react";
import { ApiError } from "../api/client";
import { uploadDirectoryPhoto, uploadDirectoryPhotoFromUrl } from "../api/photos";

interface PhotoUploadFieldProps {
  value: string | null;
  onChange: (url: string | null) => void;
}

export default function PhotoUploadField({ value, onChange }: PhotoUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const result = await uploadDirectoryPhoto(file);
      onChange(result.url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to upload photo.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleUseUrl() {
    const url = photoUrl.trim();
    if (!url) return;

    setUploading(true);
    setError(null);
    try {
      const result = await uploadDirectoryPhotoFromUrl(url);
      onChange(result.url);
      setPhotoUrl("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to fetch image from that URL.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Photo</label>

      {value && (
        <div className="mt-2 flex items-center gap-3">
          <img src={value} alt="" className="h-20 w-20 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-sm text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
          >
            Remove
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelected}
        disabled={uploading}
        className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-emerald-700 hover:file:bg-emerald-100 dark:text-slate-300 dark:file:bg-emerald-900/30 dark:file:text-emerald-400 dark:hover:file:bg-emerald-900/50"
      />

      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-slate-400 dark:text-slate-500">or</span>
        <input
          type="url"
          placeholder="Paste an image URL"
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
          disabled={uploading}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
        />
        <button
          type="button"
          onClick={handleUseUrl}
          disabled={uploading || !photoUrl.trim()}
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:text-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:disabled:text-slate-600"
        >
          Use URL
        </button>
      </div>

      {uploading && <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">Uploading...</p>}
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
