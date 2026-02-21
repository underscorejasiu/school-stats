'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { schools } from '@/lib/schools';
import { TransportProfile, IsochroneResponse } from '@/lib/types';
import TransportSelector from './components/TransportSelector';
import TimeRangeSelector from './components/TimeRangeSelector';

// Dynamically import Map component to avoid SSR issues
const Map = dynamic(() => import('./components/Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
      <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
    </div>
  ),
});

export default function Home() {
  const [selectedOrigin, setSelectedOrigin] = useState<[number, number] | null>(null);
  const [transportMode, setTransportMode] = useState<TransportProfile>('driving-car');
  const [selectedPresets, setSelectedPresets] = useState<number[]>([]);
  const [customTime, setCustomTime] = useState<number | null>(null);
  const [isochroneData, setIsochroneData] = useState<IsochroneResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIsochrones = useCallback(async () => {
    if (!selectedOrigin) {
      setIsochroneData(null);
      return;
    }

    // Combine presets and custom time, convert to seconds
    const timeRanges: number[] = [
      ...selectedPresets.map((min) => min * 60),
      ...(customTime ? [customTime * 60] : []),
    ];

    if (timeRanges.length === 0) {
      setIsochroneData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/isochrones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coordinates: selectedOrigin,
          profile: transportMode,
          ranges: timeRanges,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch isochrones');
      }

      const data: IsochroneResponse = await response.json();
      setIsochroneData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsochroneData(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedOrigin, transportMode, selectedPresets, customTime]);

  useEffect(() => {
    fetchIsochrones();
  }, [fetchIsochrones]);

  const handlePresetToggle = (minutes: number) => {
    setSelectedPresets((prev) =>
      prev.includes(minutes) ? prev.filter((m) => m !== minutes) : [...prev, minutes]
    );
  };

  return (
    <div className="flex flex-col h-screen w-full">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          School Stats - Isochrone Map
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Click on the map to select a position and view reachable areas
        </p>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Controls Panel */}
        <aside className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-4 overflow-y-auto">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Settings
              </h2>
            </div>

            <TransportSelector value={transportMode} onChange={setTransportMode} />

            <TimeRangeSelector
              presets={selectedPresets}
              selectedPresets={selectedPresets}
              customTime={customTime}
              onPresetToggle={handlePresetToggle}
              onCustomTimeChange={setCustomTime}
            />

            {selectedOrigin && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Selected Origin:
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Lat: {selectedOrigin[1].toFixed(4)}, Lng: {selectedOrigin[0].toFixed(4)}
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            {isLoading && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  Loading isochrones...
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <strong>Instructions:</strong>
                <br />
                1. Click anywhere on the map to set the origin point
                <br />
                2. Select transport method
                <br />
                3. Choose time range presets or enter custom time
                <br />
                4. Colored polygons show reachable areas
              </p>
            </div>
          </div>
        </aside>

        {/* Map */}
        <main className="flex-1 relative">
          <Map
            schools={schools}
            selectedOrigin={selectedOrigin}
            isochroneData={isochroneData}
            onOriginSelect={setSelectedOrigin}
          />
        </main>
      </div>
    </div>
  );
}
