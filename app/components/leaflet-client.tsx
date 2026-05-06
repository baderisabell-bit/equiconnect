"use client";

import { useEffect } from 'react';

export default function LeafletClient() {
  useEffect(() => {
    // Import leaflet dynamically only on the client to avoid SSR issues
    (async () => {
      try {
        const L = await import('leaflet');
        const DefaultIcon = L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41]
        });
        // @ts-ignore
        if (L && L.Marker && L.Marker.prototype) L.Marker.prototype.options.icon = DefaultIcon;
      } catch (e) {
        // Fail silently in environments where leaflet isn't available
        // (e.g., during tests or edge cases)
        // eslint-disable-next-line no-console
        console.warn('Leaflet client init failed:', e);
      }
    })();
  }, []);

  return null;
}
