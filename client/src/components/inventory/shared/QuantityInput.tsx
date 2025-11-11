import React, { memo } from 'react';

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  disabled?: boolean;
}

/**
 * Reusable quantity input with quick adjustment buttons
 * Optimized for mobile with 44px touch targets
 */
export const QuantityInput = memo(function QuantityInput({
  value,
  onChange,
  min = 0,
  max = Infinity,
  label = 'Quantity',
  disabled = false,
}: QuantityInputProps) {
  const handleQuickAdjust = (amount: number) => {
    const newValue = Math.max(min, Math.min(max, value + amount));
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value) || 0;
    onChange(Math.max(min, Math.min(max, newValue)));
  };

  const isAtMin = value <= min;
  const isAtMax = value >= max;

  return (
    <div>
      <label className="block text-sm font-semibold text-dark-text-primary mb-2">
        {label}
      </label>

      {/* Main quantity input */}
      <div className="flex items-center gap-3 mb-3">
        <input
          type="number"
          value={value}
          onChange={handleInputChange}
          disabled={disabled}
          min={min}
          max={max}
          className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-gf-green disabled:opacity-50"
          style={{ minHeight: '44px' }}
        />
      </div>

      {/* Quick adjustment buttons */}
      <div className="grid grid-cols-6 gap-2">
        <button
          type="button"
          onClick={() => handleQuickAdjust(-1)}
          disabled={disabled || isAtMin}
          className="bg-alert-red border border-alert-red text-white font-semibold py-2 px-3 rounded-lg active:bg-red-700 transition-colors disabled:opacity-30 disabled:active:bg-alert-red"
          style={{ minHeight: '44px' }}
        >
          -1
        </button>
        <button
          type="button"
          onClick={() => handleQuickAdjust(1)}
          disabled={disabled || isAtMax}
          className="bg-gf-green border border-gf-green-600 text-white font-semibold py-2 px-3 rounded-lg active:bg-gf-green-700 transition-colors disabled:opacity-30 disabled:active:bg-gf-green"
          style={{ minHeight: '44px' }}
        >
          +1
        </button>
        <button
          type="button"
          onClick={() => handleQuickAdjust(5)}
          disabled={disabled || isAtMax}
          className="bg-gf-green border border-gf-green-600 text-white font-semibold py-2 px-3 rounded-lg active:bg-gf-green-700 transition-colors disabled:opacity-30 disabled:active:bg-gf-green"
          style={{ minHeight: '44px' }}
        >
          +5
        </button>
        <button
          type="button"
          onClick={() => handleQuickAdjust(10)}
          disabled={disabled || isAtMax}
          className="bg-gf-green border border-gf-green-600 text-white font-semibold py-2 px-3 rounded-lg active:bg-gf-green-700 transition-colors disabled:opacity-30 disabled:active:bg-gf-green"
          style={{ minHeight: '44px' }}
        >
          +10
        </button>
        <button
          type="button"
          onClick={() => handleQuickAdjust(25)}
          disabled={disabled || isAtMax}
          className="bg-gf-green border border-gf-green-600 text-white font-semibold py-2 px-3 rounded-lg active:bg-gf-green-700 transition-colors disabled:opacity-30 disabled:active:bg-gf-green"
          style={{ minHeight: '44px' }}
        >
          +25
        </button>
        <button
          type="button"
          onClick={() => handleQuickAdjust(50)}
          disabled={disabled || isAtMax}
          className="bg-gf-green border border-gf-green-600 text-white font-semibold py-2 px-3 rounded-lg active:bg-gf-green-700 transition-colors disabled:opacity-30 disabled:active:bg-gf-green"
          style={{ minHeight: '44px' }}
        >
          +50
        </button>
      </div>
    </div>
  );
});
