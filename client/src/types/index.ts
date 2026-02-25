export interface Location {
  id: string;
  name: string;
  description: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface InventoryItem {
  id: string;
  quantity: number;
  status: 'SEALED' | 'OPEN';
  location: Location;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  color?: string;
  unitSize?: string;
  reorderPoint?: number | null;
  isTracked?: boolean;
  supplierType: 'GARAGE_FORCE_REQUIRED' | 'GARAGE_FORCE_OPTIONAL' | 'OPEN_SOURCE';
  consumableType?: 'REUSABLE' | 'SINGLE_USE';
  category?: Category;
  inventoryItems: InventoryItem[];
}

export interface ProductSummary {
  id: string;
  name: string;
  unitSize?: string;
  sku?: string;
}

export interface LocationSummary {
  id: string;
  name: string;
}

export interface TransactionUserSummary {
  id: string;
  name: string;
}

export interface InventoryTransactionRecord {
  id: string;
  transactionType: 'RECEIPT' | 'CONSUMPTION' | 'TRANSFER' | 'ADJUSTMENT';
  quantity: number;
  jobReference?: string | null;
  notes?: string | null;
  createdAt: string;
  isReverted: boolean;
  revertedAt?: string | null;
  rollbackEligible: boolean;
  product: ProductSummary;
  fromLocation?: LocationSummary | null;
  toLocation?: LocationSummary | null;
  performedBy?: TransactionUserSummary | null;
  revertedBy?: TransactionUserSummary | null;
}

// Helper type for filtering
export type LocationFilterOption = 'all' | string;
