import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { listDirectoryEntries } from "../api/directory";
import { useCategories } from "../hooks/useCategories";
import CategoryFilterBar from "../components/CategoryFilterBar";
import LoadingState from "../components/LoadingState";
import type { CategorySlug, DirectoryEntry } from "../api/types";
import { CATEGORY_COLORS } from "../api/types";

const DEFAULT_CENTER: [number, number] = [39.5, -98.35];
const DEFAULT_ZOOM = 4;

export default function MapPage() {
  const navigate = useNavigate();
  const { categories } = useCategories();
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CategorySlug | null>(null);

  useEffect(() => {
    listDirectoryEntries("published", 500)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  const mappedEntries = useMemo(
    () => entries.filter((entry) => entry.coordinates !== null),
    [entries],
  );

  const visibleEntries = useMemo(() => {
    if (!selectedCategory) return mappedEntries;
    return mappedEntries.filter((entry) => entry.categories.includes(selectedCategory));
  }, [mappedEntries, selectedCategory]);

  return (
    <div>
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Map</h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-600 dark:text-slate-400">
          Where people and groups doing good are located
        </p>
      </div>

      <div className="mt-8 flex justify-center">
        <CategoryFilterBar
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </div>

      {!loading && (
        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          {visibleEntries.length} of {mappedEntries.length} mappable {mappedEntries.length === 1 ? "entry" : "entries"}
          {entries.length > mappedEntries.length
            ? ` (${entries.length - mappedEntries.length} missing coordinates)`
            : ""}
        </p>
      )}

      {loading && <LoadingState />}

      {!loading && (
        <div className="mt-6 h-[600px] overflow-hidden rounded-2xl ring-1 ring-slate-200 dark:ring-slate-800">
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            scrollWheelZoom
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {visibleEntries.map((entry) => {
              const color = CATEGORY_COLORS[entry.categories[0]] ?? "#64748b";
              return (
                <CircleMarker
                  key={entry.id}
                  center={[entry.coordinates!.latitude, entry.coordinates!.longitude]}
                  radius={7}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.85, weight: 1 }}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">{entry.name}</p>
                      {entry.location?.city && (
                        <p className="text-slate-500">
                          {[entry.location.city, entry.location.state].filter(Boolean).join(", ")}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => navigate(`/entry/${entry.id}`)}
                        className="mt-1 text-emerald-600 underline"
                      >
                        View entry
                      </button>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      )}
    </div>
  );
}
