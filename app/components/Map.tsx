'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, GeoJSON, useMap } from 'react-leaflet';
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
  onMapReady?: (map: L.Map) => void;
  onSetNewOrigin?: (coordinates: [number, number]) => void;
  onResetSelection?: () => void;
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

function IsochroneLayer({ 
  data, 
  onSetNewOrigin, 
  onResetSelection 
}: { 
  data: IsochroneResponse | null;
  onSetNewOrigin?: (coordinates: [number, number]) => void;
  onResetSelection?: () => void;
}) {
  const map = useMap();
  
  if (!data) return null;

  // Create a unique key based on the data to force re-render when data changes
  // Include both time values and first coordinate to detect origin changes
  const dataKey = JSON.stringify({
    times: data.features.map(f => f.properties.value).sort(),
    firstCoord: data.features[0]?.geometry.coordinates[0]?.[0] || [],
  });

  // Helper function to calculate center of polygon
  const getPolygonCenter = (coordinates: number[][][]): [number, number] => {
    // Get the first ring (outer boundary) of the polygon
    const ring = coordinates[0];
    let sumLat = 0;
    let sumLng = 0;
    for (const coord of ring) {
      sumLng += coord[0];
      sumLat += coord[1];
    }
    return [sumLng / ring.length, sumLat / ring.length];
  };

  return (
    <>
      {data.features.map((feature, index) => {
        const timeSeconds = feature.properties.value;
        const color = getColorForTime(timeSeconds);
        const minutes = Math.round(timeSeconds / 60);
        
        // Get center coordinates - use property center if available, otherwise calculate
        const center: [number, number] = feature.properties.center 
          ? [feature.properties.center[0], feature.properties.center[1]]
          : getPolygonCenter(feature.geometry.coordinates);

        return (
          <GeoJSON
            key={`${dataKey}-${index}-${timeSeconds}-${center[0]}-${center[1]}`}
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
              <div className="text-sm space-y-2">
                <div className="font-medium mb-2">
                  <strong>{minutes} minutes</strong> reachable area
                </div>
                {onSetNewOrigin && (
                  <button
                    onClick={() => {
                      onSetNewOrigin(center);
                      map.closePopup();
                    }}
                    className="w-full px-3 py-1.5 text-xs font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
                  >
                    Set as new origin point
                  </button>
                )}
                {onResetSelection && (
                  <button
                    onClick={() => {
                      onResetSelection();
                      map.closePopup();
                    }}
                    className="w-full px-3 py-1.5 text-xs font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 transition-colors"
                  >
                    Reset Selection
                  </button>
                )}
              </div>
            </Popup>
          </GeoJSON>
        );
      })}
    </>
  );
}

function MapInstance({ onMapReady }: { onMapReady?: (map: L.Map) => void }) {
  const map = useMap();
  
  useEffect(() => {
    if (map && onMapReady) {
      onMapReady(map);
    }
  }, [map, onMapReady]);
  
  return null;
}

function OriginPopupContent({
  selectedOrigin,
  onSetNewOrigin,
  onResetSelection,
}: {
  selectedOrigin: [number, number];
  onSetNewOrigin?: (coordinates: [number, number]) => void;
  onResetSelection?: () => void;
}) {
  const map = useMap();
  
  return (
    <div className="text-sm space-y-2">
      <div className="font-medium mb-2">
        <strong>Selected Origin</strong>
      </div>
      {onSetNewOrigin && (
        <button
          onClick={() => {
            onSetNewOrigin(selectedOrigin);
            map.closePopup();
          }}
          className="w-full px-3 py-1.5 text-xs font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
        >
          Set as new origin point
        </button>
      )}
      {onResetSelection && (
        <button
          onClick={() => {
            onResetSelection();
            map.closePopup();
          }}
          className="w-full px-3 py-1.5 text-xs font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 transition-colors"
        >
          Reset Selection
        </button>
      )}
    </div>
  );
}

export default function Map({ 
  schools, 
  selectedOrigin, 
  isochroneData, 
  onOriginSelect, 
  onMapReady,
  onSetNewOrigin,
  onResetSelection,
}: MapProps) {
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
        
        <MapInstance onMapReady={onMapReady} />
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
              <OriginPopupContent
                selectedOrigin={selectedOrigin}
                onSetNewOrigin={onSetNewOrigin}
                onResetSelection={onResetSelection}
              />
            </Popup>
          </Marker>
        )}

        {/* Isochrone polygons */}
        <IsochroneLayer 
          key={isochroneData && selectedOrigin ? JSON.stringify({
            times: isochroneData.features.map(f => f.properties.value).sort(),
            origin: selectedOrigin, // Include origin to force re-render when origin changes
          }) : 'no-data'} 
          data={isochroneData}
          onSetNewOrigin={onSetNewOrigin}
          onResetSelection={onResetSelection}
        />
      </MapContainer>
    </div>
  );
}
