import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../api/client';
import {
  fetchNeighborInventory,
  fetchNeighborTenants,
} from '../../api/services/neighbors';
import { NeighborInventoryProduct, NeighborTenantOption } from '../../types';
import { Header } from '../layout/Header';

const HOME_LABELS: Record<string, string> = {
  main: 'Garage Force of Metro Detroit',
  adam: 'Garage Force of Mid-Michigan',
};

export function NeighborInventoryScreen() {
  const [currentTenant, setCurrentTenant] = useState<string>('');
  const [neighbors, setNeighbors] = useState<NeighborTenantOption[]>([]);
  const [selectedNeighbor, setSelectedNeighbor] = useState<string>('');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<NeighborInventoryProduct[]>([]);
  const [sourceLabel, setSourceLabel] = useState('');
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        search: searchTerm,
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
  }, [searchTerm, selectedNeighbor]);

  useEffect(() => {
    loadNeighborTenants();
  }, [loadNeighborTenants]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const currentTenantLabel = useMemo(
    () => HOME_LABELS[currentTenant] ?? currentTenant,
    [currentTenant],
  );

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchTerm(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
  };

  return (
    <>
      <Header />
      <div className="p-4 pb-28 space-y-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-dark-text-primary">Neighbor Inventory</h2>
          <p className="text-sm text-dark-text-secondary">
            Read-only view of on-hand inventory from a neighboring tenant.
          </p>
          {currentTenantLabel && (
            <p className="text-xs text-dark-text-muted mt-2">
              You are currently signed in to: {currentTenantLabel}
            </p>
          )}
        </div>

        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-sm text-dark-text-secondary">
          This screen is view-only for this phase. Request/borrow actions are intentionally out of scope.
        </div>

        {error && (
          <div className="bg-alert-red-bg border border-alert-red-border text-alert-red text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        {loadingTenants ? (
          <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-dark-text-secondary">
            Loading neighbor options...
          </div>
        ) : neighbors.length === 0 ? (
          <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-dark-text-secondary">
            No neighbor tenants are configured yet.
          </div>
        ) : (
          <>
            <div className="bg-dark-card border border-dark-border rounded-xl p-4 space-y-3">
              <label className="block text-xs uppercase tracking-wide text-dark-text-secondary">
                Neighbor Tenant
              </label>
              <select
                value={selectedNeighbor}
                onChange={(event) => setSelectedNeighbor(event.target.value)}
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text-primary"
              >
                {neighbors.map((tenant) => (
                  <option key={tenant.key} value={tenant.key}>
                    {tenant.label}
                  </option>
                ))}
              </select>

              <form onSubmit={handleSearchSubmit} className="space-y-2">
                <label className="block text-xs uppercase tracking-wide text-dark-text-secondary">
                  Search Products
                </label>
                <div className="flex items-center gap-2">
                  <input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text-primary"
                    placeholder="Name, SKU, part number"
                  />
                  <button type="submit" className="btn-gf-outline px-4 py-2 text-sm">
                    Search
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="btn-gf-outline px-4 py-2 text-sm"
                  >
                    Clear
                  </button>
                </div>
              </form>
            </div>

            <div className="space-y-3">
              <div className="text-sm text-dark-text-secondary">
                {loadingInventory
                  ? 'Loading neighbor inventory...'
                  : `Showing ${products.length} products from ${sourceLabel || 'selected tenant'}.`}
              </div>

              {!loadingInventory && products.length === 0 && (
                <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-dark-text-secondary">
                  No on-hand inventory found for the selected tenant and search.
                </div>
              )}

              {products.map((product) => (
                <div
                  key={product.productId}
                  className="bg-dark-card border border-dark-border rounded-xl p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-heading text-lg text-dark-text-primary">{product.name}</p>
                      <p className="text-xs text-dark-text-secondary">
                        {product.category?.name || 'Uncategorized'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wide text-dark-text-muted">On Hand</p>
                      <p className="text-xl font-heading text-gf-green">{product.totalQuantity}</p>
                    </div>
                  </div>

                  <div className="text-xs text-dark-text-muted flex items-center gap-3 flex-wrap">
                    {product.sku && <span>SKU: {product.sku}</span>}
                    {product.vendorPartNumber && <span>Part #: {product.vendorPartNumber}</span>}
                    {product.unitSize && <span>Unit: {product.unitSize}</span>}
                  </div>

                  <div className="space-y-1">
                    {product.locations.map((location) => (
                      <div
                        key={location.locationId}
                        className="flex items-center justify-between text-sm border border-dark-border rounded-lg px-3 py-2"
                      >
                        <span className="text-dark-text-secondary">{location.locationName}</span>
                        <span className="font-semibold text-dark-text-primary">{location.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
