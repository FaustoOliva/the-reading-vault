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

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
const REQUEST_TIMEOUT = 30000; // 30 seconds

if (__DEV__) {
  console.log("🔧 API Configuration:", {
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    API_BASE_URL,
    allEnvVars: Object.keys(process.env).filter((key) =>
      key.startsWith("EXPO_PUBLIC"),
    ),
  });
}

/**
 * Typed API Error
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Create AbortController with timeout
 * Returns controller and cleanup function
 */
const createTimeoutController = (timeoutMs: number) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const cleanup = () => clearTimeout(timeoutId);
  return { controller, cleanup };
};

/**
 * API Client
 * Centralized fetch wrapper with timeout and abort support
 */
export const api = {
  baseUrl: API_BASE_URL,

  /**
   * Generic request handler
   * Includes timeout and abort support
   */
  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const fullUrl = `${this.baseUrl}${endpoint}`;

    if (__DEV__) {
      console.log("🌐 API Request:", {
        url: fullUrl,
        method: options?.method || "GET",
        baseUrl: this.baseUrl,
        endpoint,
      });
    }

    // Create timeout controller
    const { controller, cleanup } = createTimeoutController(REQUEST_TIMEOUT);

    try {
      const response = await fetch(fullUrl, {
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
        ...options,
        signal: controller.signal,
      });

      if (__DEV__) {
        console.log("✅ API Response:", {
          url: fullUrl,
          status: response.status,
          ok: response.ok,
        });
      }

      if (!response.ok) {
        const errorPayload = await response
          .json()
          .catch(() => ({ error: "Request failed" }));
        const errorMessage =
          errorPayload.message ||
          errorPayload.error ||
          `HTTP ${response.status}`;
        const errorCode =
          errorPayload.code || errorPayload?.details?.code || undefined;
        if (__DEV__) {
          console.error("❌ API Error Response:", {
            url: fullUrl,
            status: response.status,
            error: errorPayload,
          });
        }
        throw new ApiError(errorMessage, response.status, errorCode);
      }

      const data = await response.json();
      if (__DEV__) {
        console.log("📦 API Data:", {
          url: fullUrl,
          dataKeys: Object.keys(data),
        });
      }

      return data;
    } catch (error) {
      if (__DEV__) {
        console.error("💥 API Request Failed:", {
          url: fullUrl,
          error: error instanceof Error ? error.message : "Unknown error",
          type:
            error instanceof ApiError
              ? "ApiError"
              : error?.constructor?.name || "Unknown",
        });
      }

      if (error instanceof ApiError) throw error;

      // Check if request was aborted (timeout)
      if (error instanceof Error && error.name === "AbortError") {
        throw new ApiError(
          "Request timeout - please check your connection",
          0,
          "TIMEOUT",
        );
      }

      // Network error (offline, timeout)
      throw new ApiError(
        "Network error - please check your connection",
        0,
        "NETWORK_ERROR",
      );
    } finally {
      cleanup();
    }
  },

  /**
   * GET request
   */
  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  },

  /**
   * POST request
   */
  post<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * PUT request
   */
  put<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  /**
   * DELETE request
   */
  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  },

  /**
   * POST with no body
   * For endpoints that trigger actions without input data
   */
  postNoBody<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },
};
