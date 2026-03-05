"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Star, MapPin } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Fix for Leaflet default icon issues in Next.js
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom location marker icon
const createLocationIcon = (name: string) => {
  return L.divIcon({
    className: "custom-div-icon",
    html: `<div class="bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-[10px] font-bold shadow-md border border-background whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">${name}</div>`,
    iconSize: [100, 30],
    iconAnchor: [50, 30],
  });
};

interface MapViewProps {
  locations: any[];
  center?: [number, number];
  zoom?: number;
}

// Helper component to update map view when props change
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center[0], center[1], zoom, map]);
  return null;
}

const DEFAULT_CENTER: [number, number] = [40.7128, -74.006];

export default function MapView({
  locations,
  center = DEFAULT_CENTER,
  zoom = 12
}: MapViewProps) {
  const [mapCenter, setMapCenter] = useState<[number, number]>(center);

  return (
    <div className="h-full w-full relative z-0">
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        className="h-full w-full rounded-xl"
        style={{ background: "#f8fafc" }}
      >
        <ChangeView center={mapCenter} zoom={zoom} />

        {/* Standard OpenStreetMap Tile Layer */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        {locations.map((location) => (
          <Marker
            key={location.id}
            position={[location.latitude, location.longitude]}
            icon={createLocationIcon(location.name)}
          >
            <Popup className="custom-leaflet-popup">
              <div className="w-[200px] overflow-hidden rounded-lg">
                <img
                  src={location.images?.[0] || "/placeholder.jpg"}
                  alt={location.name}
                  className="w-full h-32 object-cover"
                />
                <div className="p-3">
                  <h3 className="font-bold text-sm truncate mb-1">{location.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                    <span>{location.averageRating || "New"}</span>
                    <span>•</span>
                    <span>{location.city}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-primary">${location.pricePerDay}/day</span>
                    <Link href={`/parking/${location.id}`}>
                      <Button size="sm" className="h-7 px-2 text-[10px]">
                        Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Custom Styles for Leaflet */}
      <style jsx global>{`
        .leaflet-container {
          font-family: inherit;
          height: 100% !important;
          width: 100% !important;
        }
        .leaflet-tile-pane {
          opacity: 1 !important;
        }
        .leaflet-tile {
          visibility: visible !important;
        }
        .custom-leaflet-popup .leaflet-popup-content-wrapper {
          padding: 0;
          overflow: hidden;
          border-radius: 0.75rem;
        }
        .custom-leaflet-popup .leaflet-popup-content {
          margin: 0;
          width: 200px !important;
        }
        .custom-leaflet-popup .leaflet-popup-tip-container {
          display: none;
        }
        .leaflet-div-icon {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
}
