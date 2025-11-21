import React, { useState } from 'react';
import { Product } from '../../types';

interface UnsealModalProps {
  product: Product;
  locationId: string;
  maxQuantity: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
}

export function UnsealModal({
  product,
  locationId,
  maxQuantity,
  isOpen,
  onClose,
  onConfirm,
}: UnsealModalProps) {
  const [quantity, setQuantity] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (quantity <= 0) {
      setError('Quantity must be greater than zero');
      return;
    }

    if (quantity > maxQuantity) {
      setError(`Only ${maxQuantity} sealed containers available`);
      return;
    }

    onConfirm(quantity);
    setQuantity(1); // Reset for next time
  };

  const handleQuickSelect = (amount: number) => {
    const newQuantity = Math.min(amount, maxQuantity);
    setQuantity(newQuantity);
    setError(null);
  };

  const handleClose = () => {
    setQuantity(1);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-dark-card rounded-lg shadow-xl max-w-md w-full border border-dark-border">
        {/* Header */}
        <div className="border-b border-dark-border p-4">
          <h2 className="font-heading text-xl font-bold text-dark-text-primary">
            Open Sealed Containers
          </h2>
          <p className="font-body text-sm text-dark-text-secondary mt-1">
            {product.name}
          </p>
          <p className="font-body text-xs text-dark-text-muted mt-2">
            Optional: Open sealed containers now, or use them sealed directly from the Use tab
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4">
          {/* Info Display */}
          <div className="bg-dark-bg rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-body text-sm text-dark-text-secondary">Sealed Available:</span>
              <span className="font-heading text-2xl font-bold text-gf-green">
                {maxQuantity}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-dark-border">
              <span className="font-body text-sm text-dark-text-secondary">Unsealing:</span>
              <span className="font-heading text-2xl font-bold text-amber-400">
                {quantity}
              </span>
            </div>
          </div>

          {/* Quick Select Buttons */}
          <div className="mb-4">
            <label className="font-body text-sm text-dark-text-secondary mb-2 block">
              Quick Select:
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleQuickSelect(1)}
                className={`font-heading font-semibold py-3 rounded-lg transition-all border-2 ${
                  quantity === 1
                    ? 'bg-amber-500 border-amber-600 text-white'
                    : 'bg-dark-bg border-dark-border text-dark-text-secondary active:bg-dark-card'
                }`}
                style={{ minHeight: '44px' }}
              >
                1
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(3)}
                disabled={maxQuantity < 3}
                className={`font-heading font-semibold py-3 rounded-lg transition-all border-2 ${
                  quantity === 3
                    ? 'bg-amber-500 border-amber-600 text-white'
                    : 'bg-dark-bg border-dark-border text-dark-text-secondary active:bg-dark-card'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                style={{ minHeight: '44px' }}
              >
                3
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(5)}
                disabled={maxQuantity < 5}
                className={`font-heading font-semibold py-3 rounded-lg transition-all border-2 ${
                  quantity === 5
                    ? 'bg-amber-500 border-amber-600 text-white'
                    : 'bg-dark-bg border-dark-border text-dark-text-secondary active:bg-dark-card'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                style={{ minHeight: '44px' }}
              >
                5
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(maxQuantity)}
                className={`font-heading font-semibold py-3 rounded-lg transition-all border-2 ${
                  quantity === maxQuantity
                    ? 'bg-amber-500 border-amber-600 text-white'
                    : 'bg-dark-bg border-dark-border text-dark-text-secondary active:bg-dark-card'
                }`}
                style={{ minHeight: '44px' }}
              >
                All
              </button>
            </div>
          </div>

          {/* Manual Input with Increment/Decrement */}
          <div className="mb-4">
            <label className="font-body text-sm text-dark-text-secondary mb-2 block">
              Or enter custom amount:
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (quantity > 1) {
                    setQuantity(quantity - 1);
                    setError(null);
                  }
                }}
                disabled={quantity <= 1}
                className="bg-dark-bg border border-dark-border text-dark-text-primary font-heading font-bold text-xl px-4 rounded-lg active:bg-dark-card transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ minHeight: '44px', width: '44px' }}
              >
                −
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => {
                  setQuantity(Number(e.target.value));
                  setError(null);
                }}
                min={1}
                max={maxQuantity}
                className="flex-1 bg-dark-bg border border-dark-border text-dark-text-primary font-body text-center px-4 py-3 rounded-lg focus:outline-none focus:border-amber-500"
                style={{ minHeight: '44px' }}
              />
              <button
                type="button"
                onClick={() => {
                  if (quantity < maxQuantity) {
                    setQuantity(quantity + 1);
                    setError(null);
                  }
                }}
                disabled={quantity >= maxQuantity}
                className="bg-dark-bg border border-dark-border text-dark-text-primary font-heading font-bold text-xl px-4 rounded-lg active:bg-dark-card transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ minHeight: '44px', width: '44px' }}
              >
                +
              </button>
            </div>
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
              className="flex-1 bg-dark-bg border border-dark-border text-dark-text-primary font-heading font-semibold py-3 rounded-lg active:bg-gf-charcoal-700 transition-colors"
              style={{ minHeight: '44px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-amber-500 border border-amber-600 text-white font-heading font-semibold py-3 rounded-lg active:bg-amber-600 transition-colors"
              style={{ minHeight: '44px' }}
            >
              🔓 Open {quantity > 1 ? `${quantity} Containers` : 'Container'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
