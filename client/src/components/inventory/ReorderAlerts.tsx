import React from 'react';
import { Product } from '../../types';
import { getTotalQuantity, getSupplierTypeLabel } from '../../utils/inventory';

interface ReorderAlertsProps {
  products: Product[];
}

export function ReorderAlerts({ products }: ReorderAlertsProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <div className="bg-gf-red-50 border-l-4 border-gf-red p-4 rounded-lg shadow-md">
      <h2 className="font-heading font-bold text-gf-red-800 mb-2 flex items-center">
        <span className="text-2xl mr-2">⚠️</span>
        Reorder Alerts ({products.length})
      </h2>
      <div className="space-y-2">
        {products.map(product => (
          <div key={product.id} className="bg-white p-3 rounded-lg shadow-sm">
            <div className="font-heading font-semibold text-gf-charcoal">{product.name}</div>
            <div className="text-sm font-body text-gf-gray">
              Current: {getTotalQuantity(product)} | Reorder at: {product.reorderPoint}
            </div>
            <div className="text-xs font-body text-gf-gray mt-1">
              {getSupplierTypeLabel(product.supplierType)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
