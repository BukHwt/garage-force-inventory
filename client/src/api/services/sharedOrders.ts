import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '../client';
import { SharedOrderItem, SharedOrderStatus } from '../../types';

export type SharedOrderInput = {
  productName: string;
  sku?: string;
  vendorPartNumber?: string;
  unitSize?: string;
  categoryName?: string;
  quantity: number;
  estimatedUnitPriceCents?: number | null;
  notes?: string;
};

export async function fetchSharedOrders(params?: { status?: SharedOrderStatus; search?: string }) {
  const query = new URLSearchParams();
  if (params?.status) {
    query.set('status', params.status);
  }
  if (params?.search?.trim()) {
    query.set('search', params.search.trim());
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiGet<SharedOrderItem[]>(`/api/shared-orders${suffix}`);
}

export async function createSharedOrderItem(payload: SharedOrderInput) {
  return apiPost<SharedOrderItem>('/api/shared-orders', payload);
}

export async function updateSharedOrderItem(id: string, payload: SharedOrderInput) {
  return apiPut<SharedOrderItem>(`/api/shared-orders/${id}`, payload);
}

export async function updateSharedOrderStatus(id: string, status: SharedOrderStatus) {
  return apiPatch<SharedOrderItem>(`/api/shared-orders/${id}/status`, { status });
}

export async function markAllOpenSharedOrdersAsOrdered() {
  return apiPost<{ updatedCount: number }>('/api/shared-orders/mark-open-ordered', {});
}

export async function deleteSharedOrderItem(id: string) {
  await apiDelete<unknown>(`/api/shared-orders/${id}`);
}
