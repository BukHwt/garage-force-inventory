import { apiPatch, apiPost } from '../client';
import { InventoryItem } from '../../types';

/**
 * Adjust inventory quantity and/or status for a specific item at a location
 * @param inventoryItemId - The ID of the inventory item to adjust
 * @param adjustment - The amount to add (positive) or subtract (negative)
 * @param status - Optional new status (SEALED or OPEN)
 */
export async function adjustInventory(
  inventoryItemId: string,
  adjustment: number,
  status?: 'SEALED' | 'OPEN'
): Promise<InventoryItem> {
  return apiPatch<InventoryItem>(`/api/inventory/${inventoryItemId}/adjust`, {
    adjustment,
    ...(status !== undefined && { status }),
  });
}

export interface ReceiveInventoryRequest {
  productId: string;
  locationId: string;
  quantity: number;
  batchNumber?: string;
  expiresAt?: string;
  notes?: string;
}

export interface ReceiveInventoryResponse {
  inventoryItem: InventoryItem;
  transaction: {
    id: string;
    transactionType: string;
    quantity: number;
    createdAt: string;
  };
}

/**
 * Receive new inventory into a location
 * Creates an inventory transaction (RECEIPT) and updates inventory quantity
 */
export async function receiveInventory(
  data: ReceiveInventoryRequest
): Promise<ReceiveInventoryResponse> {
  return apiPost<ReceiveInventoryResponse>('/api/inventory/receive', data);
}

export interface TransferInventoryRequest {
  productId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  notes?: string;
}

export interface TransferInventoryResponse {
  fromItem: InventoryItem | null;
  toItem: InventoryItem;
  transaction: {
    id: string;
    transactionType: string;
    quantity: number;
    createdAt: string;
  };
}

/**
 * Transfer inventory between locations
 * Creates an inventory transaction (TRANSFER) and updates quantities at both locations
 */
export async function transferInventory(
  data: TransferInventoryRequest
): Promise<TransferInventoryResponse> {
  return apiPost<TransferInventoryResponse>('/api/inventory/transfer', data);
}

export interface UseInventoryRequest {
  productId: string;
  locationId: string;
  quantity: number;
  jobReference: string;
  notes?: string;
}

export interface UseInventoryResponse {
  inventoryItem: InventoryItem | null;
  transaction: {
    id: string;
    transactionType: string;
    quantity: number;
    jobReference: string;
    createdAt: string;
  };
}

/**
 * Use/consume inventory for a job
 * Creates an inventory transaction (CONSUMPTION) and decreases quantity at location
 */
export async function useInventory(
  data: UseInventoryRequest
): Promise<UseInventoryResponse> {
  return apiPost<UseInventoryResponse>('/api/inventory/use', data);
}

export interface UnsealInventoryRequest {
  productId: string;
  locationId: string;
  quantity?: number; // Optional, defaults to 1 on backend
}

export interface UnsealInventoryResponse {
  sealedItem: InventoryItem | null;
  openItem: InventoryItem;
  transaction: {
    id: string;
    transactionType: string;
    quantity: number;
    createdAt: string;
  };
}

/**
 * Unseal containers (move specified quantity from SEALED to OPEN status)
 * Reduces sealed inventory and increases open inventory by the specified amount
 */
export async function unsealInventory(
  data: UnsealInventoryRequest
): Promise<UnsealInventoryResponse> {
  return apiPost<UnsealInventoryResponse>('/api/inventory/unseal', data);
}
