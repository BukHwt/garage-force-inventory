import React, { memo, useMemo, useState } from 'react';
import { Product, Location } from '../../types';
import { ProductPicker } from './shared/ProductPicker';
import { LocationPicker } from './shared/LocationPicker';
import { QuantityInput } from './shared/QuantityInput';

export interface UnsealInventoryData {
  productId: string;
  locationId: string;
  quantity: number;
}

interface UnsealInventoryFormProps {
  products: Product[];
  locations: Location[];
  onSubmit: (data: UnsealInventoryData) => Promise<void>;
  initialProductId?: string;
  initialLocationId?: string;
}

export const UnsealInventoryForm = memo(function UnsealInventoryForm({
  products,
  locations,
  onSubmit,
  initialProductId,
  initialLocationId,
}: UnsealInventoryFormProps) {
  const [formData, setFormData] = useState<UnsealInventoryData>({
    productId: initialProductId || '',
    locationId: initialLocationId && initialLocationId !== 'all' ? initialLocationId : '',
    quantity: 1,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === formData.productId),
    [products, formData.productId],
  );

  const unsealableProducts = useMemo(
    () =>
      products.filter((product) =>
        product.inventoryItems.some((item) => item.status === 'SEALED' && item.quantity > 0),
      ),
    [products],
  );

  const sealedAvailable = useMemo(() => {
    if (!selectedProduct || !formData.locationId) return 0;
    return selectedProduct.inventoryItems
      .filter((item) => item.location.id === formData.locationId && item.status === 'SEALED')
      .reduce((sum, item) => sum + item.quantity, 0);
  }, [formData.locationId, selectedProduct]);

  const disabledLocations = useMemo(() => {
    if (!selectedProduct) return locations.map((location) => location.id);
    return locations
      .filter((location) => {
        const sealedQty = selectedProduct.inventoryItems
          .filter((item) => item.location.id === location.id && item.status === 'SEALED')
          .reduce((sum, item) => sum + item.quantity, 0);
        return sealedQty === 0;
      })
      .map((location) => location.id);
  }, [locations, selectedProduct]);

  const handleProductChange = (productId: string) => {
    if (productId === formData.productId) {
      return;
    }

    setFormData({
      productId,
      locationId: '',
      quantity: 1,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!formData.productId) {
      setError('Please select a product');
      return;
    }

    if (!formData.locationId) {
      setError('Please select a location');
      return;
    }

    if (!Number.isInteger(formData.quantity) || formData.quantity <= 0) {
      setError('Quantity must be a whole number greater than zero');
      return;
    }

    if (formData.quantity > sealedAvailable) {
      setError(`Only ${sealedAvailable} sealed containers available at this location`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setSuccess(true);
      setFormData((prev) => ({ ...prev, quantity: 1 }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open sealed containers');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ProductPicker
        products={unsealableProducts}
        selectedProductId={formData.productId}
        onProductChange={handleProductChange}
        label="Product *"
        showInStockToggle={false}
        defaultInStockOnly={false}
        disabled={isSubmitting}
      />

      <LocationPicker
        locations={locations}
        selectedLocationId={formData.locationId}
        onLocationChange={(locationId) => setFormData((prev) => ({ ...prev, locationId, quantity: 1 }))}
        label="Location *"
        disabledLocationIds={disabledLocations}
        disabled={isSubmitting}
      />

      {formData.locationId && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-semibold text-dark-text-primary">Quantity To Open *</label>
            <span className="text-xs text-dark-text-muted">Sealed available: {sealedAvailable}</span>
          </div>
          <QuantityInput
            value={formData.quantity}
            onChange={(quantity) => setFormData((prev) => ({ ...prev, quantity }))}
            min={1}
            max={Math.max(1, sealedAvailable)}
            disabled={isSubmitting || sealedAvailable === 0}
          />
        </div>
      )}

      {error && (
        <div className="p-4 bg-alert-red-bg border border-alert-red-border rounded-lg">
          <p className="text-sm text-alert-red">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-gf-green-900 border border-gf-green rounded-lg">
          <p className="text-sm text-gf-green-200 font-semibold">Opened sealed containers successfully.</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-gf-green border-2 border-gf-green-600 text-white font-heading font-bold text-lg py-4 rounded-lg active:bg-gf-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        style={{ minHeight: '44px' }}
      >
        {isSubmitting ? 'Opening...' : 'Open Sealed Containers'}
      </button>
    </form>
  );
});
