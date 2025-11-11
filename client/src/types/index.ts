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
  reorderPoint?: number;
  supplierType: 'GARAGE_FORCE_REQUIRED' | 'GARAGE_FORCE_OPTIONAL' | 'OPEN_SOURCE';
  category?: Category;
  inventoryItems: InventoryItem[];
}

// Helper type for filtering
export type LocationFilterOption = 'all' | string;
