import type { CampaignProgressBroadcastPayload } from '@/types'

// Persisted counters are refreshed via the API. Keep workflow call sites compatible
// without loading a Supabase client or opening outbound WebSockets.
export async function broadcastCampaignProgress(
  _campaignId: string,
  _payload: Omit<CampaignProgressBroadcastPayload, 'seq' | 'ts' | 'campaignId'>
): Promise<void> {}

export async function broadcastCampaignPhase(
  _campaignId: string,
  _payload: Omit<CampaignProgressBroadcastPayload, 'seq' | 'ts' | 'campaignId'> & { phase: NonNullable<CampaignProgressBroadcastPayload['phase']> }
): Promise<void> {}

export function createCampaignProgressBroadcaster(_opts: {
  campaignId: string
  traceId: string
  batchIndex: number
  flushIntervalMs?: number
}) {
  return {
    bump: (_delta: { sent?: number; failed?: number; skipped?: number }) => {},
    flush: async (_extra?: { phase?: CampaignProgressBroadcastPayload['phase'] }) => {},
    stop: async () => {},
  }
}
