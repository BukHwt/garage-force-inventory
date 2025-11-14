import React, { useEffect, useMemo, useState } from 'react';
import { Product, Location } from '../../types';
import { receiveInventory } from '../../api/services/inventory';
import { QuantityInput } from './shared/QuantityInput';
import { LocationPicker } from './shared/LocationPicker';

interface QuickReceiveModalProps {
  product: Product;
  locations: Location[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

export function QuickReceiveModal({
  product,
  locations,
  isOpen,
  onClose,
  onSuccess,
}: QuickReceiveModalProps) {
  const [locationId, setLocationId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [batchNumber, setBatchNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const defaultLocationId = useMemo(() => {
    if (product.inventoryItems?.length) {
      return product.inventoryItems[0].location.id;
    }
    return locations[0]?.id ?? '';
  }, [product.inventoryItems, locations]);

  useEffect(() => {
    if (isOpen) {
      setLocationId(defaultLocationId);
      setQuantity(1);
      setBatchNumber('');
      setNotes('');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, defaultLocationId]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!locationId) {
      setError('Select a location to receive inventory.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await receiveInventory({
        productId: product.id,
        locationId,
        quantity,
        batchNumber: batchNumber || undefined,
        notes: notes || undefined,
      });
      setSuccess(true);
      await onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to receive inventory.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4">
      <div className="bg-dark-card border border-dark-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase text-dark-text-muted tracking-wide">Receive Inventory</p>
            <h2 className="font-heading text-2xl text-dark-text-primary">{product.name}</h2>
            {product.unitSize && (
              <p className="text-sm text-dark-text-secondary">{product.unitSize}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-dark-text-muted hover:text-dark-text-primary text-2xl"
          >
            ×
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <LocationPicker
            locations={locations}
            selectedLocationId={locationId}
            onLocationChange={setLocationId}
            label="Receive To Location"
            disabled={isSubmitting}
          />

          <QuantityInput
            value={quantity}
            onChange={setQuantity}
            min={1}
            label="Quantity Received"
            disabled={isSubmitting}
          />

          <div>
            <label className="block text-sm font-semibold text-dark-text-primary mb-2">
              Batch / Lot (optional)
            </label>
            <input
              type="text"
              value={batchNumber}
              onChange={(event) => setBatchNumber(event.target.value)}
              disabled={isSubmitting}
              className="w-full bg-dark-bg border border-dark-border text-dark-text-primary px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gf-green"
              placeholder="e.g., PO-12345"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-dark-text-primary mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={isSubmitting}
              rows={3}
              className="w-full bg-dark-bg border border-dark-border text-dark-text-primary px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gf-green resize-none"
              placeholder="Delivery reference, driver, etc."
            />
          </div>

          {error && (
            <div className="p-3 bg-alert-red-bg border border-alert-red-border text-alert-red text-sm rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-gf-green-900 border border-gf-green text-gf-green-100 text-sm rounded-lg">
              Inventory received!
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gf-green border-2 border-gf-green-600 text-white font-heading font-bold text-lg py-3 rounded-lg active:bg-gf-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Receiving...' : 'Receive Inventory'}
          </button>
        </form>
      </div>
    </div>
  );
}
