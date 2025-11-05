import { Product } from '../types';

/**
 * Calculate total quantity across all locations for a product
 */
export function getTotalQuantity(product: Product): number {
  return product.inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Get quantity for a specific location
 */
export function getLocationQuantity(product: Product, locationId: string): number {
  const item = product.inventoryItems.find(i => i.location.id === locationId);
  return item?.quantity || 0;
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
  return products.filter(p => needsReorder(p));
}

/**
 * Filter products by location
 * Returns all products if locationId is 'all'
 */
export function filterProductsByLocation(
  products: Product[],
  locationId: string
): Product[] {
  if (locationId === 'all') return products;

  return products.filter(p =>
    p.inventoryItems.some(item => item.location.id === locationId)
  );
}

/**
 * Get supplier type display text
 */
export function getSupplierTypeLabel(supplierType: string): string {
  switch (supplierType) {
    case 'GARAGE_FORCE_REQUIRED':
      return '🏢 Garage Force Required';
    case 'GARAGE_FORCE_OPTIONAL':
      return '🏢 Garage Force Optional';
    case 'OPEN_SOURCE':
      return '🏪 Available Locally';
    default:
      return supplierType;
  }
}
