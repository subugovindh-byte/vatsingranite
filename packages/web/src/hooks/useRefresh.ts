import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Centralized refresh hook
 * Provides consistent refresh functionality across all pages
 */
export const useRefresh = (queryKeys?: string[][]) => {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    
    try {
      if (queryKeys && queryKeys.length > 0) {
        // Invalidate specific queries
        await Promise.all(
          queryKeys.map(key => queryClient.invalidateQueries({ queryKey: key }))
        );
      } else {
        // Invalidate all queries
        await queryClient.invalidateQueries();
      }
      
      // Small delay for UX feedback
      await new Promise(resolve => setTimeout(resolve, 300));
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient, queryKeys]);

  return {
    refresh,
    isRefreshing,
  };
};

/**
 * Auto-refresh hook with interval
 */
export const useAutoRefresh = (
  queryKeys: string[][],
  intervalMs: number = 30000, // 30 seconds default
  enabled: boolean = true
) => {
  const { refresh, isRefreshing } = useRefresh(queryKeys);

  useState(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      if (!isRefreshing) {
        refresh();
      }
    }, intervalMs);

    return () => clearInterval(interval);
  });

  return { refresh, isRefreshing };
};
