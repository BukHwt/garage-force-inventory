import React, { useState, memo, useMemo, useEffect } from 'react';
import { Product, Location } from '../../types';
import { QuantityInput } from './shared/QuantityInput';
import { LocationPicker } from './shared/LocationPicker';

export interface UseInventoryData {
  productId: string;
  locationId: string;
  quantity: number;
  jobReference: string;
  notes?: string;
}

interface UseInventoryFormProps {
  products: Product[];
  locations: Location[];
  onSubmit: (data: UseInventoryData) => Promise<void>;
  initialProductId?: string;
  initialLocationId?: string;
  onClearPreFilled?: () => void;
  onCancel?: () => void;
}

/**
 * Form for using/consuming inventory on jobs
 * Tracks material usage with required job reference
 */
export const UseInventoryForm = memo(function UseInventoryForm({
  products,
  locations,
  onSubmit,
  initialProductId,
  initialLocationId,
  onClearPreFilled,
  onCancel,
}: UseInventoryFormProps) {
  const [formData, setFormData] = useState<UseInventoryData>({
    productId: initialProductId || '',
    locationId: initialLocationId || '',
    quantity: 1,
    jobReference: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Update form data when initial values change
  useEffect(() => {
    if (initialProductId || initialLocationId) {
      setFormData((prev) => ({
        ...prev,
        productId: initialProductId || prev.productId,
        locationId: initialLocationId || prev.locationId,
      }));
    }
  }, [initialProductId, initialLocationId]);

  const selectedProduct = products.find((p) => p.id === formData.productId);

  // Get available quantity at a specific location for the selected product
  const getAvailableQuantity = (productId: string, locationId: string): number => {
    if (!productId || !locationId) return 0;
    const product = products.find((p) => p.id === productId);
    if (!product) return 0;
    const inventoryItem = product.inventoryItems.find(
      (item) => item.location.id === locationId
    );
    return inventoryItem?.quantity || 0;
  };

  // Calculate available quantity at selected location
  const availableQuantity = useMemo(
    () => getAvailableQuantity(formData.productId, formData.locationId),
    [formData.productId, formData.locationId]
  );

  // Get inventory items for the selected product (for LocationPicker)
  const productInventoryItems = useMemo(
    () => selectedProduct?.inventoryItems || [],
    [selectedProduct]
  );

  // Determine which locations should be disabled (no inventory)
  const disabledLocations = useMemo(() => {
    if (!formData.productId) return locations.map((l) => l.id);
    return locations
      .filter((location) => getAvailableQuantity(formData.productId, location.id) === 0)
      .map((l) => l.id);
  }, [formData.productId, locations]);

  const handleProductChange = (productId: string) => {
    // Reset location when product changes
    setFormData({
      ...formData,
      productId,
      locationId: '',
      quantity: 1,
    });
  };

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

    if (!formData.jobReference.trim()) {
      setError('Job reference is required for usage tracking');
      return;
    }

    if (formData.quantity <= 0) {
      setError('Quantity must be greater than zero');
      return;
    }

    if (formData.quantity > availableQuantity) {
      setError(`Only ${availableQuantity} available at this location`);
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(formData);
      setSuccess(true);

      // Clear pre-filled data after successful submission
      if (onClearPreFilled) {
        onClearPreFilled();
      }

      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          productId: '',
          locationId: '',
          quantity: 1,
          jobReference: '',
          notes: '',
        });
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record usage');
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
          onChange={(e) => handleProductChange(e.target.value)}
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
        label="Used From Location *"
        inventoryItems={productInventoryItems}
        disabledLocationIds={disabledLocations}
        disabled={isSubmitting}
      />

      {/* Quantity Input - Only show when location is selected */}
      {formData.locationId && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-semibold text-dark-text-primary">
              Quantity Used *
            </label>
            <span className="text-xs text-dark-text-muted">
              Available: {availableQuantity}
            </span>
          </div>
          <QuantityInput
            value={formData.quantity}
            onChange={(quantity) => setFormData({ ...formData, quantity })}
            min={1}
            max={availableQuantity}
            disabled={isSubmitting}
          />
        </div>
      )}

      {/* Job Reference (Required) */}
      <div>
        <label className="block text-sm font-semibold text-dark-text-primary mb-2">
          Job Reference *
          <span className="text-xs text-dark-text-muted ml-2">(e.g., job number, customer name)</span>
        </label>
        <input
          type="text"
          value={formData.jobReference}
          onChange={(e) =>
            setFormData({ ...formData, jobReference: e.target.value })
          }
          disabled={isSubmitting}
          className="w-full bg-dark-bg border border-dark-border text-dark-text-primary px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gf-green"
          style={{ minHeight: '44px' }}
          placeholder="Job #12345 or Smith 2-Car Garage"
        />
        <p className="text-xs text-dark-text-muted mt-1">
          Required for job costing and material tracking
        </p>
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
          placeholder="Additional details about the usage..."
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
            ✓ Usage recorded successfully!
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gf-green border-2 border-gf-green-600 text-white font-heading font-bold text-lg py-4 rounded-lg active:bg-gf-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          style={{ minHeight: '44px' }}
        >
          {isSubmitting ? 'Recording...' : '🔧 Record Usage'}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full bg-dark-bg border-2 border-dark-border text-dark-text-secondary font-heading font-semibold text-base py-3 rounded-lg active:bg-dark-card transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: '44px' }}
          >
            Cancel Transaction
          </button>
        )}
      </div>
    </form>
  );
});
