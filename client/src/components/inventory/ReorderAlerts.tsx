import React, { useState } from "react";
import { Product } from "../../types";
import { getTotalQuantity, getSupplierTypeLabel } from "../../utils/inventory";

interface ReorderAlertsProps {
  products: Product[];
}

export function ReorderAlerts({ products }: ReorderAlertsProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="bg-gf-green border-l-4 border-gf-green-400 p-4 rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-2 gap-4">
        <h2 className="font-heading font-bold text-white flex items-center gap-2">
          <span
            className="text-2xl"
            role="img"
            aria-label="Reorder warning"
          ></span>
          Reorder Alerts ({products.length})
        </h2>
        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="text-sm font-heading font-semibold text-white/85 hover:text-white border border-white/30 rounded px-3 py-1 transition-colors"
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? "Show" : "Hide"}
        </button>
      </div>

      {!isCollapsed && (
        <div className="space-y-2">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-dark-card p-3 rounded-lg shadow-lg border border-gf-green-600"
            >
              <div className="font-heading font-semibold text-dark-text-primary">
                {product.name}
              </div>
              <div className="text-sm font-body text-dark-text-secondary">
                Current: {getTotalQuantity(product)} | Reorder at:{" "}
                {product.reorderPoint}
              </div>
              <div className="text-xs font-body text-dark-text-muted mt-1">
                {getSupplierTypeLabel(product.supplierType)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
