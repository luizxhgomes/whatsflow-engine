/**
 * Story 1.1: TagBadge - Reusable colored tag badge
 */

'use client'

import { X } from 'lucide-react'

interface TagBadgeProps {
  name: string
  color: string
  onRemove?: () => void
  size?: 'sm' | 'md'
}

export function TagBadge({ name, color, onRemove, size = 'sm' }: TagBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${
        size === 'sm'
          ? 'px-2 py-0.5 text-[10px]'
          : 'px-2.5 py-1 text-xs'
      }`}
      style={{
        backgroundColor: `${color}20`,
        color: color,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-white/10 transition-colors"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  )
}
