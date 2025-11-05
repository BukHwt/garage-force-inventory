import { apiGet } from '../client';
import { Product } from '../../types';

/**
 * Fetch all products with their inventory items and categories
 */
export async function fetchProducts(): Promise<Product[]> {
  return apiGet<Product[]>('/api/products');
}
