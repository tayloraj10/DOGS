// Reference: original pin popup style (commit 24a4db4)
// Small info window that opens anchored to the pin on click — not a full-screen modal.
// Uses react-leaflet <Popup> instead of <EntryModal>.
//
// To restore: swap the <EntryModal> approach in MapPage.tsx for this <Popup> block
// inside the CircleMarker, and import { Popup } from "react-leaflet" and useNavigate.

/*
import { useNavigate } from "react-router-dom";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";

// Inside visibleEntries.map():
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
*/
