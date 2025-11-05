import { apiGet } from '../client';
import { Location } from '../../types';

/**
 * Fetch all available locations
 */
export async function fetchLocations(): Promise<Location[]> {
  return apiGet<Location[]>('/api/locations');
}
