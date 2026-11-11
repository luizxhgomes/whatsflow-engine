import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { Campaign } from '@/types'

vi.mock('@/components/ui/PrefetchLink', () => ({ PrefetchLink: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }))
import { CampaignFlowPanel } from './CampaignFlowPanel'
afterEach(cleanup)

it('acompanha contagem da campanha sem hooks condicionais ou indicação de conexão ao vivo', () => {
  const campaign = { id: 'c1', flowId: null, submissionsCount: 0, recipients: 10 } as Campaign
  const { rerender } = render(<CampaignFlowPanel campaign={campaign} />)
  expect(screen.queryByText('Respostas')).toBeNull()
  rerender(<CampaignFlowPanel campaign={{ ...campaign, flowId: 'f1', submissionsCount: 2 }} />)
  expect(screen.getByText('2')).toBeTruthy()
  expect(screen.getByText('20.0%')).toBeTruthy()
  rerender(<CampaignFlowPanel campaign={{ ...campaign, flowId: 'f1', submissionsCount: 3 }} />)
  expect(screen.getByText('3')).toBeTruthy()
  expect(screen.queryByText('Ao vivo')).toBeNull()
})
