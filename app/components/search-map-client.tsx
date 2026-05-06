"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";

type SearchMapProps = {
  initial?: { lat: number; lng: number } | null;
  onChange?: (pos: { lat: number; lng: number } | null) => void;
  className?: string;
  entries?: Array<{
    id: string;
    name: string;
    ort: string;
    plz?: string;
    lat?: number;
    lon?: number;
  }>;
  onSelectEntry?: (id: string) => void;
};

function MapClickHandler({ onChange }: { onChange?: (pos: { lat: number; lng: number } | null) => void }) {
  useMapEvents({
    click(e) {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      onChange && onChange({ lat, lng });
    }
  });
  return null;
}

function FitEntriesBounds({ entries }: { entries: NonNullable<SearchMapProps["entries"]> }) {
  const map = useMap();

  useEffect(() => {
    const points = entries.filter((entry) => Number.isFinite(entry.lat) && Number.isFinite(entry.lon));
    if (points.length === 0) return;

    const bounds: LatLngBoundsExpression = points.map((entry) => [Number(entry.lat), Number(entry.lon)]);
    if (points.length === 1) {
      map.setView([Number(points[0].lat), Number(points[0].lon)], 11);
      return;
    }

    map.fitBounds(bounds, { padding: [28, 28] });
  }, [entries, map]);

  return null;
}

export default function SearchMapClient({ initial = null, onChange, className = "h-72 w-full rounded-xl", entries = [], onSelectEntry }: SearchMapProps) {
  const [center, setCenter] = useState<LatLngExpression>(initial ? [initial.lat, initial.lng] : [51.1657, 10.4515]);
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(initial);
  const visibleEntries = useMemo(() => entries.filter((entry) => Number.isFinite(entry.lat) && Number.isFinite(entry.lon)), [entries]);

  useEffect(() => {
    if (initial) {
      setCenter([initial.lat, initial.lng]);
      setMarker(initial);
    }
  }, [initial]);

  useEffect(() => {
    if (!initial && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCenter([p.lat, p.lng]);
        },
        () => {},
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }
  }, [initial]);

  return (
    <div className={className}>
      <MapContainer center={center} zoom={12} scrollWheelZoom={false} className="h-full w-full rounded-xl">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {visibleEntries.length > 0 ? <FitEntriesBounds entries={visibleEntries} /> : <MapClickHandler onChange={(pos) => {
          setMarker(pos);
          if (pos) onChange && onChange(pos);
        }} />}
        {visibleEntries.length > 0
          ? visibleEntries.map((entry) => (
              <Marker
                key={entry.id}
                position={[Number(entry.lat), Number(entry.lon)]}
                eventHandlers={onSelectEntry ? { click: () => onSelectEntry(entry.id) } : undefined}
              >
                <Popup>
                  <div className="space-y-1">
                    <p className="text-sm font-black uppercase tracking-widest">{entry.name}</p>
                    <p className="text-xs text-slate-600">{entry.ort}{entry.plz ? ` · ${entry.plz}` : ""}</p>
                  </div>
                </Popup>
              </Marker>
            ))
          : marker && <Marker position={[marker.lat, marker.lng]} />}
      </MapContainer>
    </div>
  );
}
