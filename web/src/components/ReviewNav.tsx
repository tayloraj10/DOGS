import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { directoryConfig, projectsConfig } from "../config/entityConfig";

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? "text-emerald-700 dark:text-emerald-400"
    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200";

export default function ReviewNav() {
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [needsPhotoCount, setNeedsPhotoCount] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      directoryConfig.api.list("pending", 500),
      projectsConfig.api.list("pending", 500),
    ]).then(([directoryEntries, projects]) => setPendingCount(directoryEntries.length + projects.length));

    Promise.all([
      directoryConfig.api.listNeedingPhoto(),
      projectsConfig.api.listNeedingPhoto(),
    ]).then(([directoryEntries, projects]) => setNeedsPhotoCount(directoryEntries.length + projects.length));
  }, []);

  return (
    <div className="mt-4 flex gap-4 text-sm font-medium">
      <NavLink to="/review" end className={linkClasses}>
        Pending review{pendingCount !== null && ` (${pendingCount})`}
      </NavLink>
      <NavLink to="/review/all" className={linkClasses}>
        All entries
      </NavLink>
      <NavLink to="/review/photos" className={linkClasses}>
        Needs photo{needsPhotoCount !== null && ` (${needsPhotoCount})`}
      </NavLink>
      <NavLink to="/admin" className={linkClasses}>
        Admin
      </NavLink>
    </div>
  );
}
