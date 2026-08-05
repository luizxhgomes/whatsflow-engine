/**
 * Story 1.2: InboxFilterPopover - Advanced filters dropdown
 */

'use client'

import { useState } from 'react'
import { Filter, ChevronRight, Tag, Phone, UserCircle, Megaphone, Calendar, Hash, FileText, UserCheck } from 'lucide-react'
import { useTags } from '@/hooks/useTags'
import type { InboxFilters } from '@/hooks/useInboxFilters'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface InboxFilterPopoverProps {
  filters: InboxFilters
  onUpdate: (updates: Partial<InboxFilters>) => void
  activeCount: number
}

type FilterPanel = 'main' | 'tags' | 'phone' | 'name' | 'areaCode' | 'date' | 'customField'

const FILTER_ITEMS = [
  { id: 'tags' as FilterPanel, label: 'Etiqueta', icon: Tag },
  { id: 'phone' as FilterPanel, label: 'Telefone', icon: Phone },
  { id: 'name' as FilterPanel, label: 'Nome', icon: UserCircle },
  { id: 'areaCode' as FilterPanel, label: 'Código de Área', icon: Hash },
  { id: 'date' as FilterPanel, label: 'Data de inscricao', icon: Calendar },
  { id: 'customField' as FilterPanel, label: 'Campo personalizado', icon: FileText },
] as const

export function InboxFilterPopover({ filters, onUpdate, activeCount }: InboxFilterPopoverProps) {
  const [open, setOpen] = useState(false)
  const [panel, setPanel] = useState<FilterPanel>('main')
  const { tags } = useTags()

  // Text input state for sub-panels
  const [inputValue, setInputValue] = useState('')
  const [cfKey, setCfKey] = useState('')
  const [cfValue, setCfValue] = useState('')

  function applyTextFilter(key: keyof InboxFilters, value: string) {
    if (value.trim()) {
      onUpdate({ [key]: value.trim() })
    }
    setInputValue('')
    setPanel('main')
  }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setPanel('main') }}>
      <PopoverTrigger asChild>
        <button
          className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors relative ${
            activeCount > 0
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'text-[var(--ds-text-muted)] hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-bg-surface)]'
          }`}
          title="Filtros avancados"
        >
          <Filter className="h-3.5 w-3.5" />
          {activeCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-[9px] text-white flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-0 bg-zinc-900 border-zinc-700"
        align="end"
        side="bottom"
      >
        {panel === 'main' ? (
          <div className="py-1">
            <div className="px-3 py-1.5 text-[10px] text-zinc-500 uppercase tracking-wide">
              Adicionar Filtros
            </div>
            {FILTER_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => { setPanel(id); setInputValue('') }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--ds-text-primary)] hover:bg-zinc-800 transition-colors"
              >
                <Icon className="h-3.5 w-3.5 text-zinc-400" />
                <span className="flex-1 text-left">{label}</span>
                <ChevronRight className="h-3 w-3 text-zinc-600" />
              </button>
            ))}
          </div>
        ) : panel === 'tags' ? (
          <div className="py-1">
            <button onClick={() => setPanel('main')} className="px-3 py-1.5 text-[10px] text-emerald-400 hover:underline">&larr; Voltar</button>
            <div className="max-h-48 overflow-y-auto px-1">
              {tags.map((tag) => {
                const isSelected = filters.tagIds.includes(tag.id)
                return (
                  <button
                    key={tag.id}
                    onClick={() => {
                      const newIds = isSelected
                        ? filters.tagIds.filter((id) => id !== tag.id)
                        : [...filters.tagIds, tag.id]
                      onUpdate({ tagIds: newIds })
                    }}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs hover:bg-zinc-800 transition-colors"
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                    <span className="flex-1 text-left text-[var(--ds-text-primary)]">{tag.name}</span>
                    {isSelected && <span className="text-emerald-400 text-[10px]">✓</span>}
                  </button>
                )
              })}
            </div>
          </div>
        ) : panel === 'customField' ? (
          <div className="p-3 space-y-2">
            <button onClick={() => setPanel('main')} className="text-[10px] text-emerald-400 hover:underline">&larr; Voltar</button>
            <input
              value={cfKey}
              onChange={(e) => setCfKey(e.target.value)}
              placeholder="Nome do campo"
              className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-[var(--ds-text-primary)] placeholder:text-zinc-500 outline-none"
            />
            <input
              value={cfValue}
              onChange={(e) => setCfValue(e.target.value)}
              placeholder="Valor"
              className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-[var(--ds-text-primary)] placeholder:text-zinc-500 outline-none"
            />
            <button
              onClick={() => {
                if (cfKey.trim() && cfValue.trim()) {
                  onUpdate({ customFieldKey: cfKey.trim(), customFieldValue: cfValue.trim() })
                  setCfKey(''); setCfValue(''); setPanel('main')
                }
              }}
              className="w-full py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
            >
              Aplicar
            </button>
          </div>
        ) : panel === 'date' ? (
          <div className="p-3 space-y-2">
            <button onClick={() => setPanel('main')} className="text-[10px] text-emerald-400 hover:underline">&larr; Voltar</button>
            <label className="text-[10px] text-zinc-500">De</label>
            <input
              type="date"
              value={filters.createdAfter?.split('T')[0] || ''}
              onChange={(e) => onUpdate({ createdAfter: e.target.value ? `${e.target.value}T00:00:00Z` : null })}
              className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-[var(--ds-text-primary)] outline-none"
            />
            <label className="text-[10px] text-zinc-500">Ate</label>
            <input
              type="date"
              value={filters.createdBefore?.split('T')[0] || ''}
              onChange={(e) => onUpdate({ createdBefore: e.target.value ? `${e.target.value}T23:59:59Z` : null })}
              className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-[var(--ds-text-primary)] outline-none"
            />
          </div>
        ) : (
          // Generic text input panels (phone, name, areaCode)
          <div className="p-3 space-y-2">
            <button onClick={() => setPanel('main')} className="text-[10px] text-emerald-400 hover:underline">&larr; Voltar</button>
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                panel === 'phone' ? 'Ex: 5511999...' :
                panel === 'name' ? 'Nome do contato' :
                panel === 'areaCode' ? 'Ex: 55, 11, 21' : ''
              }
              className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-[var(--ds-text-primary)] placeholder:text-zinc-500 outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const key = panel === 'name' ? 'contactName' : panel
                  applyTextFilter(key as keyof InboxFilters, inputValue)
                }
              }}
            />
            <button
              onClick={() => {
                const key = panel === 'name' ? 'contactName' : panel
                applyTextFilter(key as keyof InboxFilters, inputValue)
              }}
              className="w-full py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
            >
              Aplicar
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
