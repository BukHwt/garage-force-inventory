import React from 'react';
import { Product } from '../../types';

interface InventoryActionModalProps {
  product: Product;
  locationId: string;
  isOpen: boolean;
  onClose: () => void;
  onUseFromOpen: (productId: string, locationId: string) => void;
  onOpenSealed: (product: Product, locationId: string) => void;
}

export function InventoryActionModal({
  product,
  locationId,
  isOpen,
  onClose,
  onUseFromOpen,
  onOpenSealed,
}: InventoryActionModalProps) {
  if (!isOpen) return null;

  // Filter inventory items for this location
  const locationInventory = product.inventoryItems.filter(
    item => item.location.id === locationId
  );

  const openItems = locationInventory.filter(item => item.status === 'OPEN');
  const sealedItems = locationInventory.filter(item => item.status === 'SEALED');

  const totalOpen = openItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalSealed = sealedItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-dark-card rounded-lg shadow-xl max-w-md w-full border border-dark-border">
        {/* Header */}
        <div className="border-b border-dark-border p-4">
          <h2 className="font-heading text-xl font-bold text-dark-text-primary">
            {product.name}
          </h2>
          <p className="font-body text-sm text-dark-text-secondary mt-1">
            What would you like to do?
          </p>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* Use from Open button */}
          {totalOpen > 0 && (
            <button
              onClick={() => {
                onUseFromOpen(product.id, locationId);
                onClose();
              }}
              className="w-full bg-amber-500 border border-amber-600 text-white font-heading font-semibold py-4 px-4 rounded-lg active:bg-amber-600 transition-colors flex items-center justify-between"
              style={{ minHeight: '44px' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">📦</span>
                <div className="text-left">
                  <div className="text-lg">Use Container</div>
                  <div className="text-sm font-body font-normal opacity-90">
                    {totalOpen} Open {product.unitSize || 'units'} available
                  </div>
                </div>
              </div>
              <span className="text-xl">→</span>
            </button>
          )}

          {/* Open Sealed button */}
          {totalSealed > 0 && (
            <button
              onClick={() => {
                onOpenSealed(product, locationId);
                onClose();
              }}
              className="w-full bg-gf-green border border-gf-green-600 text-white font-heading font-semibold py-4 px-4 rounded-lg active:bg-gf-green-700 transition-colors flex items-center justify-between"
              style={{ minHeight: '44px' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔓</span>
                <div className="text-left">
                  <div className="text-lg">Open Sealed Containers</div>
                  <div className="text-sm font-body font-normal opacity-90">
                    {totalSealed} sealed {product.unitSize || 'units'} available
                  </div>
                </div>
              </div>
              <span className="text-xl">→</span>
            </button>
          )}

          {/* No inventory available */}
          {totalOpen === 0 && totalSealed === 0 && (
            <div className="text-center py-8">
              <span className="text-4xl mb-2 block">📭</span>
              <p className="font-body text-dark-text-secondary">
                No inventory available at this location
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-dark-border p-4">
          <button
            onClick={onClose}
            className="w-full bg-dark-bg border border-dark-border text-dark-text-primary font-heading font-semibold py-3 rounded-lg active:bg-gf-charcoal-700 transition-colors"
            style={{ minHeight: '44px' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
