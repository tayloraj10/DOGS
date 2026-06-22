import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { listDirectoryEntries, listEntriesNeedingPhoto } from "../api/directory";

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? "text-emerald-700 dark:text-emerald-400"
    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200";

export default function ReviewNav() {
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [needsPhotoCount, setNeedsPhotoCount] = useState<number | null>(null);

  useEffect(() => {
    listDirectoryEntries("pending", 500).then((entries) => setPendingCount(entries.length));
    listEntriesNeedingPhoto().then((entries) => setNeedsPhotoCount(entries.length));
  }, []);

  return (
    <div className="mt-4 flex gap-4 text-sm font-medium">
      <NavLink to="/review" className={linkClasses}>
        Pending review{pendingCount !== null && ` (${pendingCount})`}
      </NavLink>
      <NavLink to="/review/all" className={linkClasses}>
        All entries
      </NavLink>
      <NavLink to="/review/photos" className={linkClasses}>
        Needs photo{needsPhotoCount !== null && ` (${needsPhotoCount})`}
      </NavLink>
      <NavLink to="/admin/sync" className={linkClasses}>
        Sync sheet
      </NavLink>
    </div>
  );
}
