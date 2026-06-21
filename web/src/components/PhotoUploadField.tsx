import { useRef, useState } from "react";
import { ApiError } from "../api/client";
import { uploadDirectoryPhoto } from "../api/photos";

interface PhotoUploadFieldProps {
  value: string | null;
  onChange: (url: string | null) => void;
}

export default function PhotoUploadField({ value, onChange }: PhotoUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">Photo</label>

      {value && (
        <div className="mt-2 flex items-center gap-3">
          <img src={value} alt="" className="h-20 w-20 rounded-lg object-cover ring-1 ring-slate-200" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-sm text-slate-500 hover:text-red-600"
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
        className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-emerald-700 hover:file:bg-emerald-100"
      />

      {uploading && <p className="mt-1 text-sm text-slate-400">Uploading...</p>}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
