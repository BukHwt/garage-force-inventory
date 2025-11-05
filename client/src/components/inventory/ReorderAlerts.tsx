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
    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow">
      <h2 className="font-bold text-red-800 mb-2 flex items-center">
        <span className="text-2xl mr-2">⚠️</span>
        Reorder Alerts ({products.length})
      </h2>
      <div className="space-y-2">
        {products.map(product => (
          <div key={product.id} className="bg-white p-3 rounded">
            <div className="font-semibold text-gray-800">{product.name}</div>
            <div className="text-sm text-gray-600">
              Current: {getTotalQuantity(product)} | Reorder at: {product.reorderPoint}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {getSupplierTypeLabel(product.supplierType)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
