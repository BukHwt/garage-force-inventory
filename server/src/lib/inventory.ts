import { Prisma } from '@prisma/client';

type InventoryItemWithLocation = Prisma.InventoryItemGetPayload<{
  include: { location: true };
}>;

type ProductWithInventoryAndCategory = Prisma.ProductGetPayload<{
  include: {
    category: true;
    inventoryItems: {
      include: {
        location: true;
      };
    };
  };
}>;

type GroupedInventoryItem = {
  id: string;
  quantity: number;
  status: 'SEALED';
  location: InventoryItemWithLocation['location'];
};

export function aggregateInventoryItems(
  inventoryItems: InventoryItemWithLocation[],
): GroupedInventoryItem[] {
  const grouped = new Map<string, GroupedInventoryItem>();

  for (const item of inventoryItems) {
    const existing = grouped.get(item.locationId);
    if (existing) {
      existing.quantity += item.quantity;
      continue;
    }

    grouped.set(item.locationId, {
      id: item.id,
      quantity: item.quantity,
      status: 'SEALED',
      location: item.location,
    });
  }

  return Array.from(grouped.values()).sort((left, right) =>
    left.location.name.localeCompare(right.location.name),
  );
}

export function aggregateProductInventory<
  T extends ProductWithInventoryAndCategory,
>(product: T) {
  return {
    ...product,
    inventoryItems: aggregateInventoryItems(product.inventoryItems),
  };
}
