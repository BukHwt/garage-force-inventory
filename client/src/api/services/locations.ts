import { apiDelete, apiGet, apiPost, apiPut } from '../client';
import { Location } from '../../types';

/**
 * Fetch all available locations
 */
export async function fetchLocations(): Promise<Location[]> {
  return apiGet<Location[]>('/api/locations');
}

export type UpsertLocationRequest = {
  name: string;
  description?: string;
};

export async function createLocation(payload: UpsertLocationRequest): Promise<Location> {
  return apiPost<Location>('/api/locations', payload);
}

export async function updateLocation(id: string, payload: UpsertLocationRequest): Promise<Location> {
  return apiPut<Location>(`/api/locations/${id}`, payload);
}

export async function deleteLocation(id: string): Promise<void> {
  await apiDelete<unknown>(`/api/locations/${id}`);
}
