import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../api/client';
import {
  createSharedOrderItem,
  deleteSharedOrderItem,
  fetchSharedOrders,
  markAllOpenSharedOrdersAsOrdered,
  updateSharedOrderItem,
  updateSharedOrderStatus,
} from '../../api/services/sharedOrders';
import { useAuth } from '../../context/AuthContext';
import { SharedOrderItem, SharedOrderStatus } from '../../types';

type Mode = 'view' | 'add';

type FormState = {
  productName: string;
  quantity: string;
  estimatedUnitPrice: string;
  sku: string;
  vendorPartNumber: string;
  unitSize: string;
  categoryName: string;
  notes: string;
};

const FREE_SHIPPING_CENTS = 300000;

const STATUS_LABELS: Record<SharedOrderStatus, string> = {
  OPEN: 'Open',
  ORDERED: 'Ordered',
  RECEIVED: 'Received',
  CANCELLED: 'Cancelled',
};

const STATUS_ORDER: SharedOrderStatus[] = ['OPEN', 'ORDERED', 'RECEIVED', 'CANCELLED'];

const emptyForm: FormState = {
  productName: '',
  quantity: '1',
  estimatedUnitPrice: '',
  sku: '',
  vendorPartNumber: '',
  unitSize: '',
  categoryName: '',
  notes: '',
};

