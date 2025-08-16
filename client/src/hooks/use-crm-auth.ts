
import { useMutation } from '@tanstack/react-query';
import { useUnifiedAuth } from '@/contexts/unified-auth-context';

export function useCrmAuth() {
  const { crmLoginMutation } = useUnifiedAuth();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/crm/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }

      return response.json();
    },
  });

  return {
    loginMutation: crmLoginMutation,
    logoutMutation,
  };
}
