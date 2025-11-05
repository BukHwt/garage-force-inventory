import React from 'react';
import { Location } from '../../types';

interface LocationFilterProps {
  locations: Location[];
  selectedLocation: string;
  onLocationChange: (locationId: string) => void;
}

export function LocationFilter({
  locations,
  selectedLocation,
  onLocationChange,
}: LocationFilterProps) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <label
        htmlFor="location-filter"
        className="block text-sm font-semibold text-gray-700 mb-2"
      >
        Filter by Location
      </label>
      <select
        id="location-filter"
        value={selectedLocation}
        onChange={(e) => onLocationChange(e.target.value)}
        className="w-full p-3 border border-gray-300 rounded-lg text-base"
        style={{ minHeight: '44px' }}
      >
        <option value="all">All Locations</option>
        {locations.map(loc => (
          <option key={loc.id} value={loc.id}>
            {loc.name}
          </option>
        ))}
      </select>
    </div>
  );
}
