import { apiPatch } from '../client';
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
