"use client";

import L from "leaflet";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// ✅ Use maintained clustering package instead
// (react-leaflet-markercluster is deprecated)
const MarkerClusterGroup = dynamic(
    () => import("react-leaflet-cluster"),
    { ssr: false }
);

const MapContainer = dynamic(
    () => import("react-leaflet").then(mod => mod.MapContainer),
    { ssr: false }
);
const TileLayer = dynamic(
    () => import("react-leaflet").then(mod => mod.TileLayer),
    { ssr: false }
);
const Marker = dynamic(
    () => import("react-leaflet").then(mod => mod.Marker),
    { ssr: false }
);
const Popup = dynamic(
    () => import("react-leaflet").then(mod => mod.Popup),
    { ssr: false }
);
const Polyline = dynamic(
    () => import("react-leaflet").then(mod => mod.Polyline),
    { ssr: false }
);

// Fix Leaflet icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface MapContentProps {
    center: [number, number];
    filteredLocations: any[];
    pathCoordinates: [number, number][];
}

export default function MapContent({
                                       center,
                                       filteredLocations,
                                       pathCoordinates,
                                   }: MapContentProps) {
    return (
        <MapContainer
            center={center}
            zoom={12}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={false}
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            <MarkerClusterGroup chunkedLoading>
                {filteredLocations
                    .filter((loc) => loc.location?.coordinates)
                    .map((loc) => (
                        <Marker
                            key={loc.id}
                            position={[
                                loc.location.coordinates[1],
                                loc.location.coordinates[0],
                            ]}
                        >
                            <Popup>
                                <strong>Collector:</strong>{" "}
                                {loc.collector?.user?.username || "Unknown"}
                                <br />
                                <strong>Time:</strong>{" "}
                                {new Date(loc.timestamp).toLocaleString()}
                                <br />
                                <strong>Speed:</strong> {loc.speed ?? "N/A"} km/h
                                <br />
                                <strong>Battery:</strong>{" "}
                                {loc.battery_level ?? "N/A"}%
                            </Popup>
                        </Marker>
                    ))}
            </MarkerClusterGroup>

            {pathCoordinates.length > 1 && (
                <Polyline
                    positions={pathCoordinates}
                    color="#6b46c1"
                    weight={4}
                    opacity={0.7}
                />
            )}
        </MapContainer>
    );
}
