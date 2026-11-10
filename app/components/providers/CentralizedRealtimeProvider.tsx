'use client'

/** Compatibility context for the API polling providers. */

import { createContext, useContext, useEffect, type ReactNode } from 'react'

// =============================================================================
// TYPES
// =============================================================================

type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

interface RealtimeEvent {
  table: string
  eventType: RealtimeEventType
  new: Record<string, unknown> | null
  old: Record<string, unknown> | null
}

type SubscriptionCallback = (event: RealtimeEvent) => void

interface CentralizedRealtimeContextValue {
  /**
   * Subscribe to changes on a table
   * @returns Unsubscribe function
   */
  subscribe: (table: string, callback: SubscriptionCallback) => () => void

  /**
   * Check if realtime is connected
   */
  isConnected: boolean
}

// =============================================================================
// CONTEXT
// =============================================================================

const CentralizedRealtimeContext = createContext<CentralizedRealtimeContextValue | null>(null)

// =============================================================================
// PROVIDER
// =============================================================================

interface CentralizedRealtimeProviderProps {
  children: ReactNode
  /**
   * Tables to subscribe to
   * @default ['campaigns', 'contacts', 'templates', 'flows', 'inbox_conversations', 'inbox_messages']
   */
  tables?: string[]
  /**
   * Debounce time for batching rapid updates (ms)
   * @default 200
   */
  debounceMs?: number
}

// Existing consumers retain the contract; authenticated queries own their refresh interval.
const pollingContext: CentralizedRealtimeContextValue = {
  subscribe: () => () => {},
  isConnected: false,
}

export function CentralizedRealtimeProvider({ children }: CentralizedRealtimeProviderProps) {
  return (
    <CentralizedRealtimeContext.Provider value={pollingContext}>
      {children}
    </CentralizedRealtimeContext.Provider>
  )
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to access centralized realtime functionality
 */
export function useCentralizedRealtime() {
  const ctx = useContext(CentralizedRealtimeContext)
  if (!ctx) {
    throw new Error('useCentralizedRealtime must be used within CentralizedRealtimeProvider')
  }
  return ctx
}

/**
 * Hook to subscribe to a specific table's realtime events
 * Automatically unsubscribes on unmount
 */
export function useRealtimeSubscription(
  table: string,
  callback: SubscriptionCallback,
  enabled = true
) {
  const { subscribe } = useCentralizedRealtime()

  useEffect(() => {
    if (!enabled) return

    const unsubscribe = subscribe(table, callback)
    return unsubscribe
  }, [table, callback, enabled, subscribe])
}
