import React, { memo, useEffect, useMemo, useState } from 'react';
import { Product } from '../../../types';

interface ProductPickerProps {
  products: Product[];
  selectedProductId: string;
  onProductChange: (productId: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  showInStockToggle?: boolean;
  defaultInStockOnly?: boolean;
}

const RECENT_PRODUCTS_STORAGE_KEY = 'gf.recentManageProductIds';
const RECENT_PRODUCTS_LIMIT = 8;

function includesText(value: string | undefined, search: string) {
  if (!value) {
    return false;
  }
  return value.toLowerCase().includes(search);
}

function getTotalQuantity(product: Product) {
  return product.inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
}

export const ProductPicker = memo(function ProductPicker({
  products,
  selectedProductId,
  onProductChange,
  label = 'Product',
  placeholder = 'Search products...',
  disabled = false,
  showInStockToggle = false,
  defaultInStockOnly = false,
}: ProductPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [inStockOnly, setInStockOnly] = useState(defaultInStockOnly);
  const [recentProductIds, setRecentProductIds] = useState<string[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setInStockOnly(defaultInStockOnly);
  }, [defaultInStockOnly]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_PRODUCTS_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return;
      }
      setRecentProductIds(parsed.filter((id): id is string => typeof id === 'string'));
    } catch {
      setRecentProductIds([]);
    }
  }, []);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) || null,
    [products, selectedProductId],
  );

  const availableProducts = useMemo(() => {
    if (!inStockOnly) {
      return products;
    }
    return products.filter((product) => getTotalQuantity(product) > 0);
  }, [products, inStockOnly]);

  const filteredProducts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) {
      return availableProducts;
    }
    return availableProducts.filter((product) =>
      includesText(product.name, search) ||
      includesText(product.sku, search) ||
      includesText(product.vendorPartNumber, search),
    );
  }, [availableProducts, searchTerm]);

  const groupedProducts = useMemo(() => {
    const groups = new Map<string, { key: string; name: string; products: Product[] }>();
    for (const product of filteredProducts) {
      const key = product.category?.id || '__uncategorized__';
      const name = product.category?.name || 'Uncategorized';
      const existing = groups.get(key) ?? { key, name, products: [] };
      existing.products.push(product);
      groups.set(key, existing);
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        products: [...group.products].sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredProducts]);

  useEffect(() => {
    setCollapsedSections((prev) => {
      const next: Record<string, boolean> = {};
      groupedProducts.forEach((group) => {
        next[group.key] = prev[group.key] ?? true;
      });
      return next;
    });
  }, [groupedProducts]);

  const recentProducts = useMemo(() => {
    const map = new Map(products.map((product) => [product.id, product]));
    return recentProductIds
      .map((id) => map.get(id))
      .filter((product): product is Product => Boolean(product))
      .filter((product) => !inStockOnly || getTotalQuantity(product) > 0)
      .slice(0, RECENT_PRODUCTS_LIMIT);
  }, [products, recentProductIds, inStockOnly]);

  const rememberProduct = (productId: string) => {
    setRecentProductIds((prev) => {
      const next = [productId, ...prev.filter((id) => id !== productId)].slice(
        0,
        RECENT_PRODUCTS_LIMIT,
      );
      try {
        localStorage.setItem(RECENT_PRODUCTS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage failures (private mode / blocked storage).
      }
      return next;
    });
  };

  const handleSelect = (productId: string) => {
    onProductChange(productId);
    rememberProduct(productId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const showRecent = isOpen && !searchTerm.trim() && recentProducts.length > 0;

  return (
    <div>
      <label className="block text-sm font-semibold text-dark-text-primary mb-2">{label}</label>

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={disabled}
        className="w-full bg-dark-bg border border-dark-border text-dark-text-primary px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gf-green text-left flex items-center justify-between gap-3 disabled:opacity-50"
        style={{ minHeight: '44px' }}
      >
        <span className="truncate">
          {selectedProduct ? selectedProduct.name : 'Select a product...'}
        </span>
        <span className="text-dark-text-muted text-xs shrink-0">{isOpen ? 'Close' : 'Choose'}</span>
      </button>

      {selectedProduct?.unitSize && !isOpen && (
        <p className="text-xs text-dark-text-muted mt-1">{selectedProduct.unitSize}</p>
      )}

      {isOpen && (
        <div className="mt-2 bg-dark-card border border-dark-border rounded-lg p-3 space-y-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full bg-dark-bg border border-dark-border text-dark-text-primary px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gf-green"
            style={{ minHeight: '44px' }}
          />

          {showInStockToggle && (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-dark-text-secondary">Filter</p>
              <button
                type="button"
                onClick={() => setInStockOnly((prev) => !prev)}
                className={`px-3 py-1.5 text-xs rounded-md border ${
                  inStockOnly
                    ? 'bg-gf-green border-gf-green-600 text-white'
                    : 'bg-dark-bg border-dark-border text-dark-text-secondary'
                }`}
              >
                {inStockOnly ? 'In stock only: On' : 'In stock only: Off'}
              </button>
            </div>
          )}

          {showRecent && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-dark-text-muted">Recent</p>
              <div className="grid grid-cols-1 gap-2">
                {recentProducts.map((product) => (
                  <button
                    key={`recent-${product.id}`}
                    type="button"
                    onClick={() => handleSelect(product.id)}
                    className="w-full text-left px-3 py-2 rounded-md border border-dark-border bg-dark-bg active:bg-dark-card"
                  >
                    <p className="text-sm text-dark-text-primary truncate">{product.name}</p>
                    {product.unitSize && (
                      <p className="text-xs text-dark-text-muted truncate">{product.unitSize}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {groupedProducts.length === 0 && (
              <p className="text-sm text-dark-text-muted px-1 py-2">No products found.</p>
            )}

            {groupedProducts.map((group) => (
              <div key={group.key} className="border border-dark-border rounded-md">
                <div className="flex items-center justify-between px-3 py-2 bg-dark-bg rounded-t-md">
                  <p className="text-xs text-dark-text-secondary font-semibold">
                    {group.name} ({group.products.length})
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedSections((prev) => ({ ...prev, [group.key]: !prev[group.key] }))
                    }
                    className="text-xs text-dark-text-muted"
                  >
                    {collapsedSections[group.key] ? 'Show' : 'Hide'}
                  </button>
                </div>

                {!collapsedSections[group.key] &&
                  group.products.map((product) => {
                    const isSelected = selectedProductId === product.id;
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleSelect(product.id)}
                        className={`w-full text-left px-3 py-2 border-t border-dark-border active:bg-dark-card ${
                          isSelected ? 'bg-gf-green-900/30' : 'bg-dark-card'
                        }`}
                      >
                        <p className="text-sm text-dark-text-primary truncate">{product.name}</p>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-dark-text-muted truncate">
                            {product.unitSize || 'No unit size'}
                          </p>
                          {isSelected && <span className="text-xs text-gf-green">Selected</span>}
                        </div>
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
