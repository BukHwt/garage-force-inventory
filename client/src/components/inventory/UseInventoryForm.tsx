import React, { useState, memo, useMemo, useEffect, useCallback } from 'react';
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
  const [preferredStatus, setPreferredStatus] = useState<'OPEN' | 'SEALED'>('OPEN');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Get available quantity at a specific location for the selected product by status
  const getAvailableQuantity = useCallback((productId: string, locationId: string, status?: 'OPEN' | 'SEALED'): number => {
    if (!productId || !locationId) return 0;
    const product = products.find((p) => p.id === productId);
    if (!product) return 0;

    const inventoryItems = product.inventoryItems.filter(
      (item) => item.location.id === locationId && (!status || item.status === status)
    );
    return inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [products]);

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

  // Auto-switch status if preferred status has no inventory at selected location
  useEffect(() => {
    if (formData.locationId && formData.productId) {
      const openQty = getAvailableQuantity(formData.productId, formData.locationId, 'OPEN');
      const sealedQty = getAvailableQuantity(formData.productId, formData.locationId, 'SEALED');

      // If preferred is OPEN but no open inventory, switch to SEALED
      if (preferredStatus === 'OPEN' && openQty === 0 && sealedQty > 0) {
        setPreferredStatus('SEALED');
      }
      // If preferred is SEALED but no sealed inventory, switch to OPEN
      else if (preferredStatus === 'SEALED' && sealedQty === 0 && openQty > 0) {
        setPreferredStatus('OPEN');
      }
    }
  }, [formData.locationId, formData.productId, preferredStatus, getAvailableQuantity]);

  const selectedProduct = products.find((p) => p.id === formData.productId);
  const isSingleUse = selectedProduct?.consumableType === 'SINGLE_USE';

  // Single-use items should always be treated as sealed usage
  useEffect(() => {
    if (isSingleUse && preferredStatus !== 'SEALED') {
      setPreferredStatus('SEALED');
    }
  }, [isSingleUse, preferredStatus]);

  // Calculate available quantity at selected location for preferred status
  const availableQuantity = useMemo(
    () => getAvailableQuantity(formData.productId, formData.locationId, preferredStatus),
    [formData.productId, formData.locationId, preferredStatus, getAvailableQuantity]
  );

  // Calculate quantities for both statuses to show in UI
  const openQuantity = useMemo(
    () => getAvailableQuantity(formData.productId, formData.locationId, 'OPEN'),
    [formData.productId, formData.locationId, getAvailableQuantity]
  );

  const sealedQuantity = useMemo(
    () => getAvailableQuantity(formData.productId, formData.locationId, 'SEALED'),
    [formData.productId, formData.locationId, getAvailableQuantity]
  );

  // Get inventory items for the selected product (for LocationPicker)
  const productInventoryItems = useMemo(
    () => selectedProduct?.inventoryItems || [],
    [selectedProduct]
  );

  // Determine which locations should be disabled (no inventory at all, regardless of status)
  const disabledLocations = useMemo(() => {
    if (!formData.productId) return locations.map((l) => l.id);
    return locations
      .filter((location) => {
        // Disable if no inventory of any status at this location
        const totalQty = getAvailableQuantity(formData.productId, location.id);
        return totalQty === 0;
      })
      .map((l) => l.id);
  }, [formData.productId, locations, getAvailableQuantity]);

  const handleProductChange = (productId: string) => {
    // Reset location and preferred status when product changes
    setFormData({
      ...formData,
      productId,
      locationId: '',
      quantity: 1,
    });
    setPreferredStatus('OPEN'); // Reset to default
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
        setPreferredStatus('OPEN'); // Reset to default
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

      {/* Container Status Selection - Only show when location is selected */}
      {formData.locationId && !isSingleUse && (openQuantity > 0 || sealedQuantity > 0) && (
        <div>
          <label className="block text-sm font-semibold text-dark-text-primary mb-2">
            Use From:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPreferredStatus('OPEN')}
              disabled={openQuantity === 0 || isSubmitting}
              className={`font-heading font-semibold py-3 rounded-lg transition-all border-2 ${
                preferredStatus === 'OPEN'
                  ? 'bg-amber-500 border-amber-600 text-white'
                  : 'bg-dark-bg border-dark-border text-dark-text-secondary active:bg-dark-card'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              style={{ minHeight: '44px' }}
            >
              <div className="text-lg mb-1">📦</div>
              <div className="text-sm">Open Containers</div>
              <div className="text-xs opacity-80">{openQuantity} available</div>
            </button>
            <button
              type="button"
              onClick={() => setPreferredStatus('SEALED')}
              disabled={sealedQuantity === 0 || isSubmitting}
              className={`font-heading font-semibold py-3 rounded-lg transition-all border-2 ${
                preferredStatus === 'SEALED'
                  ? 'bg-gf-green border-gf-green-600 text-white'
                  : 'bg-dark-bg border-dark-border text-dark-text-secondary active:bg-dark-card'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              style={{ minHeight: '44px' }}
            >
              <div className="text-lg mb-1">🔒</div>
              <div className="text-sm">Sealed Containers</div>
              <div className="text-xs opacity-80">{sealedQuantity} available</div>
            </button>
          </div>
          {openQuantity > 0 && preferredStatus === 'SEALED' && (
            <p className="text-xs text-amber-400 mt-2">
              ℹ️ Note: {openQuantity} open container{openQuantity !== 1 ? 's' : ''} should be used first to prevent waste
            </p>
          )}
        </div>
      )}


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
