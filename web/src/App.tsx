import { NavLink, Route, Routes } from "react-router-dom";
import ShowcasePage from "./pages/ShowcasePage";
import SubmitPage from "./pages/SubmitPage";
import CapturePage from "./pages/CapturePage";
import ReviewQueuePage from "./pages/ReviewQueuePage";
import ReviewEntryPage from "./pages/ReviewEntryPage";
import NeedsPhotoPage from "./pages/NeedsPhotoPage";

const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium transition-colors ${
    isActive ? "text-emerald-700" : "text-slate-500 hover:text-slate-800"
  }`;

function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <NavLink to="/" className="text-lg font-semibold text-slate-900">
            Directory of Good
          </NavLink>
          <nav className="flex gap-6">
            <NavLink to="/" className={navLinkClasses} end>
              Showcase
            </NavLink>
            <NavLink to="/submit" className={navLinkClasses}>
              Submit an Entry
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <Routes>
          <Route path="/" element={<ShowcasePage />} />
          <Route path="/submit" element={<SubmitPage />} />
          <Route path="/capture" element={<CapturePage />} />
          <Route path="/review" element={<ReviewQueuePage />} />
          <Route path="/review/photos" element={<NeedsPhotoPage />} />
          <Route path="/review/:id" element={<ReviewEntryPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
