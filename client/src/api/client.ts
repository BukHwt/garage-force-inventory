/**
 * API client configuration
 */
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Base fetch wrapper with error handling and JSON parsing
 * Throws ApiError on non-OK responses for proper error handling
 */
export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    // Handle non-OK responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    // Network errors or parsing errors
    if (error instanceof ApiError) {
      throw error;
    }

    // Wrap network errors for consistent error handling
    throw new ApiError(
      error instanceof Error ? error.message : 'Network request failed'
    );
  }
}

/**
 * Helper for GET requests
 */
export function apiGet<T>(endpoint: string): Promise<T> {
  return apiClient<T>(endpoint, { method: 'GET' });
}

/**
 * Helper for POST requests
 */
export function apiPost<T>(endpoint: string, data: any): Promise<T> {
  return apiClient<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Helper for PUT requests
 */
export function apiPut<T>(endpoint: string, data: any): Promise<T> {
  return apiClient<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Helper for DELETE requests
 */
export function apiDelete<T>(endpoint: string): Promise<T> {
  return apiClient<T>(endpoint, { method: 'DELETE' });
}
