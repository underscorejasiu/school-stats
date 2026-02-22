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
  const [selectedPresets, setSelectedPresets] = useState<number[]>([]);
  const [customTime, setCustomTime] = useState<number | null>(null);
  const [isochroneData, setIsochroneData] = useState<IsochroneResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [sortMetric, setSortMetric] = useState<SortMetric>('last_4_years_avg_avg_all');
  const [rightPanelVisible, setRightPanelVisible] = useState(true);
  const [rightPanelWidth, setRightPanelWidth] = useState(384); // Default: w-96 = 384px
  const [filters, setFilters] = useState<{ isPublic: 'any' | 'true' | 'false'; isForYouth: 'any' | 'true' | 'false' }>({
    isPublic: 'any',
    isForYouth: 'any',
  });
  const mapInstanceRef = useRef<L.Map | null>(null);

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
    </div>
  );
}