function toFormState(item: SharedOrderItem): FormState {
  return {
    productName: item.productName,
    quantity: String(item.quantity),
    estimatedUnitPrice:
      item.estimatedUnitPriceCents !== null && item.estimatedUnitPriceCents !== undefined
        ? (item.estimatedUnitPriceCents / 100).toFixed(2)
        : '',
    sku: item.sku ?? '',
    vendorPartNumber: item.vendorPartNumber ?? '',
    unitSize: item.unitSize ?? '',
    categoryName: item.categoryName ?? '',
    notes: item.notes ?? '',
  };
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function buildPayload(form: FormState) {
  const quantity = Number(form.quantity);
  const hasPrice = form.estimatedUnitPrice.trim().length > 0;
  const unitPriceDollars = Number(form.estimatedUnitPrice);

  return {
    productName: form.productName,
    quantity,
    estimatedUnitPriceCents: hasPrice && Number.isFinite(unitPriceDollars)
      ? Math.round(unitPriceDollars * 100)
      : null,
    sku: form.sku,
    vendorPartNumber: form.vendorPartNumber,
    unitSize: form.unitSize,
    categoryName: form.categoryName,
    notes: form.notes,
  };
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [collapsedStatuses, setCollapsedStatuses] = useState<Record<SharedOrderStatus, boolean>>({
    OPEN: false,
    ORDERED: true,
    RECEIVED: true,
    CANCELLED: true,
  });
  const [form, setForm] = useState<FormState>(emptyForm);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSharedOrders();
      setItems(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unable to load shared orders';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      item.productName.toLowerCase().includes(query) ||
      (item.sku ?? '').toLowerCase().includes(query) ||
      (item.vendorPartNumber ?? '').toLowerCase().includes(query) ||
      (item.notes ?? '').toLowerCase().includes(query),
    );
  }, [items, searchTerm]);

  const groupedItems = useMemo(() => {
    return STATUS_ORDER.map((status) => ({
      status,
      items: filteredItems.filter((item) => item.status === status),
    }));
  }, [filteredItems]);

  const openTotalCents = useMemo(() => {
    return items
      .filter((item) => item.status === 'OPEN' && item.estimatedUnitPriceCents !== null && item.estimatedUnitPriceCents !== undefined)
      .reduce((sum, item) => sum + item.quantity * (item.estimatedUnitPriceCents ?? 0), 0);
  }, [items]);

  const remainingToFreeShipping = Math.max(FREE_SHIPPING_CENTS - openTotalCents, 0);

  const toggleStatusSection = (status: SharedOrderStatus) => {
    setCollapsedStatuses((prev) => ({
      ...prev,
      [status]: !prev[status],
    }));
  };

  const showAll = () => {
    setCollapsedStatuses({
      OPEN: false,
      ORDERED: false,
      RECEIVED: false,
      CANCELLED: false,
    });
  };

  const hideAll = () => {
    setCollapsedStatuses({
      OPEN: true,
      ORDERED: true,
      RECEIVED: true,
      CANCELLED: true,
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isViewer) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = buildPayload(form);
      if (editingId) {
        await updateSharedOrderItem(editingId, payload);
        setSuccess('Shared order item updated.');
      } else {
        const created = await createSharedOrderItem(payload);
        setLastCreatedId(created.id);
        setSuccess('Item added to shared orders.');
      }
      setForm(emptyForm);
      setEditingId(null);
      await loadItems();
      setMode('view');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unable to save shared order item';
      setError(message);
    } finally {
      setSubmitting(false);
    }
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
      const message = err instanceof ApiError ? err.message : 'Unable to undo';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const beginEdit = (item: SharedOrderItem) => {
    setEditingId(item.id);
    setForm(toFormState(item));
    setMode('add');
    setError(null);
    setSuccess(null);
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
      const message = err instanceof ApiError ? err.message : 'Unable to update status';
      setError(message);
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
      const message = err instanceof ApiError ? err.message : 'Unable to mark open items as ordered';
      setError(message);
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
            onClick={() => {
              setMode('add');
              if (!editingId) {
                setForm(emptyForm);
              }
            }}
            className={`p-3 rounded-lg border-2 transition-all font-heading font-semibold ${
              mode === 'add'
                ? 'bg-gf-green-700 border-gf-green text-white'
                : 'bg-dark-bg border-dark-border text-dark-text-primary active:bg-dark-card'
            }`}
            style={{ minHeight: '44px' }}
          >
            <div className="text-sm">{editingId ? 'Edit Item' : 'Add Item'}</div>
          </button>
        </div>

        {mode === 'view' && (
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search shared order items..."
            className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-dark-text-primary placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-gf-green"
            style={{ minHeight: '44px' }}
          />
        )}
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
            <div className="bg-dark-card border border-dark-border rounded-lg p-3 space-y-1">
              <p className="text-sm text-dark-text-secondary">
                Open order estimate: <span className="text-dark-text-primary font-semibold">{formatCurrency(openTotalCents)}</span>
              </p>
              {remainingToFreeShipping > 0 ? (
                <p className="text-xs text-dark-text-muted">
                  {formatCurrency(remainingToFreeShipping)} remaining to reach free shipping ({formatCurrency(FREE_SHIPPING_CENTS)}).
                </p>
              ) : (
                <p className="text-xs text-gf-green-200">
                  Free shipping threshold reached.
                </p>
              )}
            </div>

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
                onClick={hideAll}
                className="px-2 py-1 text-xs rounded border border-dark-border text-dark-text-secondary"
              >
                Hide All
              </button>
              <button
                type="button"
                onClick={showAll}
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
                    <h3 className="font-heading font-semibold text-sm text-dark-text-primary">
                      {STATUS_LABELS[group.status]}
                    </h3>
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
                                {item.estimatedUnitPriceCents !== null && item.estimatedUnitPriceCents !== undefined && (
                                  <p className="text-xs text-dark-text-secondary mt-1">
                                    Est. Unit: {formatCurrency(item.estimatedUnitPriceCents)} | Est. Line: {formatCurrency(item.estimatedUnitPriceCents * item.quantity)}
                                  </p>
                                )}
                                {item.notes && (
                                  <p className="text-xs text-dark-text-secondary mt-1">
                                    Notes: {item.notes}
                                  </p>
                                )}
                              </div>
                              {!isViewer && (
                                <div className="flex flex-col gap-2">
                                  {item.status === 'OPEN' && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => beginEdit(item)}
                                        className="px-3 py-1 text-xs rounded border border-dark-border text-dark-text-secondary"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleStatusChange(item.id, 'ORDERED')}
                                        className="px-3 py-1 text-xs rounded border border-gf-green text-gf-green"
                                      >
                                        Mark Ordered
                                      </button>
                                    </>
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
          <form onSubmit={handleSubmit} className="bg-dark-card border border-dark-border rounded-lg p-4 space-y-3">
            <h3 className="font-heading text-lg text-dark-text-primary">
              {editingId ? 'Edit Shared Order Item' : 'Add Shared Order Item'}
            </h3>

            <div>
              <label className="block text-xs uppercase tracking-wide text-dark-text-secondary mb-1">
                Product Name *
              </label>
              <input
                value={form.productName}
                onChange={(event) => setForm((prev) => ({ ...prev, productName: event.target.value }))}
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text-primary"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs uppercase tracking-wide text-dark-text-secondary mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-dark-text-secondary mb-1">
                  Est Unit Price ($)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.estimatedUnitPrice}
                  onChange={(event) => setForm((prev) => ({ ...prev, estimatedUnitPrice: event.target.value }))}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs uppercase tracking-wide text-dark-text-secondary mb-1">
                  SKU
                </label>
                <input
                  value={form.sku}
                  onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text-primary"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-dark-text-secondary mb-1">
                  Vendor Part #
                </label>
                <input
                  value={form.vendorPartNumber}
                  onChange={(event) => setForm((prev) => ({ ...prev, vendorPartNumber: event.target.value }))}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs uppercase tracking-wide text-dark-text-secondary mb-1">
                  Unit Size
                </label>
                <input
                  value={form.unitSize}
                  onChange={(event) => setForm((prev) => ({ ...prev, unitSize: event.target.value }))}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text-primary"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-dark-text-secondary mb-1">
                  Category
                </label>
                <input
                  value={form.categoryName}
                  onChange={(event) => setForm((prev) => ({ ...prev, categoryName: event.target.value }))}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide text-dark-text-secondary mb-1">
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-dark-text-primary min-h-[90px]"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting || isViewer}
                className="btn-gf flex-1 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {editingId ? 'Save Changes' : 'Add Item'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyForm);
                    setMode('view');
                  }}
                  className="btn-gf-outline flex-1 py-2"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
