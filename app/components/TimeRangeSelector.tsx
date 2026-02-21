'use client';

interface TimeRangeSelectorProps {
  presets: number[];
  selectedPresets: number[];
  customTime: number | null;
  onPresetToggle: (minutes: number) => void;
  onCustomTimeChange: (minutes: number | null) => void;
}

const PRESET_OPTIONS = [5, 10, 15, 30, 60];

export default function TimeRangeSelector({
  presets,
  selectedPresets,
  customTime,
  onPresetToggle,
  onCustomTimeChange,
}: TimeRangeSelectorProps) {
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
              onClick={() => onPresetToggle(minutes)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                selectedPresets.includes(minutes)
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
          value={customTime ?? ''}
          onChange={(e) => {
            const value = e.target.value;
            onCustomTimeChange(value === '' ? null : parseInt(value, 10));
          }}
          placeholder="Enter custom time"
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}
