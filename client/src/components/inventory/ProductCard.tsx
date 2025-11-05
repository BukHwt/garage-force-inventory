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
      className={`bg-white p-4 rounded shadow ${
        isReorderNeeded ? 'border-l-4 border-red-500' : ''
      } ${onCardClick ? 'cursor-pointer active:bg-gray-50' : ''}`}
      style={{ minHeight: '44px' }}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800">{product.name}</h3>
          {product.sku && (
            <p className="text-xs text-gray-500">SKU: {product.sku}</p>
          )}
          {product.category && (
            <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
              {product.category.name}
            </span>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-800">
            {displayQuantity}
          </div>
          <div className="text-xs text-gray-500">
            {product.unitSize || 'units'}
          </div>
        </div>
      </div>

      {/* Location breakdown when showing all locations */}
      {showingAllLocations && product.inventoryItems.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-600 font-semibold mb-1">By Location:</div>
          <div className="grid grid-cols-3 gap-2">
            {product.inventoryItems.map(item => (
              <div key={item.id} className="text-xs">
                <div className="font-semibold text-gray-700">{item.location.name}</div>
                <div className="text-gray-600">{item.quantity}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reorder warning */}
      {isReorderNeeded && (
        <div className="mt-2 text-xs text-red-600 font-semibold">
          ⚠️ Below reorder point ({product.reorderPoint})
        </div>
      )}
    </div>
  );
}
