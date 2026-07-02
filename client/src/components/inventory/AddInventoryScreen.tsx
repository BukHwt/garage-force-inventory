import React, { useState, useEffect } from 'react';
import { Product, Location } from '../../types';
import {
  ReceiveInventoryForm,
  ReceiveInventoryData,
} from './ReceiveInventoryForm';
import {
  TransferInventoryForm,
  TransferInventoryData,
} from './TransferInventoryForm';

type InventoryMode = 'receive' | 'transfer';

interface AddInventoryScreenProps {
  products: Product[];
  locations: Location[];
  onReceive: (data: ReceiveInventoryData) => Promise<void>;
  onTransfer: (data: TransferInventoryData) => Promise<void>;
  initialMode?: InventoryMode;
  initialProductId?: string;
  initialLocationId?: string;
  onClearPreFilled?: () => void;
  onCancel?: () => void;
}

export function AddInventoryScreen({
  products,
  locations,
  onReceive,
  onTransfer,
  initialMode,
  initialProductId,
  initialLocationId,
  onClearPreFilled,
  onCancel,
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
            Inventory Tools
          </h1>
        </div>
        <p className="font-body text-sm text-dark-text-secondary">
          Receive stock or move it between locations
        </p>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode('receive')}
            className={`p-3 rounded-lg border-2 transition-all font-heading font-semibold ${
              mode === 'receive'
                ? 'bg-gf-green-700 border-gf-green text-white'
                : 'bg-dark-bg border-dark-border text-dark-text-primary active:bg-dark-card'
            }`}
            style={{ minHeight: '44px' }}
          >
            <div className="text-sm">Receive</div>
            <div className="text-xs font-body font-normal opacity-80">
              Add stock
            </div>
          </button>
          <button
            type="button"
            onClick={() => setMode('transfer')}
            className={`p-3 rounded-lg border-2 transition-all font-heading font-semibold ${
              mode === 'transfer'
                ? 'bg-gf-green-700 border-gf-green text-white'
                : 'bg-dark-bg border-dark-border text-dark-text-primary active:bg-dark-card'
            }`}
            style={{ minHeight: '44px' }}
          >
            <div className="text-sm">Transfer</div>
            <div className="text-xs font-body font-normal opacity-80">
              Move stock
            </div>
          </button>
        </div>

        {mode === 'receive' && (
          <ReceiveInventoryForm
            products={products}
            locations={locations}
            onSubmit={onReceive}
            initialProductId={prefill?.productId}
            initialLocationId={prefill?.locationId}
            onClearPreFilled={() => {
              setPrefill(undefined);
              onClearPreFilled?.();
            }}
          />
        )}
        {mode === 'transfer' && (
          <TransferInventoryForm
            products={products}
            locations={locations}
            onSubmit={onTransfer}
          />
        )}
      </div>
    </div>
  );
}
