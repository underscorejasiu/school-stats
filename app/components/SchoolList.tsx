'use client';

import { useState, useEffect, useRef } from 'react';
import { SchoolWithPosition, SortMetric } from '@/lib/types';
import { getSortMetricLabel, getLast4YearsAverages } from '@/lib/statistics';

interface SchoolListProps {
  schools: SchoolWithPosition[];
  sortMetric: SortMetric;
  onSortChange: (metric: SortMetric) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
  width: number;
  onWidthChange: (width: number) => void;
  onFocusSchool?: (school: SchoolWithPosition) => void;
}

const SORT_OPTIONS: SortMetric[] = [
  'last_year_avg_all',
  'last_year_avg_polish',
  'last_year_avg_math',
  'last_year_avg_english',
  'last_year_median_all',
  'last_year_median_polish',
  'last_year_median_math',
  'last_year_median_english',
  'last_year_modal_all',
  'last_year_modal_polish',
  'last_year_modal_math',
  'last_year_modal_english',
  'last_4_years_avg_avg_all',
  'last_4_years_avg_avg_polish',
  'last_4_years_avg_avg_math',
  'last_4_years_avg_avg_english',
  'last_4_years_avg_median_all',
  'last_4_years_avg_median_polish',
  'last_4_years_avg_median_math',
  'last_4_years_avg_median_english',
];

export default function SchoolList({
  schools,
  sortMetric,
  onSortChange,
  isVisible,
  onToggleVisibility,
  width,
  onWidthChange,
  onFocusSchool,
}: SchoolListProps) {
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set());
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startWidth: width,
    };
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current || !panelRef.current) return;
      
      // Cancel any pending animation frame
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      
      // Use requestAnimationFrame for smooth updates
      rafRef.current = requestAnimationFrame(() => {
        if (!resizeRef.current || !panelRef.current) return;
        
        const deltaX = resizeRef.current.startX - e.clientX; // Inverted because we're dragging from right side
        const newWidth = Math.max(320, Math.min(800, resizeRef.current.startWidth + deltaX)); // Min 320px, max 800px
        
        // Update DOM directly for immediate visual feedback
        panelRef.current.style.width = `${newWidth}px`;
        
        // Update state (throttled - only on animation frame)
        onWidthChange(newWidth);
      });
    };

    const handleMouseUp = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setIsResizing(false);
      resizeRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.body.style.pointerEvents = 'none';
    if (panelRef.current) {
      panelRef.current.style.pointerEvents = 'auto';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.pointerEvents = '';
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isResizing, onWidthChange, width]);

  const toggleExpand = (schoolId: string) => {
    setExpandedSchools((prev) => {
      const next = new Set(prev);
      if (next.has(schoolId)) {
        next.delete(schoolId);
      } else {
        next.add(schoolId);
      }
      return next;
    });
  };

  const formatValue = (value: number | null): string => {
    if (value === null) return 'N/A';
    return value.toFixed(1);
  };

  const getYearlyResults = (school: SchoolWithPosition) => {
    if (!school.yearly_results) return [];
    return Object.keys(school.yearly_results)
      .sort((a, b) => parseInt(b) - parseInt(a))
      .map((year) => ({
        year,
        data: school.yearly_results![year],
      }));
  };

  if (!isVisible) {
    return (
      <button
        onClick={onToggleVisibility}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-50 bg-blue-500 text-white px-2 py-8 rounded-l-lg shadow-lg hover:bg-blue-600 transition-colors"
        aria-label="Show school list"
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
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    );
  }

  return (
    <aside
      ref={(el) => { panelRef.current = el; }}
      className="bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col relative"
      style={{ 
        width: `${width}px`,
        transition: isResizing ? 'none' : 'width 0.2s ease-out'
      }}
    >
      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors z-10 ${
          isResizing ? 'bg-blue-500' : 'bg-transparent'
        }`}
        style={{ cursor: 'col-resize' }}
      />
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Schools ({schools.length})
        </h2>
        <button
          onClick={onToggleVisibility}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          aria-label="Hide school list"
        >
          <svg
            className="w-5 h-5 text-gray-600 dark:text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      {/* Sort Selector */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Sort by:
        </label>
        <select
          value={sortMetric}
          onChange={(e) => onSortChange(e.target.value as SortMetric)}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {getSortMetricLabel(option)}
            </option>
          ))}
        </select>
      </div>

      {/* School List */}
      <div className="flex-1 overflow-y-auto">
        {schools.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            No schools to display
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {schools.map((school) => {
              const isExpanded = expandedSchools.has(school.id);
              const yearlyResults = getYearlyResults(school);
              const fourYearAverages = getLast4YearsAverages(school);

              return (
                <div
                  key={school.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {/* School Header */}
                  <div
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => toggleExpand(school.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                          {school.position}
                        </span>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {school.name}
                        </h3>
                      </div>
                      {school.sortValue !== null && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 ml-8">
                          Score: {formatValue(school.sortValue)}
                        </p>
                      )}
                    </div>
                    <button
                      className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(school.id);
                      }}
                    >
                      <svg
                        className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-3 ml-8 space-y-3 text-xs">
                      {school.address && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              Address:
                            </span>{' '}
                            <span className="text-gray-600 dark:text-gray-400">
                              {school.address}
                            </span>
                          </div>
                          {onFocusSchool && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onFocusSchool(school);
                              }}
                              className="flex-shrink-0 p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900 rounded transition-colors"
                              title="Focus on map"
                              aria-label="Focus on map"
                            >
                              <svg
                                className="w-4 h-4 text-blue-600 dark:text-blue-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                      {school.type && (
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            Type:
                          </span>{' '}
                          <span className="text-gray-600 dark:text-gray-400">
                            {school.type}
                          </span>
                        </div>
                      )}

                      {/* Last 4 Years Averages */}
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Last 4 Years Average:
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">All:</span>{' '}
                            <span className="font-medium">
                              {formatValue(fourYearAverages.all)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Polish:</span>{' '}
                            <span className="font-medium">
                              {formatValue(fourYearAverages.polish)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Math:</span>{' '}
                            <span className="font-medium">
                              {formatValue(fourYearAverages.math)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">English:</span>{' '}
                            <span className="font-medium">
                              {formatValue(fourYearAverages.english)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Year-by-Year Breakdown */}
                      {yearlyResults.length > 0 && (
                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                          <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Year-by-Year:
                          </div>
                          <div className="space-y-2">
                            {yearlyResults.map(({ year, data }) => (
                              <div
                                key={year}
                                className="bg-gray-50 dark:bg-gray-800 p-2 rounded"
                              >
                                <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  {year}
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  {data.polish && (
                                    <div>
                                      <span className="text-gray-600 dark:text-gray-400">P:</span>{' '}
                                      {formatValue(data.polish.average_result)}
                                    </div>
                                  )}
                                  {data.math && (
                                    <div>
                                      <span className="text-gray-600 dark:text-gray-400">M:</span>{' '}
                                      {formatValue(data.math.average_result)}
                                    </div>
                                  )}
                                  {data.english && (
                                    <div>
                                      <span className="text-gray-600 dark:text-gray-400">E:</span>{' '}
                                      {formatValue(data.english.average_result)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
