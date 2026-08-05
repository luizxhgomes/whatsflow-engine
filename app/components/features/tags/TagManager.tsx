/**
 * Story 1.1: TagManager - Full CRUD modal for managing tags
 */

'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Tags } from 'lucide-react'
import { useTags } from '@/hooks/useTags'
import { TagBadge } from './TagBadge'
import type { TagCategory } from '@/types'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

const TAG_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#14B8A6',
  '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280', '#F43F5E',
]

const CATEGORY_LABELS: Record<TagCategory, string> = {
  lead_status: 'Status do Lead',
  segment: 'Segmento',
  custom: 'Personalizada',
}

interface TagManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TagManager({ open, onOpenChange }: TagManagerProps) {
  const { tags, create, update, delete: deleteTag, isCreating } = useTags()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState(TAG_COLORS[0])
  const [category, setCategory] = useState<TagCategory>('custom')

  function resetForm() {
    setName('')
    setColor(TAG_COLORS[0])
    setCategory('custom')
    setEditingId(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    if (editingId) {
      await update({ id: editingId, name: name.trim(), color, category })
    } else {
      await create({ name: name.trim(), color, category })
    }
    resetForm()
  }

  function startEdit(tag: { id: string; name: string; color: string; category: TagCategory }) {
    setEditingId(tag.id)
    setName(tag.name)
    setColor(tag.color)
    setCategory(tag.category as TagCategory)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[360px] bg-zinc-900 border-zinc-800 p-0"
      >
        <SheetHeader className="px-4 py-3 border-b border-zinc-800">
          <SheetTitle className="flex items-center gap-2 text-sm text-[var(--ds-text-primary)]">
            <Tags className="h-4 w-4" />
            Gerenciar Tags
          </SheetTitle>
        </SheetHeader>

        <div className="p-4 space-y-4">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da tag"
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-[var(--ds-text-primary)] placeholder:text-zinc-500 outline-none focus:border-emerald-500/50"
            />
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-5 h-5 rounded-full transition-all ${
                      color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-zinc-900' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TagCategory)}
                className="flex-1 px-2 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-[var(--ds-text-primary)] outline-none"
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!name.trim() || isCreating}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium disabled:opacity-50 transition-colors"
              >
                <Plus className="h-3 w-3" />
                {editingId ? 'Salvar' : 'Criar'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-2 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          {/* Tag List */}
          <div className="space-y-1">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wide px-1">
              Tags ({tags.length})
            </div>
            {tags.length === 0 ? (
              <div className="text-xs text-zinc-500 py-4 text-center">
                Nenhuma tag criada
              </div>
            ) : (
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-zinc-800/50 group transition-colors"
                  >
                    <TagBadge name={tag.name} color={tag.color} size="md" />
                    <span className="text-[10px] text-zinc-500 ml-auto">
                      {tag.contact_count || 0}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(tag)}
                        className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => deleteTag(tag.id)}
                        className="p-1 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
