// components/fleet/MapComponent.tsx
"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

// Fix Leaflet icon bug (must be here, not in layout)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const createCustomIcon = (status: string) => {
    const color =
        status === "on_road" ? "#3b82f6" :
            status === "workshop" ? "#ef4444" :
                "#10b981";

    return L.divIcon({
        html: `
      <div class="relative">
        <div class="absolute inset-0 blur-xl scale-150 opacity-70 animate-pulse">
          <div class="w-16 h-16 rounded-full" style="background: ${color}"></div>
        </div>
        <div class="relative bg-white rounded-full shadow-2xl border-4 border-white flex items-center justify-center w-16 h-16">
          <div class="w-12 h-12 rounded-full" style="background: ${color}"></div>
        </div>
      </div>
    `,
        className: "custom-marker",
        iconSize: [64, 64],
        iconAnchor: [32, 64],
    });
};

export default function MapComponent({ vehicles }: { vehicles: any[] }) {
    const center: [number, number] = [-1.9441, 30.0619]; // Kigali

    return (
        <MapContainer
            center={center}
            zoom={11}
            className="w-full h-full rounded-3xl"
            scrollWheelZoom={true}
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
            />

            <MarkerClusterGroup
                chunkedLoading
                maxClusterRadius={60}
                spiderfyOnMaxZoom={true}
            >
                {vehicles
                    .filter(v => v.lat && v.lng)
                    .map((vehicle) => (
                        <Marker
                            key={vehicle.id}
                            position={[vehicle.lat, vehicle.lng]}
                            icon={createCustomIcon(vehicle.status)}
                        >
                            <Popup>
                                <div className="text-center p-4 bg-gray-900 text-white rounded-2xl">
                                    <p className="text-2xl font-black">{vehicle.registration_number}</p>
                                    <p className="text-lg mt-2">{vehicle.brand} {vehicle.model}</p>
                                    <div className="mt-4">
                    <span className={`px-6 py-3 rounded-full font-bold text-lg ${
                        vehicle.status === "on_road" ? "bg-blue-600" :
                            vehicle.status === "workshop" ? "bg-red-600" :
                                "bg-green-600"
                    }`}>
                      {vehicle.status.replace("_", " ").toUpperCase()}
                    </span>
                                    </div>
                                    {vehicle.driver && (
                                        <p className="mt-3 text-sm opacity-80">Driver: {vehicle.driver}</p>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    ))}
            </MarkerClusterGroup>
        </MapContainer>
    );
}