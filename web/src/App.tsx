import { useState } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
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

const desktopNavClasses = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium transition-colors ${
    isActive
      ? "text-emerald-700 dark:text-emerald-400"
      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
  }`;

const mobileNavClasses = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium px-4 py-2.5 transition-colors ${
    isActive
      ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
  }`;

function App() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const isMapPage = location.pathname === "/map";

  const closeMenu = () => setMenuOpen(false);

  return (
    <div
      className={`flex flex-col bg-slate-50 dark:bg-slate-950 ${
        isMapPage ? "h-screen" : "min-h-screen"
      }`}
    >
      <header className="flex-none border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <NavLink
            to="/"
            onClick={closeMenu}
            className="text-lg font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap"
          >
            Directory of Good
          </NavLink>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-6">
            <NavLink to="/" className={desktopNavClasses} end>Showcase</NavLink>
            <NavLink to="/map" className={desktopNavClasses}>Map</NavLink>
            <NavLink to="/network" className={desktopNavClasses}>Network</NavLink>
            <NavLink to="/submit" className={desktopNavClasses}>Submit an Entry</NavLink>
            <ThemeToggle />
          </nav>

          {/* Mobile: theme toggle + hamburger */}
          <div className="flex sm:hidden items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-5 h-5">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-5 h-5">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav menu — fixed so it's never clipped by overflow or stacking contexts */}
      {menuOpen && (
        <>
          <div
            className="sm:hidden fixed inset-0 z-[1998]"
            onClick={closeMenu}
          />
          <div className="sm:hidden fixed right-4 top-[57px] z-[1999] bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 py-2 min-w-[190px]">
            <nav className="flex flex-col">
              <NavLink to="/" className={mobileNavClasses} end onClick={closeMenu}>Showcase</NavLink>
              <NavLink to="/map" className={mobileNavClasses} onClick={closeMenu}>Map</NavLink>
              <NavLink to="/network" className={mobileNavClasses} onClick={closeMenu}>Network</NavLink>
              <NavLink to="/submit" className={mobileNavClasses} onClick={closeMenu}>Submit an Entry</NavLink>
            </nav>
          </div>
        </>
      )}

      <main
        className={
          isMapPage
            ? "flex-1 flex flex-col overflow-hidden min-h-0"
            : "mx-auto max-w-5xl px-6 py-10"
        }
      >
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
