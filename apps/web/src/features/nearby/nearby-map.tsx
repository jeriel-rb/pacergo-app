"use client";

import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  Tooltip,
} from "react-leaflet";
import type { NearbyCompanion } from "@pacergo/shared";
import { destination } from "./geo";

/** Leaflet map: the user's location + search radius, with trainers scattered
 *  at their true distance (arbitrary bearing — coordinates are never exposed).
 *  Loaded client-only via next/dynamic (ssr: false). */
export default function NearbyMap({
  center,
  radiusM,
  companions,
}: {
  center: { lat: number; lng: number };
  radiusM: number;
  companions: NearbyCompanion[];
}) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={12}
      scrollWheelZoom={false}
      className="h-72 w-full rounded-2xl"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      <Circle
        center={[center.lat, center.lng]}
        radius={radiusM}
        pathOptions={{
          color: "#1565ff",
          weight: 1,
          fillColor: "#1565ff",
          fillOpacity: 0.05,
        }}
      />
      <CircleMarker
        center={[center.lat, center.lng]}
        radius={8}
        pathOptions={{
          color: "#ffffff",
          weight: 2,
          fillColor: "#1565ff",
          fillOpacity: 1,
        }}
      />
      {companions.map((c, i) => {
        const bearing = (i / Math.max(1, companions.length)) * 2 * Math.PI;
        const p = destination(center.lat, center.lng, c.distance_m, bearing);
        return (
          <CircleMarker
            key={c.companion_id}
            center={[p.lat, p.lng]}
            radius={7}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: "#f59e0b",
              fillOpacity: 1,
            }}
          >
            <Tooltip>
              {c.display_name} · {(c.distance_m / 1000).toFixed(1)} km
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
