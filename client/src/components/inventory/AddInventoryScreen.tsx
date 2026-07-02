import React, { useEffect, useState } from 'react';
import { Location, Product } from '../../types';
import { ReceiveInventoryData, ReceiveInventoryForm } from './ReceiveInventoryForm';
import { TransferInventoryData, TransferInventoryForm } from './TransferInventoryForm';
import { UnsealInventoryData, UnsealInventoryForm } from './UnsealInventoryForm';
import { UseInventoryData, UseInventoryForm } from './UseInventoryForm';

export type InventoryMode = 'receive' | 'transfer' | 'use' | 'unseal';
const MANAGE_MODE_OPTIONS: Array<{ id: InventoryMode; label: string; icon: string }> = [
  { id: 'receive', label: 'Receive', icon: '\u{1F4E6}' },
  { id: 'transfer', label: 'Transfer', icon: '\u{1F504}' },
  { id: 'unseal', label: 'Unseal', icon: '\u{1F513}' },
  { id: 'use', label: 'Use', icon: '\u{1F527}' },
];

interface AddInventoryScreenProps {
  products: Product[];
  locations: Location[];
  onReceive: (data: ReceiveInventoryData) => Promise<void>;
  onTransfer: (data: TransferInventoryData) => Promise<void>;
  onUse: (data: UseInventoryData) => Promise<void>;
  onUnseal: (data: UnsealInventoryData) => Promise<void>;
  initialMode?: InventoryMode;
  initialProductId?: string;
  initialLocationId?: string;
  onClearPreFilled?: () => void;
  onCancel?: () => void;
  onModeChange?: (mode: InventoryMode) => void;
}

export function AddInventoryScreen({
  products,
  locations,
  onReceive,
  onTransfer,
  onUse,
  onUnseal,
  initialMode,
  initialProductId,
  initialLocationId,
  onClearPreFilled,
  onCancel,
  onModeChange,
}: AddInventoryScreenProps) {
  const [mode, setMode] = useState<InventoryMode>(initialMode || 'receive');
  const [prefill, setPrefill] = useState<{
    productId?: string;
    locationId?: string;
  }>();

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  useEffect(() => {
    if (initialProductId || initialLocationId) {
      setPrefill({ productId: initialProductId, locationId: initialLocationId });
    }
  }, [initialProductId, initialLocationId]);

  useEffect(() => {
    if (mode !== initialMode) {
      onModeChange?.(mode);
    }
  }, [initialMode, mode, onModeChange]);

  return (
    <div className="min-h-screen bg-dark-bg pb-20">
      <div className="bg-dark-card border-b-2 border-gf-green p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 text-dark-text-secondary hover:text-gf-green active:text-gf-green-600 transition-colors"
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              <span className="text-2xl">{'<'}</span>
            </button>
          )}
          <h1 className="font-heading text-2xl font-bold text-dark-text-primary flex-1">
            Manage Inventory
          </h1>
        </div>
        <p className="font-body text-sm text-dark-text-secondary">
          Receive, transfer, open sealed, or record usage
        </p>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-4 gap-1 mb-4">
          {MANAGE_MODE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setMode(option.id)}
              className={`p-2 rounded-lg border-2 transition-all font-heading font-semibold ${
                mode === option.id
                  ? 'bg-gf-green-700 border-gf-green text-white'
                  : 'bg-dark-bg border-dark-border text-dark-text-primary active:bg-dark-card'
              }`}
              style={{ minHeight: '44px' }}
            >
              <div className="text-base leading-none">{option.icon}</div>
              <div className="text-[11px] leading-tight mt-0.5">{option.label}</div>
            </button>
          ))}
        </div>

        {mode === 'receive' && (
          <ReceiveInventoryForm
            products={products}
            locations={locations}
            onSubmit={onReceive}
            initialProductId={prefill?.productId}
            initialLocationId={prefill?.locationId}
            onClearPreFilled={() => setPrefill(undefined)}
          />
        )}

        {mode === 'transfer' && (
          <TransferInventoryForm
            products={products}
            locations={locations}
            onSubmit={onTransfer}
          />
        )}

        {mode === 'use' && (
          <UseInventoryForm
            products={products}
            locations={locations}
            onSubmit={onUse}
            initialProductId={initialProductId}
            initialLocationId={initialLocationId}
            onClearPreFilled={onClearPreFilled}
            onCancel={onCancel}
          />
        )}

        {mode === 'unseal' && (
          <UnsealInventoryForm
            products={products}
            locations={locations}
            onSubmit={onUnseal}
            initialProductId={initialProductId}
            initialLocationId={initialLocationId}
          />
        )}
      </div>
    </div>
  );
}
