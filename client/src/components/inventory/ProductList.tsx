import React from 'react';
import { Product, Location } from '../../types';
import { ProductCard } from './ProductCard';
import { EmptyState } from '../common/EmptyState';

interface ProductListProps {
  products: Product[];
  selectedLocation: string;
  locations: Location[];
  onProductClick?: (productId: string) => void;
}

export function ProductList({
  products,
  selectedLocation,
  locations,
  onProductClick,
}: ProductListProps) {
  const locationName = selectedLocation !== 'all'
    ? locations.find(l => l.id === selectedLocation)?.name
    : null;

  return (
    <div className="space-y-3">
      <h2 className="font-bold text-gray-800 text-lg">
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
