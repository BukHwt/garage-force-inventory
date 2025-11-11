import React, { memo } from 'react';
import { Product, InventoryItem } from '../../types';
import { getTotalQuantity, getLocationQuantity, needsReorder } from '../../utils/inventory';

interface ProductCardProps {
  product: Product;
  selectedLocation: string;
  onCardClick?: (productId: string) => void;
  onAdjustClick?: (inventoryItem: InventoryItem, productName: string) => void;
  onUseOnJobClick?: (productId: string, locationId: string) => void;
}

// Memoized component - only re-renders when props actually change
export const ProductCard = memo(function ProductCard({ product, selectedLocation, onCardClick, onAdjustClick, onUseOnJobClick }: ProductCardProps) {
  const isReorderNeeded = needsReorder(product);
  const showingAllLocations = selectedLocation === 'all';

  const displayQuantity = showingAllLocations
    ? getTotalQuantity(product)
    : getLocationQuantity(product, selectedLocation);

  const handleClick = () => {
    if (onCardClick) {
      onCardClick(product.id);
    }
  };

  // Get category-specific colors
  const getCategoryColors = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('coating')) {
      return 'bg-category-coatings-bg text-category-coatings-text';
    } else if (name.includes('chip')) {
      return 'bg-category-chips-bg text-category-chips-text';
    } else if (name.includes('disposable')) {
      return 'bg-category-disposables-bg text-category-disposables-text';
    } else if (name.includes('equipment')) {
      return 'bg-category-equipment-bg text-category-equipment-text';
    }
    // Default fallback
    return 'bg-gf-charcoal-600 text-dark-text-primary';
  };

  return (
    <div
      onClick={handleClick}
      className={`bg-dark-card p-4 rounded-lg shadow-lg border ${
        isReorderNeeded ? 'border-l-4 border-alert-red' : 'border-dark-border'
      } ${onCardClick ? 'cursor-pointer active:bg-gf-charcoal-700 transition-colors duration-150' : ''}`}
      style={{ minHeight: '44px' }}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h3 className="font-heading font-semibold text-dark-text-primary">{product.name}</h3>
          {product.sku && (
            <p className="text-xs text-dark-text-muted">SKU: {product.sku}</p>
          )}
          {product.category && (
            <span className={`inline-block mt-1 px-2 py-1 text-xs rounded font-semibold ${getCategoryColors(product.category.name)}`}>
              {product.category.name}
            </span>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-heading font-bold text-dark-text-primary">
            {displayQuantity}
          </div>
          <div className="text-xs font-body text-dark-text-secondary">
            {product.unitSize || 'units'}
          </div>
        </div>
      </div>

      {/* Location breakdown when showing all locations */}
      {showingAllLocations && product.inventoryItems.length > 0 && (
        <div className="mt-3 pt-3 border-t border-dark-border">
          <div className="text-xs text-dark-text-muted font-semibold mb-1">By Location:</div>
          <div className="grid grid-cols-3 gap-2">
            {product.inventoryItems.map(item => (
              <div key={item.id} className="text-xs">
                <div className="font-semibold text-dark-text-secondary">{item.location.name}</div>
                <div className="text-dark-text-muted">{item.quantity}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons when viewing specific location */}
      {!showingAllLocations && product.inventoryItems.length > 0 && (
        <div className="mt-3 pt-3 border-t border-dark-border">
          {product.inventoryItems
            .filter(item => item.location.id === selectedLocation)
            .map(item => (
              <div key={item.id} className="flex gap-2">
                {/* Use on Job button */}
                {onUseOnJobClick && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUseOnJobClick(product.id, selectedLocation);
                    }}
                    className="flex-1 bg-gf-green border border-gf-green-600 text-white font-heading font-semibold py-3 px-4 rounded-lg active:bg-gf-green-700 transition-colors flex items-center justify-center gap-2"
                    style={{ minHeight: '44px' }}
                  >
                    <span className="text-lg">🔧</span>
                    <span>Use on Job</span>
                  </button>
                )}
                {/* Adjust Quantity button */}
                {onAdjustClick && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAdjustClick(item, product.name);
                    }}
                    className="flex-1 bg-gf-charcoal-600 border border-gf-charcoal-500 text-white font-heading font-semibold py-3 px-4 rounded-lg active:bg-gf-charcoal-700 transition-colors flex items-center justify-center gap-2"
                    style={{ minHeight: '44px' }}
                  >
                    <span className="text-lg">⚖️</span>
                    <span>Adjust</span>
                  </button>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Reorder warning */}
      {isReorderNeeded && (
        <div className="mt-2 text-xs text-alert-red font-semibold flex items-center">
          <span className="text-base mr-1">⚠️</span>
          Below reorder point ({product.reorderPoint})
        </div>
      )}
    </div>
  );
});
