import { apiPatch, apiPost } from '../client';
import { InventoryItem } from '../../types';

/**
 * Adjust inventory quantity for a specific item at a location
 * @param inventoryItemId - The ID of the inventory item to adjust
 * @param adjustment - The amount to add (positive) or subtract (negative)
 */
export async function adjustInventory(
  inventoryItemId: string,
  adjustment: number
): Promise<InventoryItem> {
  return apiPatch<InventoryItem>(`/api/inventory/${inventoryItemId}/adjust`, {
    adjustment,
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
