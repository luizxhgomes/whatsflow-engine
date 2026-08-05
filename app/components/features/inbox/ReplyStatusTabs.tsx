/**
 * Story 1.3: ReplyStatusTabs - Tabs to filter by replied/unreplied
 */

'use client'

import { cn } from '@/lib/utils'
import { useReplyStatusCounts } from '@/hooks/useReplyStatusCounts'

type ReplyTab = 'unreplied' | 'replied' | 'all'

interface ReplyStatusTabsProps {
  active: ReplyTab
  onChange: (tab: ReplyTab) => void
}

const TABS: { value: ReplyTab; label: string }[] = [
  { value: 'unreplied', label: 'Não respondidas' },
  { value: 'replied', label: 'Respondidas' },
  { value: 'all', label: 'Todas' },
]

export function ReplyStatusTabs({ active, onChange }: ReplyStatusTabsProps) {
  const { counts } = useReplyStatusCounts()

  function getCount(tab: ReplyTab): number {
    if (tab === 'unreplied') return counts.unreplied
    if (tab === 'replied') return counts.replied
    return counts.total
  }

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-zinc-800/50">
      {TABS.map(({ value, label }) => {
        const count = getCount(value)
        const isActive = active === value
        return (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={cn(
              'px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors',
              isActive
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            )}
          >
            {label}
            {count > 0 && (
              <span className={cn(
                'ml-1 px-1.5 py-0.5 rounded-full text-[9px]',
                isActive
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-zinc-800 text-zinc-500'
              )}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
