"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import type { LatLngExpression } from "leaflet";

type SearchMapProps = {
  initial?: { lat: number; lng: number } | null;
  onChange?: (pos: { lat: number; lng: number } | null) => void;
  className?: string;
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

export default function SearchMapClient({ initial = null, onChange, className = "h-72 w-full rounded-xl" }: SearchMapProps) {
  const [center, setCenter] = useState<LatLngExpression>(initial ? [initial.lat, initial.lng] : [51.1657, 10.4515]);
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(initial);

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
        <MapClickHandler
          onChange={(pos) => {
            setMarker(pos);
            if (pos) onChange && onChange(pos);
          }}
        />
        {marker && <Marker position={[marker.lat, marker.lng]} />}
      </MapContainer>
    </div>
  );
}
