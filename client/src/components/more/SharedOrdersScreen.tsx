import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../api/client';
import {
  createSharedOrderItem,
  deleteSharedOrderItem,
  fetchSharedOrders,
  markAllOpenSharedOrdersAsOrdered,
  updateSharedOrderStatus,
} from '../../api/services/sharedOrders';
import { fetchProducts } from '../../api/services/products';
import { useAuth } from '../../context/AuthContext';
import { Product, SharedOrderItem, SharedOrderStatus } from '../../types';

type Mode = 'view' | 'add';

type CatalogGroup = {
  key: string;
  name: string;
  products: Product[];
};

type StatusGroup = {
  status: SharedOrderStatus;
  items: SharedOrderItem[];
};

const STATUS_LABELS: Record<SharedOrderStatus, string> = {
  OPEN: 'Open',
  ORDERED: 'Ordered',
  RECEIVED: 'Received',
  CANCELLED: 'Cancelled',
};

const STATUS_ORDER: SharedOrderStatus[] = ['OPEN', 'ORDERED', 'RECEIVED', 'CANCELLED'];

const DEFAULT_STATUS_COLLAPSED: Record<SharedOrderStatus, boolean> = {
  OPEN: false,
  ORDERED: true,
  RECEIVED: true,
  CANCELLED: true,
};

const UNCATEGORIZED_KEY = '__uncategorized__';
const UNCATEGORIZED_NAME = 'Uncategorized';
const ADDED_BADGE_DURATION_MS = 1200;

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

function includesText(value: string | null | undefined, query: string) {
  return (value ?? '').toLowerCase().includes(query);
}

function filterSharedOrders(items: SharedOrderItem[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return items;
  }

  return items.filter((item) =>
    includesText(item.productName, normalized) ||
    includesText(item.sku, normalized) ||
    includesText(item.vendorPartNumber, normalized) ||
    includesText(item.notes, normalized),
  );
}

function filterCatalogProducts(products: Product[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return products;
  }

  return products.filter((product) =>
    includesText(product.name, normalized) ||
    includesText(product.sku, normalized) ||
    includesText(product.vendorPartNumber, normalized) ||
    includesText(product.category?.name, normalized),
  );
}

function groupCatalogProducts(products: Product[]): CatalogGroup[] {
  const groups = new Map<string, CatalogGroup>();

  for (const product of products) {
    const key = product.category?.id || UNCATEGORIZED_KEY;
    const name = product.category?.name || UNCATEGORIZED_NAME;
    const existing = groups.get(key) ?? { key, name, products: [] };
    existing.products.push(product);
    groups.set(key, existing);
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.key === UNCATEGORIZED_KEY) return 1;
    if (b.key === UNCATEGORIZED_KEY) return -1;
    return a.name.localeCompare(b.name);
  });
}

function ensureCatalogSectionState(
  prev: Record<string, boolean>,
  groups: CatalogGroup[],
): Record<string, boolean> {
  const next: Record<string, boolean> = {};
  for (const group of groups) {
    next[group.key] = prev[group.key] ?? true;
  }
  return next;
}

