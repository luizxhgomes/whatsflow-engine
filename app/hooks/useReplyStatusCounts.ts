/**
 * Story 1.3: useReplyStatusCounts - Counts for reply status tabs
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import { CACHE } from '@/lib/constants'

interface ReplyStatusCounts {
  replied: number
  unreplied: number
  total: number
}

async function fetchCounts(): Promise<ReplyStatusCounts> {
  const response = await fetch('/api/inbox/conversations/reply-counts')
  if (!response.ok) {
    throw new Error('Failed to fetch reply status counts')
  }
  return response.json()
}

export function useReplyStatusCounts() {
  const query = useQuery({
    queryKey: ['inbox-reply-counts'],
    queryFn: fetchCounts,
    staleTime: CACHE.inbox,
    refetchInterval: 30 * 1000,
  })

  return {
    counts: query.data ?? { replied: 0, unreplied: 0, total: 0 },
    isLoading: query.isLoading,
    refetch: query.refetch,
  }
}
