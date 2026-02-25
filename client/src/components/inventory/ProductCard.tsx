import React, { memo } from 'react';
import { Product, InventoryItem } from '../../types';
import { getTotalQuantity, getLocationQuantity, needsReorder } from '../../utils/inventory';

interface ProductCardProps {
  product: Product;
  selectedLocation: string;
  onCardClick?: (product: Product, locationId: string) => void;
  onAdjustClick?: (inventoryItem: InventoryItem, productName: string) => void;
}

// Memoized component - only re-renders when props actually change
export const ProductCard = memo(function ProductCard({ product, selectedLocation, onCardClick, onAdjustClick }: ProductCardProps) {
  const isReorderNeeded = needsReorder(product);
  const showingAllLocations = selectedLocation === 'all';
  const unitLabel = product.unitSize || 'units';

  const displayQuantity = showingAllLocations
    ? getTotalQuantity(product)
    : getLocationQuantity(product, selectedLocation);

  // Calculate open vs sealed quantities
  const inventoryToShow = showingAllLocations
    ? product.inventoryItems
    : product.inventoryItems.filter(item => item.location.id === selectedLocation);

  const openQuantity = inventoryToShow
    .filter(item => item.status === 'OPEN')
    .reduce((sum, item) => sum + item.quantity, 0);

  const sealedQuantity = inventoryToShow
    .filter(item => item.status === 'SEALED')
    .reduce((sum, item) => sum + item.quantity, 0);

  const handleClick = () => {
    if (onCardClick) {
      onCardClick(product, selectedLocation);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`bg-dark-card p-3 rounded-lg shadow-lg border ${
        isReorderNeeded ? 'border-l-4 border-alert-red' : 'border-dark-border'
      } ${onCardClick ? 'cursor-pointer active:bg-gf-charcoal-700 transition-colors duration-150' : ''}`}
      style={{ minHeight: '44px' }}
    >
      <div className="flex justify-between items-start mb-1">
        <div className="flex-1">
          <h3 className="font-heading font-semibold text-sm text-dark-text-primary">{product.name}</h3>
          {product.sku && (
            <p className="text-xs text-dark-text-muted">SKU: {product.sku}</p>
          )}
        </div>
        <div className="text-right">
          {openQuantity > 0 && sealedQuantity > 0 ? (
            <div className="flex gap-2 justify-end items-baseline">
              <div className="text-right">
                <div className="text-base font-heading font-bold text-amber-400">
                  {openQuantity}
                </div>
                <div className="text-xs font-body text-amber-400/80">
                  open {unitLabel}
                </div>
              </div>
              <div className="text-dark-text-muted">+</div>
              <div className="text-right">
                <div className="text-base font-heading font-bold text-gf-green">
                  {sealedQuantity}
                </div>
                <div className="text-xs font-body text-gf-green-400">
                  sealed {unitLabel}
                </div>
              </div>
            </div>
          ) : openQuantity > 0 ? (
            <>
              <div className="text-xl font-heading font-bold text-amber-400">
                {openQuantity}
              </div>
              <div className="text-xs font-body text-amber-400/80">
                open {unitLabel}
              </div>
            </>
          ) : (
            <>
              <div className="text-xl font-heading font-bold text-dark-text-primary">
                {displayQuantity}
              </div>
              <div className="text-xs font-body text-dark-text-secondary">
                {unitLabel}
              </div>
            </>
          )}
        </div>
      </div>

      {showingAllLocations && product.inventoryItems.length > 0 && (
        <div className="mt-2 pt-2 border-t border-dark-border">
          <div className="text-xs text-dark-text-muted font-semibold mb-1">By Location:</div>
          <div className="space-y-1 text-xs">
            {Array.from(
              product.inventoryItems.reduce((map, item) => {
                const key = item.location.id;
                const summary = map.get(key) ?? {
                  locationName: item.location.name,
                  open: 0,
                  sealed: 0,
                };
                if (item.status === 'OPEN') {
                  summary.open += item.quantity;
                } else {
                  summary.sealed += item.quantity;
                }
                map.set(key, summary);
                return map;
              }, new Map<string, { locationName: string; open: number; sealed: number }>())
            ).map(([key, summary]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="font-semibold text-dark-text-secondary">{summary.locationName}</span>
                <span className="text-dark-text-muted">
                  {summary.open > 0 && (
                    <span className="text-amber-400">
                      {summary.open} open
                      {summary.sealed > 0 ? ' / ' : ''}
                    </span>
                  )}
                  {summary.sealed > 0 && (
                    <span className="text-gf-green">
                      {summary.sealed} sealed
                    </span>
                  )}
                  {summary.open === 0 && summary.sealed === 0 && <span>0</span>}
                </span>
              </div>
            ))}
          </div>
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
