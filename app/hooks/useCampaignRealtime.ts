import type { CampaignStatus, RealtimeLatencyTelemetry } from '@/types'

interface UseCampaignRealtimeOptions {
  campaignId: string | undefined
  status: CampaignStatus | undefined
  recipients?: number
  completedAt?: string
}

/** Campaign queries poll the API; there is no WebSocket connection or latency telemetry. */
export function useCampaignRealtime(_options: UseCampaignRealtimeOptions) {
  return {
    isConnected: false,
    shouldShowRefreshButton: true,
    telemetry: null as RealtimeLatencyTelemetry | null,
  }
}
