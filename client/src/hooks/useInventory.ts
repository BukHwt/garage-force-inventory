import { useState, useEffect, useCallback } from 'react';
import { Product, Location } from '../types';
import { fetchProducts } from '../api/services/products';
import { fetchLocations } from '../api/services/locations';
import { ApiError } from '../api/client';

interface UseInventoryResult {
  products: Product[];
  locations: Location[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to manage inventory data fetching and state
 * Encapsulates all data fetching logic for inventory management
 */
export function useInventory(): UseInventoryResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both products and locations in parallel for better performance
      const [productsData, locationsData] = await Promise.all([
        fetchProducts(),
        fetchLocations(),
      ]);

      setProducts(productsData);
      setLocations(locationsData);
    } catch (err) {
      const errorMessage = err instanceof ApiError
        ? err.message
        : 'Failed to load inventory data';

      setError(errorMessage);
      console.error('Error fetching inventory data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    products,
    locations,
    loading,
    error,
    refetch: fetchData,
  };
}
