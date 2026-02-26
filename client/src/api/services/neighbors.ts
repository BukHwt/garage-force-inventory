import { apiGet } from '../client';
import { NeighborInventoryProduct, NeighborTenantOption } from '../../types';

export type NeighborTenantsResponse = {
  currentTenant: string;
  tenants: NeighborTenantOption[];
};

export type NeighborInventoryResponse = {
  sourceTenant: string;
  sourceLabel: string;
  products: NeighborInventoryProduct[];
};

export async function fetchNeighborTenants() {
  return apiGet<NeighborTenantsResponse>('/api/neighbors/tenants');
}

export async function fetchNeighborInventory(params: { tenant: string; search?: string }) {
  const query = new URLSearchParams({ tenant: params.tenant });
  if (params.search && params.search.trim()) {
    query.set('search', params.search.trim());
  }
  return apiGet<NeighborInventoryResponse>(`/api/neighbors/inventory?${query.toString()}`);
}
