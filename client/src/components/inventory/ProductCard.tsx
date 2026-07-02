import React, { memo, useMemo } from 'react';
import { Product } from '../../types';
import { getTotalQuantity, getLocationQuantity, needsReorder } from '../../utils/inventory';

interface ProductCardProps {
  product: Product;
  selectedLocation: string;
  isEditable?: boolean;
  isPending?: boolean;
  errorMessage?: string | null;
  onIncrement?: (product: Product, locationId: string) => void;
  onDecrement?: (product: Product, locationId: string) => void;
}

export const ProductCard = memo(function ProductCard({
  product,
  selectedLocation,
  isEditable = false,
  isPending = false,
  errorMessage,
  onIncrement,
  onDecrement,
}: ProductCardProps) {
  const isReorderNeeded = needsReorder(product);
  const showingAllLocations = selectedLocation === 'all';
  const unitLabel = product.unitSize || 'units';
  const displayQuantity = showingAllLocations
    ? getTotalQuantity(product)
    : getLocationQuantity(product, selectedLocation);

  const inventoryByLocation = useMemo(() => {
    const totals = new Map<string, { name: string; quantity: number }>();

    for (const item of product.inventoryItems) {
      const existing = totals.get(item.location.id);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        totals.set(item.location.id, { name: item.location.name, quantity: item.quantity });
      }
    }

    return Array.from(totals.entries()).map(([locationId, entry]) => ({
      locationId,
      name: entry.name,
      quantity: entry.quantity,
    }));
  }, [product.inventoryItems]);

  const canDecrement = isEditable && displayQuantity > 0 && !isPending;
  const canIncrement = isEditable && !isPending;

  return (
    <div
      className={`bg-dark-card p-3 rounded-lg shadow-lg border ${
        isReorderNeeded ? 'border-l-4 border-alert-red' : 'border-dark-border'
      }`}
      style={{ minHeight: '44px' }}
    >
      <div className="flex justify-between items-start gap-3 mb-1">
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-semibold text-sm text-dark-text-primary">{product.name}</h3>
          {product.sku && (
            <p className="text-xs text-dark-text-muted">SKU: {product.sku}</p>
          )}
        </div>

        {isEditable ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onDecrement?.(product, selectedLocation)}
              disabled={!canDecrement}
              className="h-9 w-9 rounded-lg border border-dark-border text-lg font-bold text-dark-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              -
            </button>
            <div className="min-w-[3.5rem] text-center">
              <div className="text-xl font-heading font-bold text-dark-text-primary">
                {displayQuantity}
              </div>
              <div className="text-xs font-body text-dark-text-secondary">
                {isPending ? 'Saving...' : unitLabel}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onIncrement?.(product, selectedLocation)}
              disabled={!canIncrement}
              className="h-9 w-9 rounded-lg border border-dark-border text-lg font-bold text-dark-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              +
            </button>
          </div>
        ) : (
          <div className="text-right">
            <div className="text-xl font-heading font-bold text-dark-text-primary">
              {displayQuantity}
            </div>
            <div className="text-xs font-body text-dark-text-secondary">
              {unitLabel}
            </div>
          </div>
        )}
      </div>

      {showingAllLocations && inventoryByLocation.length > 0 && (
        <div className="mt-2 pt-2 border-t border-dark-border">
          <div className="text-xs text-dark-text-muted font-semibold mb-1">By Location:</div>
          <div className="space-y-1 text-xs">
            {inventoryByLocation.map((item) => (
              <div key={item.locationId} className="flex items-center justify-between">
                <span className="font-semibold text-dark-text-secondary">{item.name}</span>
                <span className="text-dark-text-primary">{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mt-2 text-xs text-alert-red">
          {errorMessage}
        </div>
      )}

      {isReorderNeeded && (
        <div className="mt-1 text-xs text-alert-red font-semibold flex items-center">
          <span className="text-base mr-1">!</span>
          Below reorder point ({product.reorderPoint})
        </div>
      )}
    </div>
  );
});
