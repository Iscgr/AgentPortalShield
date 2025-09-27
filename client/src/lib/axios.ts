
import { queryClient } from './queryClient';

export const apiRequest = async (url: string, options: RequestInit = {}) => {
  const baseUrl = (import.meta as any).env?.VITE_API_BASE_URL || '';
  const fullUrl = `${baseUrl}${url}`;
  
  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

// Default export for compatibility
export default apiRequest;
