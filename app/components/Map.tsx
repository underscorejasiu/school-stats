'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { SchoolWithPosition } from '@/lib/types';
import { IsochroneResponse } from '@/lib/types';

// Fix for default marker icons in Next.js
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

interface MapProps {
  schools: SchoolWithPosition[];
  selectedOrigin: [number, number] | null;
  isochroneData: IsochroneResponse | null;
  onOriginSelect: (coordinates: [number, number]) => void;
}

/**
 * Creates a custom marker icon with position number
 */
function createPositionedIcon(position: number): L.Icon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="41" viewBox="0 0 32 41">
      <path d="M16 0C7.164 0 0 7.164 0 16c0 11.045 16 25 16 25s16-13.955 16-25C32 7.164 24.836 0 16 0z" fill="#3388ff" stroke="#fff" stroke-width="1"/>
      <circle cx="16" cy="16" r="10" fill="#fff"/>
      <text x="16" y="21" font-family="Arial, sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#3388ff">${position}</text>
    </svg>
  `;
  
  return L.icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(svg),
    iconSize: [32, 41],
    iconAnchor: [16, 41],
    popupAnchor: [0, -41],
  });
}

// Color palette for different time ranges
const getColorForTime = (timeSeconds: number): string => {
  const minutes = timeSeconds / 60;
  if (minutes <= 5) return '#00ff00'; // Green
  if (minutes <= 10) return '#7fff00'; // Yellow-green
  if (minutes <= 15) return '#ffff00'; // Yellow
  if (minutes <= 30) return '#ff7f00'; // Orange
  return '#ff0000'; // Red
};

function MapClickHandler({ onOriginSelect }: { onOriginSelect: (coords: [number, number]) => void }) {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onOriginSelect([lng, lat]);
    },
  });
  return null;
}

function IsochroneLayer({ data }: { data: IsochroneResponse | null }) {
  if (!data) return null;

  return (
    <>
      {data.features.map((feature, index) => {
        const timeSeconds = feature.properties.value;
        const color = getColorForTime(timeSeconds);
        const minutes = Math.round(timeSeconds / 60);

        return (
          <GeoJSON
            key={index}
            data={feature.geometry as any}
            style={{
              fillColor: color,
              fillOpacity: 0.3,
              color: color,
              weight: 2,
              opacity: 0.8,
            }}
          >
            <Popup>
              <div className="text-sm">
                <strong>{minutes} minutes</strong>
                <br />
                Reachable area
              </div>
            </Popup>
          </GeoJSON>
        );
      })}
    </>
  );
}

export default function Map({ schools, selectedOrigin, isochroneData, onOriginSelect }: MapProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Schools are already filtered and sorted by the parent component
  const visibleSchools = schools;

  // Wrocław center coordinates
  const center: [number, number] = [51.1079, 17.0385];

  if (!isClient) {
    return (
      <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapClickHandler onOriginSelect={onOriginSelect} />

        {/* School markers - only show schools within isochrone when isochrones are active */}
        {visibleSchools.map((school) => (
          <Marker
            key={school.id}
            position={[school.coordinates[1], school.coordinates[0]]}
            icon={createPositionedIcon(school.position)}
          >
            <Popup>
              <div className="text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {school.position}
                  </span>
                  <strong>{school.name}</strong>
                </div>
                {school.address && (
                  <>
                    <br />
                    <span className="text-gray-600">{school.address}</span>
                  </>
                )}
                {school.type && (
                  <>
                    <br />
                    <span className="text-gray-500 text-xs">{school.type}</span>
                  </>
                )}
                {school.sortValue !== null && (
                  <>
                    <br />
                    <span className="text-gray-500 text-xs">
                      Score: {school.sortValue.toFixed(1)}
                    </span>
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Selected origin marker */}
        {selectedOrigin && (
          <Marker
            position={[selectedOrigin[1], selectedOrigin[0]]}
            icon={L.icon({
              ...defaultIcon.options,
              iconUrl: 'data:image/svg+xml;base64,' + btoa(`
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                  <circle cx="16" cy="16" r="12" fill="#ff0000" stroke="#fff" stroke-width="2"/>
                  <circle cx="16" cy="16" r="6" fill="#fff"/>
                </svg>
              `),
            })}
          >
            <Popup>
              <div className="text-sm">
                <strong>Selected Origin</strong>
                <br />
                Click map to change
              </div>
            </Popup>
          </Marker>
        )}

        {/* Isochrone polygons */}
        <IsochroneLayer data={isochroneData} />
      </MapContainer>
    </div>
  );
}
