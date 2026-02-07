/**
 * API Service
 * Centralized fetch wrapper with error handling
 * 
 * Rules:
 * - Check response.ok before parsing
 * - Throw typed errors with status codes
 * - Use native fetch (no axios)
 * - Set Content-Type headers for JSON
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Debug: Log API configuration on module load
console.log('🔧 API Configuration:', {
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  API_BASE_URL,
  allEnvVars: Object.keys(process.env).filter(key => key.startsWith('EXPO_PUBLIC')),
});

/**
 * Typed API Error
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * API Client
 */
export const api = {
  baseUrl: API_BASE_URL,

  /**
   * Generic request handler
   */
  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const fullUrl = `${this.baseUrl}${endpoint}`;
    
    console.log('🌐 API Request:', {
      url: fullUrl,
      method: options?.method || 'GET',
      baseUrl: this.baseUrl,
      endpoint,
    });

    try {
      const response = await fetch(fullUrl, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      console.log('✅ API Response:', {
        url: fullUrl,
        status: response.status,
        ok: response.ok,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        console.error('❌ API Error Response:', {
          url: fullUrl,
          status: response.status,
          error,
        });
        throw new ApiError(
          error.message || `HTTP ${response.status}`,
          response.status,
          error.code
        );
      }

      const data = await response.json();
      console.log('📦 API Data:', {
        url: fullUrl,
        dataKeys: Object.keys(data),
      });

      return data;
    } catch (error) {
      console.error('💥 API Request Failed:', {
        url: fullUrl,
        error: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof ApiError ? 'ApiError' : error?.constructor?.name || 'Unknown',
      });

      if (error instanceof ApiError) throw error;
      // Network error (offline, timeout)
      throw new ApiError('Network error', 0, 'NETWORK_ERROR');
    }
  },

  /**
   * GET request
   */
  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  },

  /**
   * POST request
   */
  post<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * PUT request
   */
  put<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * DELETE request
   */
  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  },
};
