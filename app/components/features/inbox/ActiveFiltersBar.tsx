/**
 * Story 1.2: ActiveFiltersBar - Displays active filters as removable chips
 */

'use client'

import { X } from 'lucide-react'
import type { InboxFilters } from '@/hooks/useInboxFilters'

interface ActiveFiltersBarProps {
  labels: { key: keyof InboxFilters; label: string }[]
  onRemove: (key: keyof InboxFilters) => void
  onClearAll: () => void
}

export function ActiveFiltersBar({ labels, onRemove, onClearAll }: ActiveFiltersBarProps) {
  if (labels.length === 0) return null

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-zinc-800/50 overflow-x-auto">
      {labels.map(({ key, label }) => (
        <span
          key={key}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-medium shrink-0"
        >
          {label}
          <button
            onClick={() => onRemove(key)}
            className="rounded-full p-0.5 hover:bg-emerald-500/20 transition-colors"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      {labels.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-[10px] text-zinc-500 hover:text-zinc-300 shrink-0 ml-1 transition-colors"
        >
          Limpar todos
        </button>
      )}
    </div>
  )
}
