'use client'

import { type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { RealtimeContext } from '@/hooks/useRealtime'

/** Compatibility context: queries refresh via the authenticated API, without WebSockets. */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  return (
    <RealtimeContext.Provider value={{
      isConnected: false,
      status: null,
      reconnect: () => { void queryClient.refetchQueries({ type: 'active' }) },
    }}>
      {children}
    </RealtimeContext.Provider>
  )
}