export function SharedOrdersScreen() {
  const { user } = useAuth();
  const isViewer = user?.role === 'VIEWER';

  const [mode, setMode] = useState<Mode>('view');
  const [items, setItems] = useState<SharedOrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null);
  const [collapsedStatuses, setCollapsedStatuses] = useState<Record<SharedOrderStatus, boolean>>(
    DEFAULT_STATUS_COLLAPSED,
  );

  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSearchTerm, setCatalogSearchTerm] = useState('');
  const [catalogCollapsedSections, setCatalogCollapsedSections] = useState<Record<string, boolean>>({});
  const [pendingQuantityByProductId, setPendingQuantityByProductId] = useState<Record<string, number>>({});
  const [recentlyAddedByProductId, setRecentlyAddedByProductId] = useState<Record<string, boolean>>({});

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchSharedOrders());
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load shared orders'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setError(null);
    try {
      setCatalogProducts(await fetchProducts({ includeUntracked: true }));
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load product catalog'));
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (mode === 'add' && !catalogLoading && catalogProducts.length === 0) {
      loadCatalog();
    }
  }, [catalogLoading, catalogProducts.length, loadCatalog, mode]);

  const filteredItems = useMemo(
    () => filterSharedOrders(items, searchTerm),
    [items, searchTerm],
  );

  const groupedItems = useMemo<StatusGroup[]>(
    () => STATUS_ORDER.map((status) => ({ status, items: filteredItems.filter((item) => item.status === status) })),
    [filteredItems],
  );

  const filteredCatalogProducts = useMemo(
    () => filterCatalogProducts(catalogProducts, catalogSearchTerm),
    [catalogProducts, catalogSearchTerm],
  );

  const groupedCatalogProducts = useMemo(
    () => groupCatalogProducts(filteredCatalogProducts),
    [filteredCatalogProducts],
  );

  useEffect(() => {
    if (mode !== 'add') {
      return;
    }

    setCatalogCollapsedSections((prev) => ensureCatalogSectionState(prev, groupedCatalogProducts));
  }, [groupedCatalogProducts, mode]);

  const toggleStatusSection = (status: SharedOrderStatus) => {
    setCollapsedStatuses((prev) => ({ ...prev, [status]: !prev[status] }));
  };

  const toggleCatalogSection = (key: string) => {
    setCatalogCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const showAllStatuses = () => {
    setCollapsedStatuses({ OPEN: false, ORDERED: false, RECEIVED: false, CANCELLED: false });
  };

  const hideAllStatuses = () => {
    setCollapsedStatuses({ OPEN: true, ORDERED: true, RECEIVED: true, CANCELLED: true });
  };

  const showAllCatalog = () => {
    setCatalogCollapsedSections(() =>
      groupedCatalogProducts.reduce<Record<string, boolean>>((acc, group) => {
        acc[group.key] = false;
        return acc;
      }, {}),
    );
  };

  const hideAllCatalog = () => {
    setCatalogCollapsedSections(() =>
      groupedCatalogProducts.reduce<Record<string, boolean>>((acc, group) => {
        acc[group.key] = true;
        return acc;
      }, {}),
    );
  };

  const handleUndoCreate = async () => {
    if (!lastCreatedId || isViewer) return;

    setSubmitting(true);
    setError(null);

    try {
      await deleteSharedOrderItem(lastCreatedId);
      setSuccess('Last add undone.');
      setLastCreatedId(null);
      await loadItems();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to undo'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (itemId: string, status: SharedOrderStatus) => {
    if (isViewer) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await updateSharedOrderStatus(itemId, status);
      await loadItems();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update status'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkOpenOrdered = async () => {
    if (isViewer) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await markAllOpenSharedOrdersAsOrdered();
      setSuccess(`Marked ${result.updatedCount} item${result.updatedCount === 1 ? '' : 's'} as ordered.`);
      await loadItems();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to mark open items as ordered'));
    } finally {
      setSubmitting(false);
    }
  };

  const updatePendingQuantity = (productId: string, nextValue: number) => {
    setPendingQuantityByProductId((prev) => ({ ...prev, [productId]: Math.max(0, nextValue) }));
  };

  const handleRowAdd = async (product: Product) => {
    if (isViewer) return;

    const quantity = pendingQuantityByProductId[product.id] ?? 0;
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const created = await createSharedOrderItem({
        productName: product.name,
        sku: product.sku,
        vendorPartNumber: product.vendorPartNumber,
        unitSize: product.unitSize,
        categoryName: product.category?.name,
        quantity,
      });

      setLastCreatedId(created.id);
      setSuccess(`Added ${product.name} to shared orders.`);
      setPendingQuantityByProductId((prev) => ({ ...prev, [product.id]: 0 }));
      setRecentlyAddedByProductId((prev) => ({ ...prev, [product.id]: true }));

      setTimeout(() => {
        setRecentlyAddedByProductId((prev) => ({ ...prev, [product.id]: false }));
      }, ADDED_BADGE_DURATION_MS);

      await loadItems();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to add item to shared orders'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg pb-20">
      <div className="bg-dark-card border-b-2 border-gf-green p-4 sticky top-0 z-10">
        <h1 className="font-heading text-2xl font-bold text-dark-text-primary mb-3">Shared Orders</h1>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            type="button"
            onClick={() => setMode('view')}
            className={`p-3 rounded-lg border-2 transition-all font-heading font-semibold ${
              mode === 'view'
                ? 'bg-gf-green-700 border-gf-green text-white'
                : 'bg-dark-bg border-dark-border text-dark-text-primary active:bg-dark-card'
            }`}
            style={{ minHeight: '44px' }}
          >
            <div className="text-sm">View/Edit</div>
          </button>
          <button
            type="button"
            onClick={() => setMode('add')}
            className={`p-3 rounded-lg border-2 transition-all font-heading font-semibold ${
              mode === 'add'
                ? 'bg-gf-green-700 border-gf-green text-white'
                : 'bg-dark-bg border-dark-border text-dark-text-primary active:bg-dark-card'
            }`}
            style={{ minHeight: '44px' }}
          >
            <div className="text-sm">Add Item</div>
          </button>
        </div>

        <input
          type="text"
          value={mode === 'view' ? searchTerm : catalogSearchTerm}
          onChange={(event) =>
            mode === 'view' ? setSearchTerm(event.target.value) : setCatalogSearchTerm(event.target.value)
          }
          placeholder={mode === 'view' ? 'Search shared order items...' : 'Search products...'}
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

        {success && (
          <div className="bg-gf-green-900 border border-gf-green text-gf-green-200 text-sm rounded-lg p-3 flex items-center justify-between gap-2">
            <span>{success}</span>
            {lastCreatedId && !isViewer && (
              <button type="button" className="underline text-gf-green-100" onClick={handleUndoCreate}>
                Undo
              </button>
            )}
          </div>
        )}

        {mode === 'view' ? (
          <>
            {!isViewer && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleMarkOpenOrdered}
                  disabled={submitting}
                  className="btn-gf-outline px-4 py-2 text-sm"
                >
                  Mark All Open As Ordered
                </button>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={hideAllStatuses}
                className="px-2 py-1 text-xs rounded border border-dark-border text-dark-text-secondary"
              >
                Hide All
              </button>
              <button
                type="button"
                onClick={showAllStatuses}
                className="px-2 py-1 text-xs rounded border border-dark-border text-dark-text-secondary"
              >
                Show All
              </button>
            </div>

            {loading ? (
              <div className="bg-dark-card p-6 rounded-lg text-center border border-dark-border text-dark-text-secondary">
                Loading shared orders...
              </div>
            ) : (
              groupedItems.map((group) => (
                <section key={group.status} className="bg-dark-card border border-dark-border rounded-lg shadow-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleStatusSection(group.status)}
                    className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-gf-charcoal-700 transition-colors duration-150"
                  >
                    <h3 className="font-heading font-semibold text-sm text-dark-text-primary">{STATUS_LABELS[group.status]}</h3>
                    <span className="text-dark-text-secondary text-xs">
                      {collapsedStatuses[group.status] ? 'Show' : 'Hide'} ({group.items.length})
                    </span>
                  </button>

                  {!collapsedStatuses[group.status] && (
                    <div className="pb-2 space-y-2 border-t border-dark-border">
                      {group.items.length === 0 ? (
                        <div className="px-3 py-3 text-sm text-dark-text-muted">No items</div>
                      ) : (
                        group.items.map((item) => (
                          <div key={item.id} className="bg-dark-card p-3 rounded-lg border border-dark-border mx-2 mt-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <p className="font-heading font-semibold text-sm text-dark-text-primary">{item.productName}</p>
                                <p className="text-xs text-dark-text-muted mt-1">
                                  Qty: {item.quantity}
                                  {item.unitSize ? ` | Unit: ${item.unitSize}` : ''}
                                  {item.sku ? ` | SKU: ${item.sku}` : ''}
                                </p>
                                <p className="text-xs text-dark-text-muted mt-1">
                                  Requested by {item.requestedByUserName} ({item.requestedByTenant})
                                </p>
                                {item.notes && <p className="text-xs text-dark-text-secondary mt-1">Notes: {item.notes}</p>}
                              </div>
                              {!isViewer && (
                                <div className="flex flex-col gap-2">
                                  {item.status === 'OPEN' && (
                                    <button
                                      type="button"
                                      onClick={() => handleStatusChange(item.id, 'ORDERED')}
                                      className="px-3 py-1 text-xs rounded border border-gf-green text-gf-green"
                                    >
                                      Mark Ordered
                                    </button>
                                  )}
                                  {item.status === 'ORDERED' && (
                                    <button
                                      type="button"
                                      onClick={() => handleStatusChange(item.id, 'RECEIVED')}
                                      className="px-3 py-1 text-xs rounded border border-gf-green text-gf-green"
                                    >
                                      Mark Received
                                    </button>
                                  )}
                                  {(item.status === 'OPEN' || item.status === 'ORDERED') && (
                                    <button
                                      type="button"
                                      onClick={() => handleStatusChange(item.id, 'CANCELLED')}
                                      className="px-3 py-1 text-xs rounded border border-alert-red text-alert-red"
                                    >
                                      Cancel
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </section>
              ))
            )}
          </>
        ) : (
          <>
            <div className="text-sm text-dark-text-secondary">
              Pick quantities inline, then add directly from each product row.
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={hideAllCatalog}
                className="px-2 py-1 text-xs rounded border border-dark-border text-dark-text-secondary"
              >
                Hide All
              </button>
              <button
                type="button"
                onClick={showAllCatalog}
                className="px-2 py-1 text-xs rounded border border-dark-border text-dark-text-secondary"
              >
                Show All
              </button>
            </div>

            {catalogLoading ? (
              <div className="bg-dark-card p-6 rounded-lg text-center border border-dark-border text-dark-text-secondary">
                Loading product catalog...
              </div>
            ) : groupedCatalogProducts.length === 0 ? (
              <div className="bg-dark-card p-6 rounded-lg text-center border border-dark-border text-dark-text-muted">
                No products found
              </div>
            ) : (
              groupedCatalogProducts.map((group) => (
                <section key={group.key} className="bg-dark-card border border-dark-border rounded-lg shadow-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleCatalogSection(group.key)}
                    className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-gf-charcoal-700 transition-colors duration-150"
                  >
                    <h3 className="font-heading font-semibold text-sm text-dark-text-primary truncate pr-2">{group.name}</h3>
                    <span className="text-dark-text-secondary text-xs whitespace-nowrap">
                      {catalogCollapsedSections[group.key] ? 'Show' : 'Hide'} ({group.products.length})
                    </span>
                  </button>

                  {!catalogCollapsedSections[group.key] && (
                    <div className="border-t border-dark-border">
                      {group.products.map((product) => {
                        const quantity = pendingQuantityByProductId[product.id] ?? 0;
                        const recentlyAdded = recentlyAddedByProductId[product.id] ?? false;

                        return (
                          <div key={product.id} className="px-3 py-2 border-b border-dark-border last:border-b-0">
                            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2">
                              <div className="min-w-0">
                                <p className="font-heading font-semibold text-sm text-dark-text-primary truncate">
                                  {product.name}
                                </p>
                                {product.unitSize && (
                                  <p className="text-xs text-dark-text-muted truncate">{product.unitSize}</p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => updatePendingQuantity(product.id, quantity - 1)}
                                disabled={isViewer || quantity <= 0 || submitting}
                                className="w-8 h-8 rounded border border-dark-border text-dark-text-primary disabled:opacity-50"
                              >
                                -
                              </button>
                              <div className="min-w-[24px] text-center font-heading text-dark-text-primary text-sm">
                                {quantity}
                              </div>
                              <button
                                type="button"
                                onClick={() => updatePendingQuantity(product.id, quantity + 1)}
                                disabled={isViewer || submitting}
                                className="w-8 h-8 rounded border border-dark-border text-dark-text-primary disabled:opacity-50"
                              >
                                +
                              </button>

                              <div className="w-14 text-right">
                                {recentlyAdded ? (
                                  <span className="text-xs font-semibold text-gf-green-200">ADDED!</span>
                                ) : quantity > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRowAdd(product)}
                                    disabled={isViewer || submitting}
                                    className="px-2 py-1 text-xs rounded border border-gf-green text-gf-green disabled:opacity-50"
                                  >
                                    Add
                                  </button>
                                ) : (
                                  <span className="inline-block w-full" aria-hidden="true">&nbsp;</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
