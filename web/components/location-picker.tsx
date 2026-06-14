"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";

export function LocationPicker({
  lat, lng, onSelect,
}: {
  lat: number; lng: number;
  onSelect: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!show || !containerRef.current) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView([lat, lng], 14);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);

    const icon = L.divIcon({
      className: "",
      html: `<div style="background:#10b981;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
      iconSize: [24, 24], iconAnchor: [12, 12],
    });

    const marker = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
    markerRef.current = marker;

    marker.on("dragend", () => {
      const p = marker.getLatLng();
      onSelect(parseFloat(p.lat.toFixed(6)), parseFloat(p.lng.toFixed(6)));
    });

    map.on("click", (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      onSelect(parseFloat(e.latlng.lat.toFixed(6)), parseFloat(e.latlng.lng.toFixed(6)));
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [show, lat, lng, onSelect]);

  return (
    <div>
      <button type="button" onClick={() => setShow(s => !s)}
        className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 transition-colors mb-2">
        <MapPin size={14} /> {show ? "Hide map" : "Pick location on map"}
      </button>
      {show && (
        <div>
          <div ref={containerRef} className="rounded-xl overflow-hidden border border-[var(--line)]" style={{ height: 300 }} />
          <p className="text-[10px] text-mute mt-1">Click on the map or drag the pin to set the property location.</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 mt-2">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-mute block mb-1">Latitude</label>
          <input type="number" step="any" value={lat} readOnly className="field text-sm bg-[var(--bg)]" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-mute block mb-1">Longitude</label>
          <input type="number" step="any" value={lng} readOnly className="field text-sm bg-[var(--bg)]" />
        </div>
      </div>
    </div>
  );
}
