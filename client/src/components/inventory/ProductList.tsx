import React from 'react';
import { Product, Location, InventoryItem } from '../../types';
import { ProductCard } from './ProductCard';
import { EmptyState } from '../common/EmptyState';

interface ProductListProps {
  products: Product[];
  selectedLocation: string;
  locations: Location[];
  onProductClick?: (productId: string) => void;
  onAdjustClick?: (inventoryItem: InventoryItem, productName: string) => void;
}

export function ProductList({
  products,
  selectedLocation,
  locations,
  onProductClick,
  onAdjustClick,
}: ProductListProps) {
  const locationName = selectedLocation !== 'all'
    ? locations.find(l => l.id === selectedLocation)?.name
    : null;

  return (
    <div className="space-y-3">
      <h2 className="font-bold text-dark-text-primary text-lg">
        Inventory {locationName && `- ${locationName}`}
      </h2>

      {products.length === 0 ? (
        <EmptyState message="No products found. Add some products to get started!" />
      ) : (
        <div className="space-y-3">
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              selectedLocation={selectedLocation}
              onCardClick={onProductClick}
              onAdjustClick={onAdjustClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
