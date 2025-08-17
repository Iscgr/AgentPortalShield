import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Define the interface for API request options
interface ApiRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  data?: any;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Define API_BASE_URL based on environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (
  typeof window !== 'undefined' ? window.location.origin : ''
);

export async function apiRequest(endpoint: string, options: RequestInit & { data?: any } = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  console.log(`SHERLOCK v32.0: Fetching URL:`, endpoint);

  // Extract data from options if present
  const { data, ...fetchOptions } = options;
  
  // If data is provided, serialize it as JSON body
  if (data !== undefined) {
    fetchOptions.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...fetchOptions.headers,
      },
    });

    console.log(`SHERLOCK v32.0 DEBUG: Response status for ${endpoint}:`, response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SHERLOCK v32.0: API Error ${response.status} for ${endpoint}:`, errorText.substring(0, 200));
      throw new Error(`API Error ${response.status}: ${errorText.substring(0, 100)}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error(`SHERLOCK v32.0: Non-JSON response for ${endpoint}:`, text.substring(0, 100));
      throw new Error(`Server returned HTML instead of JSON for ${endpoint}. Check server routes.`);
    }

    const data = await response.json();
    console.log(`SHERLOCK v32.0: Successful API response for ${endpoint}`);
    return data;

  } catch (error) {
    console.error(`SHERLOCK v32.0: API Request failed for ${endpoint}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // SHERLOCK v12.1: Handle query parameters properly
    let url = queryKey[0] as string;

    // If there are query parameters (second element), build query string
    if (queryKey.length > 1 && queryKey[1] && typeof queryKey[1] === 'object') {
      const params = queryKey[1] as Record<string, any>;
      const searchParams = new URLSearchParams();

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });

      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    console.log('SHERLOCK v12.1: Fetching URL:', url);

    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Export the queryClient as default as well for compatibility
export default queryClient;