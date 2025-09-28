/**
 * تنظیمات React Query
 */

// این یک پیاده‌سازی ساده است. می‌توانید با تنظیمات واقعی React Query جایگزین کنید.
export const queryClient = {
  prefetchQuery: async (key: string | any[], fn: () => Promise<any>) => {
    try {
      const data = await fn();
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
  
  invalidateQueries: (key: string | any[]) => {
    console.log(`Invalidating queries for key: ${JSON.stringify(key)}`);
    // پیاده‌سازی invalidation
  },
  
  // سایر متدهای مورد نیاز
};
