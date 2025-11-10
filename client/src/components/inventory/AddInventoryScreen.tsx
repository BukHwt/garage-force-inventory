import React, { useState } from 'react';
import { Product, Location } from '../../types';

type InventoryMode = 'receive' | 'transfer';

interface AddInventoryScreenProps {
  products: Product[];
  locations: Location[];
  onReceive: (data: ReceiveInventoryData) => Promise<void>;
  onTransfer: (data: TransferInventoryData) => Promise<void>;
}

export interface ReceiveInventoryData {
  productId: string;
  locationId: string;
  quantity: number;
  batchNumber?: string;
  expiresAt?: string;
  notes?: string;
}

export interface TransferInventoryData {
  productId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  notes?: string;
}

export function AddInventoryScreen({ products, locations, onReceive, onTransfer }: AddInventoryScreenProps) {
  const [mode, setMode] = useState<InventoryMode>('receive');
  const [receiveData, setReceiveData] = useState<ReceiveInventoryData>({
    productId: '',
    locationId: '',
    quantity: 1,
    batchNumber: '',
    expiresAt: '',
    notes: '',
  });
  const [transferData, setTransferData] = useState<TransferInventoryData>({
    productId: '',
    fromLocationId: '',
    toLocationId: '',
    quantity: 1,
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedProduct = products.find(p => p.id === (mode === 'receive' ? receiveData.productId : transferData.productId));

  // Get available quantity for transfer
  const getAvailableQuantity = (productId: string, locationId: string): number => {
    if (!productId || !locationId) return 0;
    const product = products.find(p => p.id === productId);
    if (!product) return 0;
    const inventoryItem = product.inventoryItems.find(item => item.location.id === locationId);
    return inventoryItem?.quantity || 0;
  };

  const availableQuantity = mode === 'transfer'
    ? getAvailableQuantity(transferData.productId, transferData.fromLocationId)
    : 0;

  const handleModeChange = (newMode: InventoryMode) => {
    setMode(newMode);
    setError(null);
    setSuccess(false);
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!receiveData.productId) {
      setError('Please select a product');
      return;
    }

    if (!receiveData.locationId) {
      setError('Please select a location');
      return;
    }

    if (receiveData.quantity <= 0) {
      setError('Quantity must be greater than zero');
      return;
    }

    setIsSubmitting(true);

    try {
      await onReceive(receiveData);
      setSuccess(true);

      setTimeout(() => {
        setReceiveData({
          productId: '',
          locationId: '',
          quantity: 1,
          batchNumber: '',
          expiresAt: '',
          notes: '',
        });
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to receive inventory');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!transferData.productId) {
      setError('Please select a product');
      return;
    }

    if (!transferData.fromLocationId) {
      setError('Please select a source location');
      return;
    }

    if (!transferData.toLocationId) {
      setError('Please select a destination location');
      return;
    }

    if (transferData.fromLocationId === transferData.toLocationId) {
      setError('Source and destination must be different');
      return;
    }

    if (transferData.quantity <= 0) {
      setError('Quantity must be greater than zero');
      return;
    }

    if (transferData.quantity > availableQuantity) {
      setError(`Only ${availableQuantity} available at source location`);
      return;
    }

    setIsSubmitting(true);

    try {
      await onTransfer(transferData);
      setSuccess(true);

      setTimeout(() => {
        setTransferData({
          productId: '',
          fromLocationId: '',
          toLocationId: '',
          quantity: 1,
          notes: '',
        });
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transfer inventory');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickQuantity = (amount: number) => {
    if (mode === 'receive') {
      setReceiveData(prev => ({
        ...prev,
        quantity: Math.max(1, prev.quantity + amount),
      }));
    } else {
      setTransferData(prev => ({
        ...prev,
        quantity: Math.max(1, Math.min(availableQuantity, prev.quantity + amount)),
      }));
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg pb-20">
      {/* Header */}
      <div className="bg-dark-card border-b-2 border-gf-green p-4 sticky top-0 z-10">
        <h1 className="font-heading text-2xl font-bold text-dark-text-primary">
          Add Inventory
        </h1>
        <p className="font-body text-sm text-dark-text-secondary mt-1">
          Receive shipments or transfer between locations
        </p>
      </div>

      <div className="p-4">
        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => handleModeChange('receive')}
            className={`p-4 rounded-lg border-2 transition-all font-heading font-semibold ${
              mode === 'receive'
                ? 'bg-gf-green-700 border-gf-green text-white'
                : 'bg-dark-bg border-dark-border text-dark-text-primary active:bg-dark-card'
            }`}
            style={{ minHeight: '44px' }}
          >
            <div className="text-2xl mb-1">📦</div>
            <div>Receive</div>
            <div className="text-xs font-body font-normal opacity-80">From supplier</div>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('transfer')}
            className={`p-4 rounded-lg border-2 transition-all font-heading font-semibold ${
              mode === 'transfer'
                ? 'bg-gf-green-700 border-gf-green text-white'
                : 'bg-dark-bg border-dark-border text-dark-text-primary active:bg-dark-card'
            }`}
            style={{ minHeight: '44px' }}
          >
            <div className="text-2xl mb-1">🔄</div>
            <div>Transfer</div>
            <div className="text-xs font-body font-normal opacity-80">Between locations</div>
          </button>
        </div>

        {/* Receive Form */}
        {mode === 'receive' && (
          <form onSubmit={handleReceiveSubmit} className="space-y-4">
            {/* Product Selection */}
            <div>
              <label className="font-body text-sm text-dark-text-secondary mb-2 block font-semibold">
                Product *
              </label>
              <select
                value={receiveData.productId}
                onChange={(e) => setReceiveData({ ...receiveData, productId: e.target.value })}
                className="w-full bg-dark-bg border border-dark-border text-dark-text-primary font-body px-4 py-3 rounded-lg focus:outline-none focus:border-gf-green"
                style={{ minHeight: '44px' }}
                disabled={isSubmitting}
              >
                <option value="">Select a product...</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} {product.sku ? `(${product.sku})` : ''} - {product.unitSize}
                  </option>
                ))}
              </select>
              {selectedProduct && (
                <p className="font-body text-xs text-dark-text-muted mt-1">
                  {selectedProduct.description}
                </p>
              )}
            </div>

            {/* Location Selection */}
            <div>
              <label className="font-body text-sm text-dark-text-secondary mb-2 block font-semibold">
                Receiving Location *
              </label>
              <div className="grid grid-cols-1 gap-2">
                {locations.map(location => (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => setReceiveData({ ...receiveData, locationId: location.id })}
                    disabled={isSubmitting}
                    className={`p-4 rounded-lg border-2 transition-all font-heading font-semibold ${
                      receiveData.locationId === location.id
                        ? 'bg-gf-green-700 border-gf-green text-white'
                        : 'bg-dark-bg border-dark-border text-dark-text-primary active:bg-dark-card'
                    }`}
                    style={{ minHeight: '44px' }}
                  >
                    <div className="text-left">
                      <div className="text-lg">{location.name}</div>
                      {location.description && (
                        <div className={`text-xs font-body font-normal ${
                          receiveData.locationId === location.id ? 'text-white opacity-90' : 'text-dark-text-muted'
                        }`}>
                          {location.description}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Input */}
            <div>
              <label className="font-body text-sm text-dark-text-secondary mb-2 block font-semibold">
                Quantity *
              </label>

              <div className="grid grid-cols-5 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => handleQuickQuantity(-10)}
                  disabled={isSubmitting || receiveData.quantity <= 10}
                  className="bg-alert-red-bg border border-alert-red-border text-white font-heading font-semibold py-3 rounded-lg active:bg-alert-red transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ minHeight: '44px' }}
                >
                  -10
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickQuantity(-1)}
                  disabled={isSubmitting || receiveData.quantity <= 1}
                  className="bg-alert-red-bg border border-alert-red-border text-white font-heading font-semibold py-3 rounded-lg active:bg-alert-red transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ minHeight: '44px' }}
                >
                  -1
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickQuantity(1)}
                  disabled={isSubmitting}
                  className="bg-gf-green-700 border border-gf-green-600 text-white font-heading font-semibold py-3 rounded-lg active:bg-gf-green transition-colors"
                  style={{ minHeight: '44px' }}
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickQuantity(5)}
                  disabled={isSubmitting}
                  className="bg-gf-green-700 border border-gf-green-600 text-white font-heading font-semibold py-3 rounded-lg active:bg-gf-green transition-colors"
                  style={{ minHeight: '44px' }}
                >
                  +5
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickQuantity(10)}
                  disabled={isSubmitting}
                  className="bg-gf-green-700 border border-gf-green-600 text-white font-heading font-semibold py-3 rounded-lg active:bg-gf-green transition-colors"
                  style={{ minHeight: '44px' }}
                >
                  +10
                </button>
              </div>

              <input
                type="number"
                min="1"
                value={receiveData.quantity}
                onChange={(e) => setReceiveData({ ...receiveData, quantity: Number(e.target.value) })}
                disabled={isSubmitting}
                className="w-full bg-dark-bg border border-dark-border text-dark-text-primary font-heading text-2xl font-bold text-center px-4 py-3 rounded-lg focus:outline-none focus:border-gf-green"
                style={{ minHeight: '44px' }}
              />
            </div>

            {/* Optional: Batch Number */}
            <div>
              <label className="font-body text-sm text-dark-text-secondary mb-2 block font-semibold">
                Batch/Lot Number
                <span className="text-dark-text-muted ml-1">(optional)</span>
              </label>
              <input
                type="text"
                value={receiveData.batchNumber}
                onChange={(e) => setReceiveData({ ...receiveData, batchNumber: e.target.value })}
                disabled={isSubmitting}
                className="w-full bg-dark-bg border border-dark-border text-dark-text-primary font-body px-4 py-3 rounded-lg focus:outline-none focus:border-gf-green"
                style={{ minHeight: '44px' }}
                placeholder="e.g., LOT2024-001"
              />
            </div>

            {/* Optional: Expiry Date */}
            <div>
              <label className="font-body text-sm text-dark-text-secondary mb-2 block font-semibold">
                Expiration Date
                <span className="text-dark-text-muted ml-1">(optional)</span>
              </label>
              <input
                type="date"
                value={receiveData.expiresAt}
                onChange={(e) => setReceiveData({ ...receiveData, expiresAt: e.target.value })}
                disabled={isSubmitting}
                className="w-full bg-dark-bg border border-dark-border text-dark-text-primary font-body px-4 py-3 rounded-lg focus:outline-none focus:border-gf-green"
                style={{ minHeight: '44px' }}
              />
            </div>

            {/* Optional: Notes */}
            <div>
              <label className="font-body text-sm text-dark-text-secondary mb-2 block font-semibold">
                Notes
                <span className="text-dark-text-muted ml-1">(optional)</span>
              </label>
              <textarea
                value={receiveData.notes}
                onChange={(e) => setReceiveData({ ...receiveData, notes: e.target.value })}
                disabled={isSubmitting}
                rows={3}
                className="w-full bg-dark-bg border border-dark-border text-dark-text-primary font-body px-4 py-3 rounded-lg focus:outline-none focus:border-gf-green resize-none"
                placeholder="Additional notes about this receipt..."
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-alert-red-bg border border-alert-red-border rounded-lg">
                <p className="font-body text-sm text-alert-red">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="p-4 bg-gf-green-900 border border-gf-green rounded-lg">
                <p className="font-body text-sm text-gf-green-200 font-semibold">
                  ✓ Inventory received successfully!
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gf-green border-2 border-gf-green-600 text-white font-heading font-bold text-lg py-4 rounded-lg active:bg-gf-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              style={{ minHeight: '44px' }}
            >
              {isSubmitting ? 'Receiving...' : '✓ Receive Inventory'}
            </button>
          </form>
        )}

        {/* Transfer Form */}
        {mode === 'transfer' && (
          <form onSubmit={handleTransferSubmit} className="space-y-4">
            {/* Product Selection */}
            <div>
              <label className="font-body text-sm text-dark-text-secondary mb-2 block font-semibold">
                Product *
              </label>
              <select
                value={transferData.productId}
                onChange={(e) => setTransferData({ ...transferData, productId: e.target.value, fromLocationId: '', toLocationId: '' })}
                className="w-full bg-dark-bg border border-dark-border text-dark-text-primary font-body px-4 py-3 rounded-lg focus:outline-none focus:border-gf-green"
                style={{ minHeight: '44px' }}
                disabled={isSubmitting}
              >
                <option value="">Select a product...</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} {product.sku ? `(${product.sku})` : ''} - {product.unitSize}
                  </option>
                ))}
              </select>
              {selectedProduct && (
                <p className="font-body text-xs text-dark-text-muted mt-1">
                  {selectedProduct.description}
                </p>
              )}
            </div>

            {/* From Location */}
            <div>
              <label className="font-body text-sm text-dark-text-secondary mb-2 block font-semibold">
                From Location *
              </label>
              <div className="grid grid-cols-1 gap-2">
                {locations.map(location => {
                  const available = transferData.productId ? getAvailableQuantity(transferData.productId, location.id) : 0;
                  const isDisabled = !transferData.productId || available === 0;

                  return (
                    <button
                      key={location.id}
                      type="button"
                      onClick={() => setTransferData({ ...transferData, fromLocationId: location.id })}
                      disabled={isSubmitting || isDisabled}
                      className={`p-4 rounded-lg border-2 transition-all font-heading font-semibold ${
                        transferData.fromLocationId === location.id
                          ? 'bg-gf-green-700 border-gf-green text-white'
                          : isDisabled
                            ? 'bg-dark-bg border-dark-border text-dark-text-muted opacity-50 cursor-not-allowed'
                            : 'bg-dark-bg border-dark-border text-dark-text-primary active:bg-dark-card'
                      }`}
                      style={{ minHeight: '44px' }}
                    >
                      <div className="text-left">
                        <div className="flex justify-between items-center">
                          <span className="text-lg">{location.name}</span>
                          {transferData.productId && (
                            <span className={`text-sm font-body ${
                              transferData.fromLocationId === location.id ? 'text-white' : 'text-dark-text-secondary'
                            }`}>
                              Qty: {available}
                            </span>
                          )}
                        </div>
                        {location.description && (
                          <div className={`text-xs font-body font-normal ${
                            transferData.fromLocationId === location.id ? 'text-white opacity-90' : 'text-dark-text-muted'
                          }`}>
                            {location.description}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* To Location */}
            <div>
              <label className="font-body text-sm text-dark-text-secondary mb-2 block font-semibold">
                To Location *
              </label>
              <div className="grid grid-cols-1 gap-2">
                {locations.map(location => {
                  const isDisabled = !transferData.fromLocationId || location.id === transferData.fromLocationId;

                  return (
                    <button
                      key={location.id}
                      type="button"
                      onClick={() => setTransferData({ ...transferData, toLocationId: location.id })}
                      disabled={isSubmitting || isDisabled}
                      className={`p-4 rounded-lg border-2 transition-all font-heading font-semibold ${
                        transferData.toLocationId === location.id
                          ? 'bg-gf-green-700 border-gf-green text-white'
                          : isDisabled
                            ? 'bg-dark-bg border-dark-border text-dark-text-muted opacity-50 cursor-not-allowed'
                            : 'bg-dark-bg border-dark-border text-dark-text-primary active:bg-dark-card'
                      }`}
                      style={{ minHeight: '44px' }}
                    >
                      <div className="text-left">
                        <div className="text-lg">{location.name}</div>
                        {location.description && (
                          <div className={`text-xs font-body font-normal ${
                            transferData.toLocationId === location.id ? 'text-white opacity-90' : 'text-dark-text-muted'
                          }`}>
                            {location.description}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity Input */}
            {transferData.fromLocationId && (
              <div>
                <label className="font-body text-sm text-dark-text-secondary mb-2 block font-semibold">
                  Quantity * <span className="text-dark-text-muted">(Available: {availableQuantity})</span>
                </label>

                <div className="grid grid-cols-5 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => handleQuickQuantity(-10)}
                    disabled={isSubmitting || transferData.quantity <= 10}
                    className="bg-alert-red-bg border border-alert-red-border text-white font-heading font-semibold py-3 rounded-lg active:bg-alert-red transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ minHeight: '44px' }}
                  >
                    -10
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickQuantity(-1)}
                    disabled={isSubmitting || transferData.quantity <= 1}
                    className="bg-alert-red-bg border border-alert-red-border text-white font-heading font-semibold py-3 rounded-lg active:bg-alert-red transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ minHeight: '44px' }}
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickQuantity(1)}
                    disabled={isSubmitting || transferData.quantity >= availableQuantity}
                    className="bg-gf-green-700 border border-gf-green-600 text-white font-heading font-semibold py-3 rounded-lg active:bg-gf-green transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ minHeight: '44px' }}
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickQuantity(5)}
                    disabled={isSubmitting || transferData.quantity >= availableQuantity}
                    className="bg-gf-green-700 border border-gf-green-600 text-white font-heading font-semibold py-3 rounded-lg active:bg-gf-green transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ minHeight: '44px' }}
                  >
                    +5
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickQuantity(10)}
                    disabled={isSubmitting || transferData.quantity >= availableQuantity}
                    className="bg-gf-green-700 border border-gf-green-600 text-white font-heading font-semibold py-3 rounded-lg active:bg-gf-green transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ minHeight: '44px' }}
                  >
                    +10
                  </button>
                </div>

                <input
                  type="number"
                  min="1"
                  max={availableQuantity}
                  value={transferData.quantity}
                  onChange={(e) => setTransferData({ ...transferData, quantity: Math.min(Number(e.target.value), availableQuantity) })}
                  disabled={isSubmitting}
                  className="w-full bg-dark-bg border border-dark-border text-dark-text-primary font-heading text-2xl font-bold text-center px-4 py-3 rounded-lg focus:outline-none focus:border-gf-green"
                  style={{ minHeight: '44px' }}
                />
              </div>
            )}

            {/* Optional: Notes */}
            <div>
              <label className="font-body text-sm text-dark-text-secondary mb-2 block font-semibold">
                Notes
                <span className="text-dark-text-muted ml-1">(optional)</span>
              </label>
              <textarea
                value={transferData.notes}
                onChange={(e) => setTransferData({ ...transferData, notes: e.target.value })}
                disabled={isSubmitting}
                rows={3}
                className="w-full bg-dark-bg border border-dark-border text-dark-text-primary font-body px-4 py-3 rounded-lg focus:outline-none focus:border-gf-green resize-none"
                placeholder="Reason for transfer, job reference, etc..."
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-alert-red-bg border border-alert-red-border rounded-lg">
                <p className="font-body text-sm text-alert-red">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="p-4 bg-gf-green-900 border border-gf-green rounded-lg">
                <p className="font-body text-sm text-gf-green-200 font-semibold">
                  ✓ Transfer completed successfully!
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gf-green border-2 border-gf-green-600 text-white font-heading font-bold text-lg py-4 rounded-lg active:bg-gf-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              style={{ minHeight: '44px' }}
            >
              {isSubmitting ? 'Transferring...' : '🔄 Transfer Inventory'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
