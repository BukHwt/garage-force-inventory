import React, { useState } from 'react';
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
}

/**
 * Main screen for adding inventory via receiving or transferring
 * Orchestrates the two sub-forms and handles mode switching
 */
export function AddInventoryScreen({
  products,
  locations,
  onReceive,
  onTransfer,
}: AddInventoryScreenProps) {
  const [mode, setMode] = useState<InventoryMode>('receive');

  return (
    <div className="min-h-screen bg-dark-bg pb-20">
      {/* Header */}
      <div className="bg-dark-card border-b-2 border-gf-green p-4 sticky top-0 z-10">
        <h1 className="font-heading text-2xl font-bold text-dark-text-primary">
          Add Inventory
        </h1>
        <p className="font-body text-sm text-dark-text-secondary mt-1">
          Receive shipments or transfer between locations
        </p>
      </div>

      <div className="p-4">
        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode('receive')}
            className={`p-4 rounded-lg border-2 transition-all font-heading font-semibold ${
              mode === 'receive'
                ? 'bg-gf-green-700 border-gf-green text-white'
                : 'bg-dark-bg border-dark-border text-dark-text-primary active:bg-dark-card'
            }`}
            style={{ minHeight: '44px' }}
          >
            <div className="text-2xl mb-1">📦</div>
            <div>Receive</div>
            <div className="text-xs font-body font-normal opacity-80">
              From supplier
            </div>
          </button>
          <button
            type="button"
            onClick={() => setMode('transfer')}
            className={`p-4 rounded-lg border-2 transition-all font-heading font-semibold ${
              mode === 'transfer'
                ? 'bg-gf-green-700 border-gf-green text-white'
                : 'bg-dark-bg border-dark-border text-dark-text-primary active:bg-dark-card'
            }`}
            style={{ minHeight: '44px' }}
          >
            <div className="text-2xl mb-1">🔄</div>
            <div>Transfer</div>
            <div className="text-xs font-body font-normal opacity-80">
              Between locations
            </div>
          </button>
        </div>

        {/* Conditional Form Rendering */}
        {mode === 'receive' ? (
          <ReceiveInventoryForm
            products={products}
            locations={locations}
            onSubmit={onReceive}
          />
        ) : (
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
