'use client'

import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { campaignService, type CampaignStatusSnapshot } from '@/services/campaignService'
import { CampaignStatus } from '@/types'

/** Notify only observed transitions. A successful first snapshot establishes the baseline. */
export function useRealtimeNotifications({ enabled = true }: { enabled?: boolean } = {}) {
  const previousRef = useRef<Map<string, CampaignStatusSnapshot> | null>(null)
  const notifiedRef = useRef(new Set<string>())
  const { data } = useQuery({
    queryKey: ['campaign-notification-statuses'],
    queryFn: campaignService.getStatuses,
    enabled,
    staleTime: 10_000,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  })

  useEffect(() => {
    if (!enabled) {
      previousRef.current = null
      return
    }
    if (!data) return

    const previous = previousRef.current
    previousRef.current = new Map(data.map(campaign => [campaign.id, campaign]))
    if (!previous) return

    for (const campaign of data) {
      const old = previous.get(campaign.id)
      if (!old || old.status === campaign.status) continue
      if (campaign.status !== CampaignStatus.COMPLETED && campaign.status !== CampaignStatus.FAILED) continue
      const key = `campaign:${campaign.id}:${campaign.status}`
      if (notifiedRef.current.has(key)) continue
      notifiedRef.current.add(key)
      const name = campaign.name || 'Sem nome'
      if (campaign.status === CampaignStatus.COMPLETED) {
        toast.success(`Campanha "${name}" concluída!`, { id: key })
      } else {
        toast.error(`Campanha "${name}" falhou`, { id: key })
      }
    }
  }, [data, enabled])
}
