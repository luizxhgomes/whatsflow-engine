/**
 * Story 1.2: useInboxFilters - Advanced filter state with URL sync
 */

'use client'

import { useCallback, useMemo } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import type { ConversationStatus, ConversationMode } from '@/types'

export interface InboxFilters {
  status: ConversationStatus | null
  mode: ConversationMode | null
  labelId: string | null
  search: string
  tagIds: string[]
  assignedTo: string | null
  campaignId: string | null
  phone: string | null
  contactName: string | null
  areaCode: string | null
  createdAfter: string | null
  createdBefore: string | null
  customFieldKey: string | null
  customFieldValue: string | null
  replyStatus: 'replied' | 'unreplied' | 'all'
}

const EMPTY_FILTERS: InboxFilters = {
  status: null,
  mode: null,
  labelId: null,
  search: '',
  tagIds: [],
  assignedTo: null,
  campaignId: null,
  phone: null,
  contactName: null,
  areaCode: null,
  createdAfter: null,
  createdBefore: null,
  customFieldKey: null,
  customFieldValue: null,
  replyStatus: 'all',
}

export function useInboxFilters() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const filters: InboxFilters = useMemo(() => ({
    status: (searchParams.get('status') as ConversationStatus) || null,
    mode: (searchParams.get('mode') as ConversationMode) || null,
    labelId: searchParams.get('labelId'),
    search: searchParams.get('search') || '',
    tagIds: searchParams.get('tagIds')?.split(',').filter(Boolean) || [],
    assignedTo: searchParams.get('assignedTo'),
    campaignId: searchParams.get('campaignId'),
    phone: searchParams.get('phone'),
    contactName: searchParams.get('contactName'),
    areaCode: searchParams.get('areaCode'),
    createdAfter: searchParams.get('createdAfter'),
    createdBefore: searchParams.get('createdBefore'),
    customFieldKey: searchParams.get('customFieldKey'),
    customFieldValue: searchParams.get('customFieldValue'),
    replyStatus: (searchParams.get('replyStatus') as 'replied' | 'unreplied' | 'all') || 'all',
  }), [searchParams])

  const updateFilters = useCallback((updates: Partial<InboxFilters>) => {
    const params = new URLSearchParams(searchParams.toString())

    // Preserve conversation selection
    const conversationId = params.get('c')

    // Build new params
    const newFilters = { ...filters, ...updates }
    const newParams = new URLSearchParams()

    if (conversationId) newParams.set('c', conversationId)
    if (newFilters.status) newParams.set('status', newFilters.status)
    if (newFilters.mode) newParams.set('mode', newFilters.mode)
    if (newFilters.labelId) newParams.set('labelId', newFilters.labelId)
    if (newFilters.search) newParams.set('search', newFilters.search)
    if (newFilters.tagIds.length) newParams.set('tagIds', newFilters.tagIds.join(','))
    if (newFilters.assignedTo) newParams.set('assignedTo', newFilters.assignedTo)
    if (newFilters.campaignId) newParams.set('campaignId', newFilters.campaignId)
    if (newFilters.phone) newParams.set('phone', newFilters.phone)
    if (newFilters.contactName) newParams.set('contactName', newFilters.contactName)
    if (newFilters.areaCode) newParams.set('areaCode', newFilters.areaCode)
    if (newFilters.createdAfter) newParams.set('createdAfter', newFilters.createdAfter)
    if (newFilters.createdBefore) newParams.set('createdBefore', newFilters.createdBefore)
    if (newFilters.customFieldKey) newParams.set('customFieldKey', newFilters.customFieldKey)
    if (newFilters.customFieldValue) newParams.set('customFieldValue', newFilters.customFieldValue)
    if (newFilters.replyStatus !== 'all') newParams.set('replyStatus', newFilters.replyStatus)

    const qs = newParams.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
  }, [searchParams, filters, router, pathname])

  const clearAll = useCallback(() => {
    const params = new URLSearchParams()
    const conversationId = searchParams.get('c')
    if (conversationId) params.set('c', conversationId)
    const qs = params.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
  }, [searchParams, router, pathname])

  const removeFilter = useCallback((key: keyof InboxFilters) => {
    if (key === 'tagIds') {
      updateFilters({ tagIds: [] })
    } else if (key === 'replyStatus') {
      updateFilters({ replyStatus: 'all' })
    } else if (key === 'search') {
      updateFilters({ search: '' })
    } else {
      updateFilters({ [key]: null })
    }
  }, [updateFilters])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.status) count++
    if (filters.mode) count++
    if (filters.labelId) count++
    if (filters.tagIds.length) count++
    if (filters.assignedTo) count++
    if (filters.campaignId) count++
    if (filters.phone) count++
    if (filters.contactName) count++
    if (filters.areaCode) count++
    if (filters.createdAfter || filters.createdBefore) count++
    if (filters.customFieldKey) count++
    if (filters.replyStatus !== 'all') count++
    return count
  }, [filters])

  const activeFilterLabels = useMemo(() => {
    const labels: { key: keyof InboxFilters; label: string }[] = []
    if (filters.status) labels.push({ key: 'status', label: `Status: ${filters.status === 'open' ? 'Abertas' : 'Fechadas'}` })
    if (filters.mode) labels.push({ key: 'mode', label: `Modo: ${filters.mode === 'bot' ? 'Bot' : 'Humano'}` })
    if (filters.labelId) labels.push({ key: 'labelId', label: 'Etiqueta' })
    if (filters.tagIds.length) labels.push({ key: 'tagIds', label: `${filters.tagIds.length} tag(s)` })
    if (filters.assignedTo) labels.push({ key: 'assignedTo', label: 'Admin atribuido' })
    if (filters.campaignId) labels.push({ key: 'campaignId', label: 'Campanha' })
    if (filters.phone) labels.push({ key: 'phone', label: `Tel: ${filters.phone}` })
    if (filters.contactName) labels.push({ key: 'contactName', label: `Nome: ${filters.contactName}` })
    if (filters.areaCode) labels.push({ key: 'areaCode', label: `DDD: ${filters.areaCode}` })
    if (filters.createdAfter || filters.createdBefore) labels.push({ key: 'createdAfter', label: 'Data inscricao' })
    if (filters.customFieldKey) labels.push({ key: 'customFieldKey', label: `${filters.customFieldKey}: ${filters.customFieldValue}` })
    if (filters.replyStatus !== 'all') labels.push({ key: 'replyStatus', label: filters.replyStatus === 'unreplied' ? 'Nao respondidas' : 'Respondidas' })
    return labels
  }, [filters])

  return {
    filters,
    updateFilters,
    clearAll,
    removeFilter,
    activeFilterCount,
    activeFilterLabels,
  }
}
