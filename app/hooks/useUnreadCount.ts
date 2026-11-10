import { useQuery } from '@tanstack/react-query'
import { inboxService } from '@/services/inboxService'

/** Global count of open conversations with unread messages, independent of pagination. */
export function useUnreadCount() {
  const query = useQuery({
    queryKey: ['inbox-unread-count'],
    queryFn: inboxService.getUnreadCount,
    staleTime: 3_000,
    refetchInterval: 3_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  })

  return {
    count: query.data,
    isLoading: query.isLoading,
    error: query.error,
  }
}
