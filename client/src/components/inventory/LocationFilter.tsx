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
    <div className="bg-dark-card p-4 rounded-lg shadow-lg border border-dark-border">
      <label
        htmlFor="location-filter"
        className="block text-sm font-heading font-semibold text-dark-text-primary mb-2"
      >
        Filter by Location
      </label>
      <select
        id="location-filter"
        value={selectedLocation}
        onChange={(e) => onLocationChange(e.target.value)}
        className="w-full p-3 border-2 border-dark-border rounded-lg text-base font-body text-dark-text-primary bg-gf-charcoal-700 focus:border-gf-green focus:outline-none focus:ring-2 focus:ring-gf-green-700 transition-colors"
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
