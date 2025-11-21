import { apiGet, apiPut, apiPost } from '../client';
import { Product } from '../../types';

/**
 * Fetch all products with their inventory items and categories
 */
export async function fetchProducts(): Promise<Product[]> {
  return apiGet<Product[]>('/api/products');
}

/**
 * Create a new product
 */
export interface CreateProductRequest {
  name: string;
  description?: string;
  sku?: string;
  color?: string;
  unitSize?: string;
  reorderPoint?: number;
  supplierType?: 'GARAGE_FORCE_REQUIRED' | 'GARAGE_FORCE_OPTIONAL' | 'OPEN_SOURCE';
  consumableType?: 'REUSABLE' | 'SINGLE_USE';
  categoryId?: string;
}

export async function createProduct(
  data: CreateProductRequest
): Promise<Product> {
  return apiPost<Product>('/api/products', data);
}

/**
 * Update a product's details
 */
export interface UpdateProductRequest {
  name?: string;
  description?: string;
  sku?: string;
  color?: string;
  unitSize?: string;
  reorderPoint?: number;
  supplierType?: 'GARAGE_FORCE_REQUIRED' | 'GARAGE_FORCE_OPTIONAL' | 'OPEN_SOURCE';
  consumableType?: 'REUSABLE' | 'SINGLE_USE';
  categoryId?: string;
}

export async function updateProduct(
  productId: string,
  updates: UpdateProductRequest
): Promise<Product> {
  return apiPut<Product>(`/api/products/${productId}`, updates);
}
