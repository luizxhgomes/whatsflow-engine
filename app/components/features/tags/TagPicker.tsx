/**
 * Story 1.1: TagPicker - Select/deselect tags for a contact
 */

'use client'

import { useState } from 'react'
import { Check, Plus, Search } from 'lucide-react'
import { useTags } from '@/hooks/useTags'
import { TagBadge } from './TagBadge'
import type { Tag } from '@/types'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface TagPickerProps {
  selectedTagIds: string[]
  onToggle: (tagId: string) => void
}

export function TagPicker({ selectedTagIds, onToggle }: TagPickerProps) {
  const { tags, isLoading } = useTags()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = tags.filter((tag) =>
    tag.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 text-[10px] text-[var(--ds-text-muted)] hover:text-[var(--ds-text-primary)] transition-colors">
          <Plus className="h-3 w-3" />
          Tag
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-52 p-0 bg-zinc-900 border-zinc-700"
        align="start"
        side="bottom"
      >
        <div className="p-2 border-b border-zinc-800">
          <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-zinc-800">
            <Search className="h-3 w-3 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tag..."
              className="bg-transparent text-xs text-[var(--ds-text-primary)] placeholder:text-zinc-500 outline-none w-full"
            />
          </div>
        </div>
        <div className="max-h-48 overflow-y-auto p-1">
          {isLoading ? (
            <div className="px-3 py-2 text-xs text-zinc-500">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-zinc-500">Nenhuma tag encontrada</div>
          ) : (
            filtered.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  onClick={() => onToggle(tag.id)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs hover:bg-zinc-800 transition-colors"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="flex-1 text-left text-[var(--ds-text-primary)] truncate">
                    {tag.name}
                  </span>
                  {isSelected && (
                    <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                  )}
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
