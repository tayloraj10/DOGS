import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircleMarker, MapContainer, Popup, Tooltip, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { listDirectoryEntries } from "../api/directory";
import { useCategories } from "../hooks/useCategories";
import LoadingState from "../components/LoadingState";
import type { CategorySlug, DirectoryEntry } from "../api/types";
import { getCategoryColor, slugToLabel } from "../api/types";

const US_CENTER: [number, number] = [39.5, -98.35];
const US_ZOOM = window.innerWidth >= 640 ? 4 : 3;

const BASEMAPS = {
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    label: "Light",
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    label: "Dark",
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    label: "Satellite",
  },
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    label: "Street",
  },
} as const;

type BasemapKey = keyof typeof BASEMAPS;

function MapRefCapture({ mapRef }: { mapRef: React.MutableRefObject<LeafletMap | null> }) {
  mapRef.current = useMap();
  return null;
}

function ZoomTracker({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMap();
  useMapEvents({ zoomend: () => onZoom(map.getZoom()) });
  return null;
}

function ControlBtn({
  onClick,
  title,
  active,
  children,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`w-9 h-9 rounded-lg shadow-md flex items-center justify-center transition-colors ${
        active
          ? "bg-emerald-600 text-white"
          : "bg-white/90 backdrop-blur-sm text-slate-700 hover:bg-white"
      }`}
    >
      {children}
    </button>
  );
}

