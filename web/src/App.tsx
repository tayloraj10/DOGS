import { NavLink, Route, Routes } from "react-router-dom";
import ShowcasePage from "./pages/ShowcasePage";
import MapPage from "./pages/MapPage";
import NetworkPage from "./pages/NetworkPage";
import SubmitPage from "./pages/SubmitPage";
import CapturePage from "./pages/CapturePage";
import ReviewQueuePage from "./pages/ReviewQueuePage";
import ReviewEntryPage from "./pages/ReviewEntryPage";
import AllEntriesPage from "./pages/AllEntriesPage";
import NeedsPhotoPage from "./pages/NeedsPhotoPage";
import AdminSyncPage from "./pages/AdminSyncPage";
import EntryDetailPage from "./pages/EntryDetailPage";
import EditEntryPage from "./pages/EditEntryPage";
import ThemeToggle from "./components/ThemeToggle";

const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium transition-colors ${
    isActive
      ? "text-emerald-700 dark:text-emerald-400"
      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
  }`;

function App() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <NavLink to="/" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Directory of Good
          </NavLink>
          <nav className="flex items-center gap-6">
            <NavLink to="/" className={navLinkClasses} end>
              Showcase
            </NavLink>
            <NavLink to="/map" className={navLinkClasses}>
              Map
            </NavLink>
            <NavLink to="/network" className={navLinkClasses}>
              Network
            </NavLink>
            <NavLink to="/submit" className={navLinkClasses}>
              Submit an Entry
            </NavLink>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <Routes>
          <Route path="/" element={<ShowcasePage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/network" element={<NetworkPage />} />
          <Route path="/submit" element={<SubmitPage />} />
          <Route path="/entry/:id" element={<EntryDetailPage />} />
          <Route path="/entry/:id/edit" element={<EditEntryPage />} />
          <Route path="/capture" element={<CapturePage />} />
          <Route path="/review" element={<ReviewQueuePage />} />
          <Route path="/review/all" element={<AllEntriesPage />} />
          <Route path="/review/photos" element={<NeedsPhotoPage />} />
          <Route path="/admin/sync" element={<AdminSyncPage />} />
          <Route path="/review/:id" element={<ReviewEntryPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
