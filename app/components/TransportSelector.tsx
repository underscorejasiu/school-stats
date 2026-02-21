'use client';

import { TransportProfile } from '@/lib/types';

interface TransportSelectorProps {
  value: TransportProfile;
  onChange: (profile: TransportProfile) => void;
}

const transportOptions: { value: TransportProfile; label: string }[] = [
  { value: 'driving-car', label: '🚗 Driving' },
  { value: 'foot-walking', label: '🚶 Walking' },
  { value: 'cycling-regular', label: '🚴 Cycling' },
];

export default function TransportSelector({ value, onChange }: TransportSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Transport Method
      </label>
      <div className="flex flex-col gap-2">
        {transportOptions.map((option) => (
          <label
            key={option.value}
            className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <input
              type="radio"
              name="transport"
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange(e.target.value as TransportProfile)}
              className="mr-3"
            />
            <span className="text-sm">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
