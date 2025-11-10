import React, { memo } from 'react';
import { Location, InventoryItem } from '../../../types';

interface LocationPickerProps {
  locations: Location[];
  selectedLocationId: string | null;
  onLocationChange: (locationId: string) => void;
  label?: string;
  /** Optional: Show quantity available at each location */
  inventoryItems?: InventoryItem[];
  /** Optional: Disable locations (e.g., when quantity is 0 for transfers) */
  disabledLocationIds?: string[];
  disabled?: boolean;
}

/**
 * Reusable location picker with optional quantity display
 * Displays locations as a grid of buttons with 44px touch targets
 */
export const LocationPicker = memo(function LocationPicker({
  locations,
  selectedLocationId,
  onLocationChange,
  label = 'Location',
  inventoryItems = [],
  disabledLocationIds = [],
  disabled = false,
}: LocationPickerProps) {
  // Helper to get quantity at a specific location
  const getLocationQuantity = (locationId: string): number => {
    const item = inventoryItems.find((item) => item.location.id === locationId);
    return item?.quantity || 0;
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-dark-text-primary mb-2">
        {label}
      </label>
      <div className="grid grid-cols-3 gap-2">
        {locations.map((location) => {
          const quantity = getLocationQuantity(location.id);
          const isSelected = location.id === selectedLocationId;
          const isDisabled = disabled || disabledLocationIds.includes(location.id);

          return (
            <button
              key={location.id}
              type="button"
              onClick={() => !isDisabled && onLocationChange(location.id)}
              disabled={isDisabled}
              className={`
                flex flex-col items-center justify-center p-3 rounded-lg border transition-colors
                ${
                  isSelected
                    ? 'bg-gf-green border-gf-green-600 text-white'
                    : 'bg-dark-card border-dark-border text-dark-text-primary active:bg-gf-charcoal-700'
                }
                ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''}
              `}
              style={{ minHeight: '44px' }}
            >
              <span className="font-semibold text-sm">{location.name}</span>
              {inventoryItems.length > 0 && (
                <span
                  className={`text-xs mt-1 ${
                    isSelected ? 'text-white opacity-90' : 'text-dark-text-muted'
                  }`}
                >
                  {quantity} available
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});
