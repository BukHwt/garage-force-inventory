import React, { useState } from 'react';
import { InventoryItem } from '../../types';

interface InventoryAdjustmentModalProps {
  inventoryItem: InventoryItem;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
  onAdjust: (inventoryItemId: string, adjustment: number) => Promise<void>;
}

export function InventoryAdjustmentModal({
  inventoryItem,
  productName,
  isOpen,
  onClose,
  onAdjust,
}: InventoryAdjustmentModalProps) {
  const [adjustment, setAdjustment] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const newQuantity = inventoryItem.quantity + adjustment;
  const isValidAdjustment = newQuantity >= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidAdjustment) {
      setError('Cannot reduce quantity below zero');
      return;
    }

    if (adjustment === 0) {
      setError('Please enter an adjustment amount');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onAdjust(inventoryItem.id, adjustment);
      setAdjustment(0);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adjust inventory');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAdjust = (amount: number) => {
    setAdjustment(prev => prev + amount);
    setError(null);
  };

  const handleClose = () => {
    setAdjustment(0);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-dark-card rounded-lg shadow-xl max-w-md w-full border border-dark-border">
        {/* Header */}
        <div className="border-b border-dark-border p-4">
          <h2 className="font-heading text-xl font-bold text-dark-text-primary">
            Adjust Inventory
          </h2>
          <p className="font-body text-sm text-dark-text-secondary mt-1">
            {productName}
          </p>
          <p className="font-body text-xs text-dark-text-muted">
            {inventoryItem.location.name}
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4">
          {/* Current Quantity Display */}
          <div className="bg-dark-bg rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-body text-sm text-dark-text-secondary">Current:</span>
              <span className="font-heading text-2xl font-bold text-dark-text-primary">
                {inventoryItem.quantity}
              </span>
            </div>

            <div className="flex justify-between items-center mb-2">
              <span className="font-body text-sm text-dark-text-secondary">Adjustment:</span>
              <span className={`font-heading text-xl font-semibold transition-colors ${
                adjustment === 0
                  ? 'text-dark-text-muted'
                  : adjustment > 0
                    ? 'text-gf-green'
                    : 'text-alert-red'
              }`}>
                {adjustment > 0 ? '+' : ''}{adjustment}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-dark-border">
              <span className="font-body text-sm text-dark-text-secondary">New Total:</span>
              <span className={`font-heading text-2xl font-bold transition-colors ${
                adjustment === 0
                  ? 'text-dark-text-secondary'
                  : isValidAdjustment
                    ? 'text-dark-text-primary'
                    : 'text-alert-red'
              }`}>
                {newQuantity}
              </span>
            </div>
          </div>

          {/* Quick Adjustment Buttons */}
          <div className="mb-4">
            <label className="font-body text-sm text-dark-text-secondary mb-2 block">
              Quick Adjust:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickAdjust(-10)}
                className="bg-alert-red-bg border border-alert-red-border text-white font-heading font-semibold py-3 rounded-lg active:bg-alert-red transition-colors"
                style={{ minHeight: '44px' }}
              >
                -10
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdjust(-1)}
                className="bg-alert-red-bg border border-alert-red-border text-white font-heading font-semibold py-3 rounded-lg active:bg-alert-red transition-colors"
                style={{ minHeight: '44px' }}
              >
                -1
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdjust(1)}
                className="bg-gf-green-700 border border-gf-green-600 text-white font-heading font-semibold py-3 rounded-lg active:bg-gf-green transition-colors"
                style={{ minHeight: '44px' }}
              >
                +1
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                onClick={() => handleQuickAdjust(5)}
                className="bg-gf-green-700 border border-gf-green-600 text-white font-heading font-semibold py-3 rounded-lg active:bg-gf-green transition-colors"
                style={{ minHeight: '44px' }}
              >
                +5
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdjust(10)}
                className="bg-gf-green-700 border border-gf-green-600 text-white font-heading font-semibold py-3 rounded-lg active:bg-gf-green transition-colors"
                style={{ minHeight: '44px' }}
              >
                +10
              </button>
            </div>
          </div>

          {/* Manual Adjustment Input */}
          <div className="mb-4">
            <label className="font-body text-sm text-dark-text-secondary mb-2 block">
              Or enter custom amount:
            </label>
            <input
              type="number"
              value={adjustment}
              onChange={(e) => {
                setAdjustment(Number(e.target.value));
                setError(null);
              }}
              className="w-full bg-dark-bg border border-dark-border text-dark-text-primary font-body px-4 py-3 rounded-lg focus:outline-none focus:border-gf-green"
              style={{ minHeight: '44px' }}
              placeholder="0"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-alert-red-bg border border-alert-red-border rounded-lg">
              <p className="font-body text-sm text-alert-red">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 bg-dark-bg border border-dark-border text-dark-text-primary font-heading font-semibold py-3 rounded-lg active:bg-gf-charcoal-700 transition-colors disabled:opacity-50"
              style={{ minHeight: '44px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || adjustment === 0 || !isValidAdjustment}
              className="flex-1 bg-gf-green border border-gf-green-600 text-white font-heading font-semibold py-3 rounded-lg active:bg-gf-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: '44px' }}
            >
              {isSubmitting ? 'Adjusting...' : 'Apply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
