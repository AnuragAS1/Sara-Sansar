"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Property, formatNPR } from "@/lib/api";

export function PropertyMap({
  properties: items,
  height = 500,
  selectedSlug,
  onSelect,
}: {
  properties: Property[]; height?: number | string;
  selectedSlug?: string | null;
  onSelect?: (p: Property | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains("dark")));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) { mapRef.current.stop(); mapRef.current.remove(); mapRef.current = null; }

    const tileUrl = dark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    const map = L.map(containerRef.current, { scrollWheelZoom: true, zoomControl: true })
      .setView([27.7172, 85.3240], 11);

    L.tileLayer(tileUrl, {
      attribution: '&copy; OSM &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);

    const bounds: [number, number][] = [];

    items.forEach(p => {
      const lat = parseFloat(p.latitude);
      const lng = parseFloat(p.longitude);
      if (isNaN(lat) || isNaN(lng)) return;
      bounds.push([lat, lng]);

      const sel = selectedSlug === p.slug;
      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="
            background:${sel ? "#325727" : "#3E6F32"};color:white;padding:3px 8px;
            border-radius:20px;font-size:11px;font-weight:600;white-space:nowrap;
            box-shadow:0 2px 8px rgba(0,0,0,0.25);
            transform:${sel ? "scale(1.15)" : "scale(1)"};transition:transform 0.2s;cursor:pointer;
          ">${formatNPR(p.price).replace("Rs. ", "")}</div>`,
          iconSize: [80, 24], iconAnchor: [40, 24],
        }),
      }).addTo(map);

      const popup = L.popup({ closeButton: false, offset: [0, -12] }).setContent(`
        <div style="width:220px;font-family:inherit;">
          ${p.primary_image ? `<img src="${p.primary_image}" style="width:100%;height:100px;object-fit:cover;border-radius:8px 8px 0 0;" />` : ""}
          <div style="padding:8px 10px;">
            <div style="font-weight:600;font-size:13px;line-height:1.3;margin-bottom:4px;">${p.title}</div>
            <div style="color:#3E6F32;font-weight:600;font-size:14px;">${formatNPR(p.price)}</div>
            <div style="font-size:11px;color:#7A8377;margin-top:2px;">${p.city} · ${p.property_type}</div>
          </div>
        </div>
      `);

      marker.on("mouseover", () => marker.openPopup());
      marker.on("mouseout", () => marker.closePopup());
      marker.on("click", () => onSelect?.(p));
      marker.bindPopup(popup);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14, animate: false });
    }

    mapRef.current = map;
    return () => { map.stop(); map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, dark, selectedSlug]);

  return <div ref={containerRef} className="rounded-2xl overflow-hidden surface" style={{ height, width: "100%" }} />;
}
