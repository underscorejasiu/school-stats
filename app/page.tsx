'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import L from 'leaflet';
import dynamic from 'next/dynamic';
import { School, TransportProfile, IsochroneResponse, SortMetric, SchoolWithPosition } from '@/lib/types';
import { isPointInIsochrone } from '@/lib/geometry';
import { getSortValue } from '@/lib/statistics';
import TransportSelector from './components/TransportSelector';
import TimeRangeSelector from './components/TimeRangeSelector';
import SchoolList from './components/SchoolList';
import SettingsModal from './components/SettingsModal';

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
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedOrigin, setSelectedOrigin] = useState<[number, number] | null>(null);
  const [transportMode, setTransportMode] = useState<TransportProfile>('driving-car');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customTime, setCustomTime] = useState<number | null>(null);
  const [rushHours, setRushHours] = useState<boolean>(true);
  const [isochroneData, setIsochroneData] = useState<IsochroneResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [sortMetric, setSortMetric] = useState<SortMetric>('last_4_years_avg_avg_all');
  const [rightPanelVisible, setRightPanelVisible] = useState(true);
  const [rightPanelWidth, setRightPanelWidth] = useState(384); // Default: w-96 = 384px
  const [filters, setFilters] = useState<{ isPublic: 'any' | 'true' | 'false'; isForYouth: 'any' | 'true' | 'false' }>({
    isPublic: 'any',
    isForYouth: 'true',
  });
  const [apiKey, setApiKey] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Load API key from localStorage on mount
  useEffect(() => {
    const storedApiKey = localStorage.getItem('openrouteservice_api_key') || '';
    setApiKey(storedApiKey);
  }, []);

  // Save API key to localStorage when it changes
  const handleApiKeyChange = useCallback((newApiKey: string) => {
    setApiKey(newApiKey);
    localStorage.setItem('openrouteservice_api_key', newApiKey);
  }, []);

  // Load schools on mount
  useEffect(() => {
    async function loadSchools() {
      try {
        const response = await fetch('/api/schools');
        if (!response.ok) {
          throw new Error('Failed to load schools');
        }
        const data = await response.json();
        setSchools(data);
      } catch (err) {
        console.error('Error loading schools:', err);
        setError('Failed to load schools data');
      } finally {
        setSchoolsLoading(false);
      }
    }
    loadSchools();
  }, []);

  const fetchIsochrones = useCallback(async () => {
    if (!selectedOrigin) {
      setIsochroneData(null);
      return;
    }

    // Use single preset or custom time (mutually exclusive)
    // Apply 35% reduction if rush hours is enabled
    let timeRange: number;
    if (selectedPreset !== null) {
      const adjustedMin = rushHours ? Math.round(selectedPreset * 0.65) : selectedPreset;
      timeRange = adjustedMin * 60;
    } else if (customTime !== null) {
      const adjustedMin = rushHours ? Math.round(customTime * 0.65) : customTime;
      timeRange = adjustedMin * 60;
    } else {
      setIsochroneData(null);
      return;
    }

    const timeRanges: number[] = [timeRange];

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
          apiKey: apiKey || undefined, // Only send if provided
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
  }, [selectedOrigin, transportMode, selectedPreset, customTime, rushHours]);

  const handlePresetSelect = (minutes: number) => {
    // If clicking the same preset, clear it; otherwise replace with new selection
    if (selectedPreset === minutes) {
      setSelectedPreset(null);
    } else {
      setSelectedPreset(minutes);
      setCustomTime(null); // Clear custom time when preset is selected
    }
  };

  // Filter visible schools based on isochrones and user filters
  const visibleSchools = useMemo(() => {
    let filtered = schools;

    // Apply isochrone filter
    if (isochroneData && isochroneData.features.length) {
      filtered = filtered.filter((school) =>
        isPointInIsochrone(school.coordinates, isochroneData)
      );
    }

    // Apply public school filter
    if (filters.isPublic !== 'any') {
      filtered = filtered.filter((school) => {
        if (filters.isPublic === 'true') {
          return school.public === 'Tak';
        } else {
          return school.public !== 'Tak';
        }
      });
    }

    // Apply "dla młodzieży" type filter
    if (filters.isForYouth !== 'any') {
      filtered = filtered.filter((school) => {
        const isForYouth = school.type === 'dla młodzieży';
        if (filters.isForYouth === 'true') {
          return isForYouth;
        } else {
          return !isForYouth;
        }
      });
    }

    return filtered;
  }, [schools, isochroneData, filters]);

  const handleMapReady = useCallback((map: L.Map) => {
    mapInstanceRef.current = map;
  }, []);

  const handleFocusSchool = useCallback((school: SchoolWithPosition) => {
    if (mapInstanceRef.current) {
      const [lng, lat] = school.coordinates;
      mapInstanceRef.current.setView([lat, lng], 16, {
        animate: true,
        duration: 0.5,
      });
    }
  }, []);

  const handleReset = useCallback(() => {
    setSelectedOrigin(null);
    setSelectedPreset(null);
    setCustomTime(null);
    setRushHours(false);
    setIsochroneData(null);
  }, []);

  // Sort and position schools based on selected metric
  const sortedSchoolsWithPositions = useMemo(() => {
    const schoolsWithValues = visibleSchools.map((school) => ({
      ...school,
      sortValue: getSortValue(school, sortMetric),
    }));

    // Sort descending (highest scores first), nulls go to the end
    const sorted = schoolsWithValues.sort((a, b) => {
      if (a.sortValue === null && b.sortValue === null) return 0;
      if (a.sortValue === null) return 1;
      if (b.sortValue === null) return -1;
      return b.sortValue - a.sortValue;
    });

    // Add positions
    return sorted.map((school, index) => ({
      ...school,
      position: index + 1,
    })) as SchoolWithPosition[];
  }, [visibleSchools, sortMetric]);

  return (
    <div className="flex flex-col h-screen w-full">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              School Stats - Isochrone Map
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Click on the map to select a position and view reachable areas
            </p>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            aria-label="Open settings"
            title="Settings"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
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
              selectedPreset={selectedPreset}
              customTime={customTime}
              onPresetSelect={handlePresetSelect}
              onCustomTimeChange={(time) => {
                setCustomTime(time);
                setSelectedPreset(null); // Clear preset when custom time is set
              }}
              rushHours={rushHours}
              onRushHoursChange={setRushHours}
              isLoading={isLoading}
              onApply={fetchIsochrones}
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

            {isochroneData && isochroneData.features.length > 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Schools in Range:
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {visibleSchools.length} of {schools.length} schools visible
                  <br />
                  <span className="text-gray-500">Showing only schools within isochrone areas</span>
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={handleReset}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-gray-600 dark:bg-gray-700 rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Reset Selection
              </button>
            </div>

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
          {schoolsLoading ? (
            <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
              <p className="text-gray-600 dark:text-gray-400">Loading schools...</p>
            </div>
          ) : (
            <Map
              schools={sortedSchoolsWithPositions}
              selectedOrigin={selectedOrigin}
              isochroneData={isochroneData}
              onOriginSelect={setSelectedOrigin}
              onMapReady={handleMapReady}
            />
          )}
        </main>

        {/* School List Panel */}
        {!schoolsLoading && (
          <SchoolList
            schools={sortedSchoolsWithPositions}
            sortMetric={sortMetric}
            onSortChange={setSortMetric}
            isVisible={rightPanelVisible}
            onToggleVisibility={() => setRightPanelVisible(!rightPanelVisible)}
            width={rightPanelWidth}
            onWidthChange={setRightPanelWidth}
            onFocusSchool={handleFocusSchool}
            filters={filters}
            onFiltersChange={setFilters}
          />
        )}
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        onApiKeyChange={handleApiKeyChange}
      />
    </div>
  );
}
