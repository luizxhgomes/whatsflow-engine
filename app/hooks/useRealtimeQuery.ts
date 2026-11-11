'use client'

/**
 * useRealtimeQuery Hook
 * 
 * Refreshes authenticated API queries with visible-page polling.
 * Part of the Realtime infrastructure (T005).
 */

import { useQuery, useQueryClient, UseQueryOptions, QueryKey } from '@tanstack/react-query'
import type { RealtimeTable, RealtimeEventType, RealtimePayload } from '@/types'

// ============================================================================
// TYPES
// ============================================================================

export interface UseRealtimeQueryOptions<TData, TError = Error>
    extends Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> {
    /**
     * React Query key
     */
    queryKey: QueryKey

    /**
     * Fetch function
     */
    queryFn: () => Promise<TData>

    /**
     * Table to subscribe to for Realtime updates
     */
    table: RealtimeTable | 'templates' | 'flows'

    /**
     * Event types to listen for (default: '*')
     */
    events?: RealtimeEventType[]

    /**
     * PostgREST filter (e.g., 'id=eq.123')
     */
    filter?: string

    /**
     * Debounce updates in milliseconds (default: 200)
     */
    debounceMs?: number

    /**
     * Custom handler for Realtime updates
     * If not provided, will invalidate the query
     */
    onRealtimeUpdate?: (
        payload: RealtimePayload,
        queryClient: ReturnType<typeof useQueryClient>
    ) => void
}

/** Preserves existing callers while refreshing through their authenticated API services. */
export function useRealtimeQuery<TData = unknown, TError = Error>({
    queryKey,
    queryFn,
    table,
    events: _events,
    filter: _filter,
    debounceMs: _debounceMs,
    onRealtimeUpdate: _onRealtimeUpdate,
    ...queryOptions
}: UseRealtimeQueryOptions<TData, TError>) {
    return useQuery<TData, TError>({
        queryKey,
        queryFn,
        refetchInterval: table.startsWith('inbox_') ? 3_000 : 10_000,
        ...queryOptions,
        refetchIntervalInBackground: false,
    })
}
