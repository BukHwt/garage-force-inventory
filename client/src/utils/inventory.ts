import { Product } from "../types";

export type ChipUnitType = "BOX" | "BUCKET";

/**
 * Calculate total quantity across all locations for a product
 */
export function getTotalQuantity(product: Product): number {
  return product.inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Get quantity for a specific location
 */
export function getLocationQuantity(
  product: Product,
  locationId: string,
): number {
  return product.inventoryItems
    .filter((item) => item.location.id === locationId)
    .reduce((sum, item) => sum + item.quantity, 0);
}

export function getChipUnitType(product: Product): ChipUnitType | null {
  const label = `${product.unitSize ?? ""} ${product.description ?? ""} ${product.name}`.toLowerCase();
  if (label.includes("bucket")) {
    return "BUCKET";
  }
  if (label.includes("box")) {
    return "BOX";
  }
  return null;
}

export function isChipBlendProduct(product: Product): boolean {
  const label = `${product.name} ${product.unitSize ?? ""} ${product.category?.name ?? ""}`.toLowerCase();
  return label.includes("chip") || label.includes("blend");
}

export function getChipBlendGroupKey(product: Product): string | null {
  if (!isChipBlendProduct(product) || !getChipUnitType(product)) {
    return null;
  }

  const categoryKey = product.category?.id ?? "__uncategorized__";
  const nameKey = product.name.trim().toLowerCase();
  return `${categoryKey}:${nameKey}`;
}

/**
 * Check if product needs reordering based on total quantity
 */
export function needsReorder(product: Product): boolean {
  if (!product.reorderPoint) return false;
  return getTotalQuantity(product) < product.reorderPoint;
}

/**
 * Filter products that need reordering
 */
export function getProductsNeedingReorder(products: Product[]): Product[] {
  return products.filter((p) => needsReorder(p));
}

/**
 * Filter products by location
 * Returns all products if locationId is 'all'
 * Otherwise, only include products with inventory items for that location.
 */
export function filterProductsByLocation(
  products: Product[],
  locationId: string,
): Product[] {
  if (locationId === "all") return products;

  const visibleChipGroups = new Set(
    products
      .filter((product) =>
        product.inventoryItems.some((item) => item.location.id === locationId),
      )
      .map((product) => getChipBlendGroupKey(product))
      .filter((key): key is string => Boolean(key)),
  );

  return products.filter((product) => {
    if (product.inventoryItems.some((item) => item.location.id === locationId)) {
      return true;
    }

    if (product.isTracked) {
      return true;
    }

    const chipGroupKey = getChipBlendGroupKey(product);
    return chipGroupKey ? visibleChipGroups.has(chipGroupKey) : false;
  });
}

/**
 * Get supplier type display text
 */
export function getSupplierTypeLabel(supplierType: string): string {
  switch (supplierType) {
    case "GARAGE_FORCE_REQUIRED":
      return "🏢 Garage Force Required";
    case "GARAGE_FORCE_OPTIONAL":
      return "🏢 Garage Force Optional";
    case "OPEN_SOURCE":
      return "🏪 Available Locally";
    default:
      return supplierType;
  }
}
