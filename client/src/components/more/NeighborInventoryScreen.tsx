import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../api/client';
import {
  fetchNeighborInventory,
  fetchNeighborTenants,
} from '../../api/services/neighbors';
import { NeighborInventoryProduct, NeighborTenantOption } from '../../types';

const HOME_LABELS: Record<string, string> = {
  main: 'Garage Force of Metro Detroit',
  adam: 'Garage Force of Mid-Michigan',
};

export function NeighborInventoryScreen() {
  const [currentTenant, setCurrentTenant] = useState<string>('');
  const [neighbors, setNeighbors] = useState<NeighborTenantOption[]>([]);
  const [selectedNeighbor, setSelectedNeighbor] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<NeighborInventoryProduct[]>([]);
  const [sourceLabel, setSourceLabel] = useState('');
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const loadNeighborTenants = useCallback(async () => {
    setLoadingTenants(true);
    setError(null);
    try {
      const data = await fetchNeighborTenants();
      setCurrentTenant(data.currentTenant);
      setNeighbors(data.tenants);
      if (data.tenants.length > 0) {
        setSelectedNeighbor((prev) => prev || data.tenants[0].key);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unable to load neighbor tenants';
      setError(message);
    } finally {
      setLoadingTenants(false);
    }
  }, []);

  const loadInventory = useCallback(async () => {
    if (!selectedNeighbor) {
      setProducts([]);
      setSourceLabel('');
      return;
    }

    setLoadingInventory(true);
    setError(null);
    try {
      const data = await fetchNeighborInventory({
        tenant: selectedNeighbor,
      });
      setProducts(data.products);
      setSourceLabel(data.sourceLabel);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unable to load neighbor inventory';
      setError(message);
      setProducts([]);
    } finally {
      setLoadingInventory(false);
    }
  }, [selectedNeighbor]);

  useEffect(() => {
    loadNeighborTenants();
  }, [loadNeighborTenants]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const filteredProducts = useMemo(() => {
    const searchLower = searchTerm.trim().toLowerCase();
    return products.filter((product) => {
      return (
        searchLower.length === 0 ||
        product.name.toLowerCase().includes(searchLower) ||
        (product.sku ?? '').toLowerCase().includes(searchLower) ||
        (product.vendorPartNumber ?? '').toLowerCase().includes(searchLower) ||
        (product.category?.name ?? '').toLowerCase().includes(searchLower)
      );
    });
  }, [products, searchTerm]);

  const groupedProducts = useMemo(() => {
    const groups = new Map<string, { key: string; name: string; products: NeighborInventoryProduct[] }>();
    for (const product of filteredProducts) {
      const key = product.category?.id || '__uncategorized__';
      const name = product.category?.name || 'Uncategorized';
      const existing = groups.get(key) ?? { key, name, products: [] };
      existing.products.push(product);
      groups.set(key, existing);
    }
    return Array.from(groups.values()).sort((a, b) => {
      if (a.key === '__uncategorized__') return 1;
      if (b.key === '__uncategorized__') return -1;
      return a.name.localeCompare(b.name);
    });
  }, [filteredProducts]);

  useEffect(() => {
    setCollapsedSections((prev) => {
      const next: Record<string, boolean> = {};
      for (const group of groupedProducts) {
        next[group.key] = prev[group.key] ?? true;
      }
      return next;
    });
  }, [groupedProducts]);

  const toggleSection = useCallback((key: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const hideAllSections = useCallback(() => {
    setCollapsedSections(() =>
      groupedProducts.reduce<Record<string, boolean>>((acc, group) => {
        acc[group.key] = true;
        return acc;
      }, {}),
    );
  }, [groupedProducts]);

  const showAllSections = useCallback(() => {
    setCollapsedSections(() =>
      groupedProducts.reduce<Record<string, boolean>>((acc, group) => {
        acc[group.key] = false;
        return acc;
      }, {}),
    );
  }, [groupedProducts]);

  const hasExpandedSections = groupedProducts.some((group) => !collapsedSections[group.key]);
  const hasCollapsedSections = groupedProducts.some((group) => collapsedSections[group.key] ?? true);

  const currentTenantLabel = useMemo(
    () => HOME_LABELS[currentTenant] ?? currentTenant,
    [currentTenant],
  );

  return (
    <div className="min-h-screen bg-dark-bg pb-20">
      <div className="bg-dark-card border-b-2 border-gf-green p-4 sticky top-0 z-10 space-y-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-dark-text-primary">Neighbor Inventory</h1>
          <p className="text-sm text-dark-text-secondary">
            View read-only on-hand inventory from a neighboring tenant.
          </p>
          {currentTenantLabel && (
            <p className="text-xs text-dark-text-muted mt-1 break-words">
              Current tenant: {currentTenantLabel}
            </p>
          )}
        </div>

        {loadingTenants ? (
          <div className="bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text-secondary">
            Loading neighbor options...
          </div>
        ) : neighbors.length === 0 ? (
          <div className="bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text-secondary">
            No neighbor tenants are configured yet.
          </div>
        ) : (
          <select
            value={selectedNeighbor}
            onChange={(event) => setSelectedNeighbor(event.target.value)}
            className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-gf-green"
            style={{ minHeight: '44px' }}
          >
            {neighbors.map((tenant) => (
              <option key={tenant.key} value={tenant.key}>
                {tenant.label}
              </option>
            ))}
          </select>
        )}

        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search products..."
          className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-dark-text-primary placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-gf-green"
          style={{ minHeight: '44px' }}
        />
      </div>

      <div className="p-4 space-y-3">
        {error && (
          <div className="bg-alert-red-bg border border-alert-red-border text-alert-red text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="font-bold text-dark-text-primary text-lg min-w-0 break-words">
            Inventory {sourceLabel ? `- ${sourceLabel}` : ''}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={hideAllSections}
              disabled={!hasExpandedSections}
              className="px-2 py-1 text-xs rounded border border-dark-border text-dark-text-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Hide All
            </button>
            <button
              type="button"
              onClick={showAllSections}
              disabled={!hasCollapsedSections}
              className="px-2 py-1 text-xs rounded border border-dark-border text-dark-text-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Show All
            </button>
          </div>
        </div>

        <div className="text-sm text-dark-text-secondary">
          {loadingInventory
            ? 'Loading neighbor inventory...'
            : `${filteredProducts.length} ${filteredProducts.length === 1 ? 'product' : 'products'} shown`}
        </div>

        {!loadingInventory && filteredProducts.length === 0 ? (
          <div className="bg-dark-card p-6 rounded-lg text-center border border-dark-border">
            <p className="text-dark-text-muted">No products found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedProducts.map((group) => (
              <section
                key={group.key}
                className="bg-dark-card border border-dark-border rounded-lg shadow-lg overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleSection(group.key)}
                  className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-gf-charcoal-700 transition-colors duration-150"
                  aria-expanded={!collapsedSections[group.key]}
                >
                  <h3 className="font-heading font-semibold text-sm text-dark-text-primary truncate pr-2">
                    {group.name}
                  </h3>
                  <span className="text-dark-text-secondary text-xs whitespace-nowrap" aria-hidden="true">
                    {collapsedSections[group.key] ? 'Show' : 'Hide'} ({group.products.length})
                  </span>
                </button>

                {!collapsedSections[group.key] && (
                  <div className="pb-2 space-y-2 border-t border-dark-border">
                    {group.products.map((product) => (
                      <div
                        key={product.productId}
                        className="bg-dark-card p-3 rounded-lg shadow-lg border border-dark-border"
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            <h3 className="font-heading font-semibold text-sm text-dark-text-primary">
                              {product.name}
                            </h3>
                            {(product.sku || product.vendorPartNumber) && (
                              <p className="text-xs text-dark-text-muted mt-1">
                                {product.sku ? `SKU: ${product.sku}` : ''}
                                {product.sku && product.vendorPartNumber ? ' | ' : ''}
                                {product.vendorPartNumber ? `Part #: ${product.vendorPartNumber}` : ''}
                              </p>
                            )}
                            <div className="mt-2 space-y-1">
                              {product.locations.map((location) => (
                                <div
                                  key={location.locationId}
                                  className="flex items-center justify-between text-xs text-dark-text-secondary"
                                >
                                  <span>{location.locationName}</span>
                                  <span className="font-semibold text-dark-text-primary">
                                    {location.quantity}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-dark-text-muted uppercase">Total</p>
                            <p className="text-lg font-heading text-gf-green">{product.totalQuantity}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
