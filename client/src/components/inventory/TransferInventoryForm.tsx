import React, { useState, memo, useMemo, useCallback } from "react";
import { Product, Location } from "../../types";
import { QuantityInput } from "./shared/QuantityInput";
import { LocationPicker } from "./shared/LocationPicker";

export interface TransferInventoryData {
  productId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  notes?: string;
}
interface TransferInventoryFormProps {
  products: Product[];
  locations: Location[];
  onSubmit: (data: TransferInventoryData) => Promise<void>;
}

/**
 * Form for transferring inventory between locations
 * Includes smart validation based on available quantities
 */
export const TransferInventoryForm = memo(function TransferInventoryForm({
  products,
  locations,
  onSubmit,
}: TransferInventoryFormProps) {
  const [formData, setFormData] = useState<TransferInventoryData>({
    productId: "",
    fromLocationId: "",
    toLocationId: "",
    quantity: 1,
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const inventoryProducts = useMemo(
    () =>
      products.filter((product) =>
        product.inventoryItems.some((item) => item.quantity > 0)
      ),
    [products]
  );

  const selectedProduct = inventoryProducts.find((p) => p.id === formData.productId) ?? products.find((p) => p.id === formData.productId);

  // Get available quantity at a specific location for the selected product
  const getAvailableQuantity = useCallback(
    (productId: string, locationId: string): number => {
      if (!productId || !locationId) return 0;
      const product = products.find((p) => p.id === productId);
      if (!product) return 0;
      return product.inventoryItems
        .filter((item) => item.location.id === locationId)
        .reduce((sum, item) => sum + item.quantity, 0);
    },
    [products]
  );

  // Calculate available quantity at source location
  const availableQuantity = useMemo(
    () => getAvailableQuantity(formData.productId, formData.fromLocationId),
    [formData.productId, formData.fromLocationId, getAvailableQuantity]
  );

  // Get inventory items for the selected product (for LocationPicker)
  const productInventoryItems = useMemo(
    () => selectedProduct?.inventoryItems || [],
    [selectedProduct]
  );

  // Determine which locations should be disabled for "From" selection
  const disabledFromLocations = useMemo(() => {
    if (!formData.productId) return locations.map((l) => l.id);
    return locations
      .filter(
        (location) =>
          getAvailableQuantity(formData.productId, location.id) === 0
      )
      .map((l) => l.id);
  }, [formData.productId, locations, getAvailableQuantity]);

  // Determine which locations should be disabled for "To" selection
  const disabledToLocations = useMemo(() => {
    if (!formData.fromLocationId) return locations.map((l) => l.id);
    return [formData.fromLocationId]; // Can't transfer to the same location
  }, [formData.fromLocationId, locations]);

  const handleProductChange = (productId: string) => {
    // Reset locations when product changes
    setFormData({
      ...formData,
      productId,
      fromLocationId: "",
      toLocationId: "",
      quantity: 1,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!formData.productId) {
      setError("Please select a product");
      return;
    }

    if (!formData.fromLocationId) {
      setError("Please select a source location");
      return;
    }

    if (!formData.toLocationId) {
      setError("Please select a destination location");
      return;
    }

    if (formData.fromLocationId === formData.toLocationId) {
      setError("Source and destination must be different");
      return;
    }

    if (formData.quantity <= 0) {
      setError("Quantity must be greater than zero");
      return;
    }

    if (formData.quantity > availableQuantity) {
      setError(`Only ${availableQuantity} available at source location`);
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(formData);
      setSuccess(true);

      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          productId: "",
          fromLocationId: "",
          toLocationId: "",
          quantity: 1,
          notes: "",
        });
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to transfer inventory"
      );
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
          style={{ minHeight: "44px" }}
          disabled={isSubmitting}
        >
          <option value="">Select a product...</option>
          {inventoryProducts.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} {product.sku ? `(${product.sku})` : ""} -{" "}
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

      {/* From Location */}
      <LocationPicker
        locations={locations}
        selectedLocationId={formData.fromLocationId}
        onLocationChange={(locationId) =>
          setFormData({
            ...formData,
            fromLocationId: locationId,
            toLocationId: "",
          })
        }
        label="From Location *"
        inventoryItems={productInventoryItems}
        disabledLocationIds={disabledFromLocations}
        disabled={isSubmitting}
      />

      {/* To Location */}
      <LocationPicker
        locations={locations}
        selectedLocationId={formData.toLocationId}
        onLocationChange={(locationId) =>
          setFormData({ ...formData, toLocationId: locationId })
        }
        label="To Location *"
        disabledLocationIds={disabledToLocations}
        disabled={isSubmitting}
      />

      {/* Quantity Input - Only show when source location is selected */}
      {formData.fromLocationId && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-semibold text-dark-text-primary">
              Quantity *
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
          placeholder="Reason for transfer, job reference, etc..."
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
            ✓ Transfer completed successfully!
          </p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-gf-green border-2 border-gf-green-600 text-white font-heading font-bold text-lg py-4 rounded-lg active:bg-gf-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        style={{ minHeight: "44px" }}
      >
        {isSubmitting ? "Transferring..." : "🔄 Transfer Inventory"}
      </button>
    </form>
  );
});
