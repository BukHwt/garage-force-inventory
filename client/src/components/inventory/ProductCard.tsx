import React from 'react';
import { Product } from '../../types';
import { getTotalQuantity, getLocationQuantity, needsReorder } from '../../utils/inventory';

interface ProductCardProps {
  product: Product;
  selectedLocation: string;
  onCardClick?: (productId: string) => void;
}

export function ProductCard({ product, selectedLocation, onCardClick }: ProductCardProps) {
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

  return (
    <div
      onClick={handleClick}
      className={`bg-white p-4 rounded-lg shadow-md ${
        isReorderNeeded ? 'border-l-4 border-gf-red' : ''
      } ${onCardClick ? 'cursor-pointer active:bg-gf-gray-light transition-colors duration-150' : ''}`}
      style={{ minHeight: '44px' }}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h3 className="font-heading font-semibold text-gf-charcoal">{product.name}</h3>
          {product.sku && (
            <p className="text-xs text-gf-gray">SKU: {product.sku}</p>
          )}
          {product.category && (
            <span className="inline-block mt-1 px-2 py-1 bg-gf-red-50 text-gf-red-700 text-xs rounded font-semibold">
              {product.category.name}
            </span>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-heading font-bold text-gf-charcoal">
            {displayQuantity}
          </div>
          <div className="text-xs font-body text-gf-gray">
            {product.unitSize || 'units'}
          </div>
        </div>
      </div>

      {/* Location breakdown when showing all locations */}
      {showingAllLocations && product.inventoryItems.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gf-charcoal-100">
          <div className="text-xs text-gf-gray font-semibold mb-1">By Location:</div>
          <div className="grid grid-cols-3 gap-2">
            {product.inventoryItems.map(item => (
              <div key={item.id} className="text-xs">
                <div className="font-semibold text-gf-charcoal-600">{item.location.name}</div>
                <div className="text-gf-gray">{item.quantity}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reorder warning */}
      {isReorderNeeded && (
        <div className="mt-2 text-xs text-gf-red font-semibold">
          ⚠️ Below reorder point ({product.reorderPoint})
        </div>
      )}
    </div>
  );
}
