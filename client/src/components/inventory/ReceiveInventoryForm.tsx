import React, { useState, memo } from 'react';
import { Product, Location } from '../../types';
import { QuantityInput } from './shared/QuantityInput';
import { LocationPicker } from './shared/LocationPicker';

export interface ReceiveInventoryData {
  productId: string;
  locationId: string;
  quantity: number;
  batchNumber?: string;
  expiresAt?: string;
  notes?: string;
}

interface ReceiveInventoryFormProps {
  products: Product[];
  locations: Location[];
  onSubmit: (data: ReceiveInventoryData) => Promise<void>;
}

/**
 * Form for receiving new inventory shipments
 * Manages its own state and validation
 */
export const ReceiveInventoryForm = memo(function ReceiveInventoryForm({
  products,
  locations,
  onSubmit,
}: ReceiveInventoryFormProps) {
  const [formData, setFormData] = useState<ReceiveInventoryData>({
    productId: '',
    locationId: '',
    quantity: 1,
    batchNumber: '',
    expiresAt: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedProduct = products.find((p) => p.id === formData.productId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!formData.productId) {
      setError('Please select a product');
      return;
    }

    if (!formData.locationId) {
      setError('Please select a location');
      return;
    }

    if (formData.quantity <= 0) {
      setError('Quantity must be greater than zero');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(formData);
      setSuccess(true);

      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Product Selection */}
      <div>
        <label className="block text-sm font-semibold text-dark-text-primary mb-2">
          Product *
        </label>
        <select
          value={formData.productId}
          onChange={(e) =>
            setFormData({ ...formData, productId: e.target.value })
          }
          className="w-full bg-dark-bg border border-dark-border text-dark-text-primary px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gf-green"
          style={{ minHeight: '44px' }}
          disabled={isSubmitting}
        >
          <option value="">Select a product...</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} {product.sku ? `(${product.sku})` : ''} -{' '}
              {product.unitSize}
            </option>
          ))}
        </select>
        {selectedProduct?.description && (
          <p className="text-xs text-dark-text-muted mt-1">
            {selectedProduct.description}
          </p>
        )}
      </div>

      {/* Location Selection */}
      <LocationPicker
        locations={locations}
        selectedLocationId={formData.locationId}
        onLocationChange={(locationId) =>
          setFormData({ ...formData, locationId })
        }
        label="Receiving Location *"
        disabled={isSubmitting}
      />

      {/* Quantity Input */}
      <QuantityInput
        value={formData.quantity}
        onChange={(quantity) => setFormData({ ...formData, quantity })}
        min={1}
        label="Quantity *"
        disabled={isSubmitting}
      />

      {/* Optional: Batch Number */}
      <div>
        <label className="block text-sm font-semibold text-dark-text-primary mb-2">
          Batch/Lot Number
          <span className="text-dark-text-muted ml-1">(optional)</span>
        </label>
        <input
          type="text"
          value={formData.batchNumber}
          onChange={(e) =>
            setFormData({ ...formData, batchNumber: e.target.value })
          }
          disabled={isSubmitting}
          className="w-full bg-dark-bg border border-dark-border text-dark-text-primary px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gf-green"
          style={{ minHeight: '44px' }}
          placeholder="e.g., LOT2024-001"
        />
      </div>

      {/* Optional: Expiry Date */}
      <div>
        <label className="block text-sm font-semibold text-dark-text-primary mb-2">
          Expiration Date
          <span className="text-dark-text-muted ml-1">(optional)</span>
        </label>
        <input
          type="date"
          value={formData.expiresAt}
          onChange={(e) =>
            setFormData({ ...formData, expiresAt: e.target.value })
          }
          disabled={isSubmitting}
          className="w-full bg-dark-bg border border-dark-border text-dark-text-primary px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gf-green"
          style={{ minHeight: '44px' }}
        />
      </div>

      {/* Optional: Notes */}
      <div>
        <label className="block text-sm font-semibold text-dark-text-primary mb-2">
          Notes
          <span className="text-dark-text-muted ml-1">(optional)</span>
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          disabled={isSubmitting}
          rows={3}
          className="w-full bg-dark-bg border border-dark-border text-dark-text-primary px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gf-green resize-none"
          placeholder="Additional notes about this receipt..."
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-alert-red-bg border border-alert-red-border rounded-lg">
          <p className="text-sm text-alert-red">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="p-4 bg-gf-green-900 border border-gf-green rounded-lg">
          <p className="text-sm text-gf-green-200 font-semibold">
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
  );
});