export default function MapPage() {
  const navigate = useNavigate();
  const { categories } = useCategories();
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<Set<CategorySlug>>(new Set());
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [basemap, setBasemap] = useState<BasemapKey>("light");
  const [showBasemapMenu, setShowBasemapMenu] = useState(false);
  const [zoom, setZoom] = useState(US_ZOOM);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    listDirectoryEntries("published", 500)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!showBasemapMenu) return;
    const close = () => setShowBasemapMenu(false);
    const id = setTimeout(() => document.addEventListener("click", close), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("click", close);
    };
  }, [showBasemapMenu]);

  const mappedEntries = useMemo(
    () => entries.filter((e) => e.coordinates !== null),
    [entries],
  );

  const categoriesWithEntries = useMemo(() => {
    const slugsWithEntries = new Set(mappedEntries.flatMap((e) => e.categories));
    return categories.filter((cat) => slugsWithEntries.has(cat.slug));
  }, [categories, mappedEntries]);

  const visibleEntries = useMemo(() => {
    if (selectedCategories.size === 0) return mappedEntries;
    return mappedEntries.filter((e) => e.categories.some((c) => selectedCategories.has(c)));
  }, [mappedEntries, selectedCategories]);

  const zoomToMyLocation = () => {
    if (!mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        mapRef.current!.setView(latlng, 12);
        setUserLocation(latlng);
      },
      () => {},
    );
  };

  const zoomToExtent = () => {
    const map = mapRef.current;
    if (!map) return;
    const points = (visibleEntries.length > 0 ? visibleEntries : mappedEntries).map(
      (e) => [e.coordinates!.latitude, e.coordinates!.longitude] as [number, number],
    );
    if (points.length === 0) return;
    const lats = points.map(([lat]) => lat);
    const lngs = points.map(([, lng]) => lng);
    map.fitBounds(
      [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
      { padding: [60, 60] },
    );
  };

  const zoomToUS = () => mapRef.current?.setView(US_CENTER, US_ZOOM);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="flex-1 relative min-h-0">
      {/* Category filter bar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex gap-1.5 bg-black/55 backdrop-blur-md rounded-full px-3 pt-2 pb-1.5 overflow-x-auto [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar]:block [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/60 [&::-webkit-scrollbar-track]:bg-white/10 [&::-webkit-scrollbar-track]:rounded-full" style={{ maxWidth: "calc(100vw - 120px)" }}>
        <button
          type="button"
          onClick={() => setSelectedCategories(new Set())}
          className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all ${
            selectedCategories.size === 0
              ? "bg-white text-slate-900 shadow"
              : "text-white/70 hover:text-white"
          }`}
        >
          All
        </button>
        {categoriesWithEntries.map((cat) => {
          const color = getCategoryColor(cat.slug);
          const isActive = selectedCategories.has(cat.slug);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() =>
                setSelectedCategories((prev) => {
                  const next = new Set(prev);
                  if (next.has(cat.slug)) next.delete(cat.slug);
                  else next.add(cat.slug);
                  return next;
                })
              }
              style={isActive ? { backgroundColor: color, color: "white" } : { color, borderColor: color }}
              className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap border transition-all ${
                isActive ? "shadow" : "bg-transparent border-current hover:bg-white/10"
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Right-side controls */}
      <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-2">
        <ControlBtn onClick={zoomToMyLocation} title="Zoom to my location">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="7" />
            <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
          </svg>
        </ControlBtn>

        <ControlBtn onClick={zoomToExtent} title="Zoom to extent of data">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        </ControlBtn>

        <ControlBtn onClick={zoomToUS} title="Zoom to United States">
          <svg viewBox="0 0 20 14" className="w-4 h-4">
            <rect width="20" height="14" fill="#B22234"/>
            <rect y="2" width="20" height="2" fill="white"/>
            <rect y="6" width="20" height="2" fill="white"/>
            <rect y="10" width="20" height="2" fill="white"/>
            <rect width="8" height="8" fill="#3C3B6E"/>
            <circle cx="1.3" cy="1.3" r="0.7" fill="white"/>
            <circle cx="3.1" cy="1.3" r="0.7" fill="white"/>
            <circle cx="4.9" cy="1.3" r="0.7" fill="white"/>
            <circle cx="6.7" cy="1.3" r="0.7" fill="white"/>
            <circle cx="2.2" cy="3.3" r="0.7" fill="white"/>
            <circle cx="4.0" cy="3.3" r="0.7" fill="white"/>
            <circle cx="5.8" cy="3.3" r="0.7" fill="white"/>
            <circle cx="1.3" cy="5.3" r="0.7" fill="white"/>
            <circle cx="3.1" cy="5.3" r="0.7" fill="white"/>
            <circle cx="4.9" cy="5.3" r="0.7" fill="white"/>
            <circle cx="6.7" cy="5.3" r="0.7" fill="white"/>
            <circle cx="2.2" cy="7.0" r="0.7" fill="white"/>
            <circle cx="4.0" cy="7.0" r="0.7" fill="white"/>
            <circle cx="5.8" cy="7.0" r="0.7" fill="white"/>
          </svg>
        </ControlBtn>

        <div className="h-px bg-slate-300/60 mx-1" />

        <ControlBtn
          onClick={() => setBasemap(basemap === "dark" ? "light" : "dark")}
          title={basemap === "dark" ? "Switch to light basemap" : "Switch to dark basemap"}
          active={basemap === "dark"}
        >
          {basemap === "dark" ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </ControlBtn>

        <div className="relative z-[10]">
          <ControlBtn
            onClick={() => setShowBasemapMenu((v) => !v)}
            title="Change basemap"
            active={showBasemapMenu}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </ControlBtn>
          {showBasemapMenu && (
            <div className="absolute right-0 top-11 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 min-w-[110px]">
              {(Object.keys(BASEMAPS) as BasemapKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setBasemap(key); setShowBasemapMenu(false); }}
                  className={`w-full text-left px-4 py-1.5 text-sm transition-colors ${
                    basemap === key
                      ? "text-emerald-700 font-semibold bg-emerald-50"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {BASEMAPS[key].label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-px bg-slate-300/60 mx-1" />

        <ControlBtn onClick={() => mapRef.current?.zoomIn()} title="Zoom in">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="w-4 h-4">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </ControlBtn>
        <ControlBtn onClick={() => mapRef.current?.zoomOut()} title="Zoom out">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="w-4 h-4">
            <path d="M5 12h14" />
          </svg>
        </ControlBtn>
      </div>

      {/* Count / zoom badge */}
      <div className="absolute bottom-8 left-3 z-[1000] bg-black/55 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full pointer-events-none select-none">
        {visibleEntries.length} location{visibleEntries.length !== 1 ? "s" : ""} mapped · zoom {zoom.toFixed(1)}
      </div>

      <MapContainer
        center={US_CENTER}
        zoom={US_ZOOM}
        scrollWheelZoom
        zoomControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer key={basemap} url={BASEMAPS[basemap].url} attribution={BASEMAPS[basemap].attribution} />
        <MapRefCapture mapRef={mapRef} />
        <ZoomTracker onZoom={setZoom} />
        {userLocation && (
          <>
            <CircleMarker
              center={userLocation}
              radius={20}
              pathOptions={{ color: "#93c5fd", fillColor: "#93c5fd", fillOpacity: 0.2, weight: 1, opacity: 0.5 }}
            />
            <CircleMarker
              center={userLocation}
              radius={8}
              pathOptions={{ color: "white", fillColor: "#60a5fa", fillOpacity: 1, weight: 3 }}
            >
              <Tooltip permanent={false} direction="top" offset={[0, -10]}>
                Your location
              </Tooltip>
            </CircleMarker>
          </>
        )}
        {visibleEntries.map((entry) => {
          const color = getCategoryColor(entry.categories[0]);
          return (
            <CircleMarker
              key={entry.id}
              center={[entry.coordinates!.latitude, entry.coordinates!.longitude]}
              radius={8}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.9, weight: 2 }}
            >
              <Popup>
                <div className="min-w-[190px]">
                  {entry.image_url ? (
                    <div className="relative h-28 overflow-hidden">
                      <img
                        src={entry.image_url}
                        alt={entry.name}
                        className="w-full h-full object-cover"
                      />
                      <div
                        className="absolute inset-0"
                        style={{ background: `linear-gradient(to top, ${color}ee 0%, transparent 55%)` }}
                      />
                      <p className="absolute bottom-0 left-0 right-0 px-4 py-2 font-bold text-white text-sm leading-tight drop-shadow">
                        {entry.name}
                      </p>
                    </div>
                  ) : (
                    <div style={{ backgroundColor: color }} className="px-4 py-2.5">
                      <p className="font-bold text-white text-sm leading-tight">{entry.name}</p>
                    </div>
                  )}
                  <div className="px-4 py-3 bg-white">
                    {(entry.location?.city || entry.location?.state) && (
                      <p className="text-xs text-slate-500 mb-1.5">
                        {[entry.location.city, entry.location.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {entry.categories.length > 0 && (
                      <p className="text-xs font-medium mb-3" style={{ color }}>
                        {entry.categories.map((s) => slugToLabel(s)).join(" · ")}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate(`/entry/${entry.id}`)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full text-white transition-opacity hover:opacity-80"
                      style={{ backgroundColor: color }}
                    >
                      View entry →
                    </button>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
