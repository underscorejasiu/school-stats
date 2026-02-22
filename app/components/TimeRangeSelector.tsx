'use client';

import { useState, useEffect } from 'react';

interface TimeRangeSelectorProps {
  selectedPreset: number | null;
  customTime: number | null;
  onPresetSelect: (minutes: number) => void;
  onCustomTimeChange: (minutes: number | null) => void;
  rushHours: boolean;
  onRushHoursChange: (rushHours: boolean) => void;
  isLoading: boolean;
  onApply: () => void;
}

const PRESET_OPTIONS = [5, 10, 15, 30, 60];

export default function TimeRangeSelector({
  selectedPreset,
  customTime,
  onPresetSelect,
  onCustomTimeChange,
  rushHours,
  onRushHoursChange,
  isLoading,
  onApply,
}: TimeRangeSelectorProps) {
  const [pendingCustomTime, setPendingCustomTime] = useState<string>(customTime?.toString() ?? '');

  // Sync local state when customTime changes externally
  useEffect(() => {
    setPendingCustomTime(customTime?.toString() ?? '');
  }, [customTime]);

  const handleCustomTimeChange = (value: string) => {
    setPendingCustomTime(value);
    // Update parent state immediately when typing
    if (value === '') {
      onCustomTimeChange(null);
    } else {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue) && numValue >= 1 && numValue <= 120) {
        onCustomTimeChange(numValue);
      }
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Time Ranges (minutes)
      </label>
      
      <div>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Presets:</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_OPTIONS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => onPresetSelect(minutes)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                selectedPreset === minutes
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {minutes} min
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
          Custom Time (minutes):
        </label>
        <input
          type="number"
          min="1"
          max="120"
          value={pendingCustomTime}
          onChange={(e) => handleCustomTimeChange(e.target.value)}
          placeholder="Enter custom time"
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="rush-hours"
          checked={rushHours}
          onChange={(e) => onRushHoursChange(e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
        />
        <label
          htmlFor="rush-hours"
          className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
        >
          Rush hours
        </label>
      </div>

      <button
        type="button"
        onClick={onApply}
        disabled={isLoading || (selectedPreset === null && customTime === null)}
        className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400"
      >
        {isLoading ? 'Loading...' : 'Apply'}
      </button>
    </div>
  );
}
