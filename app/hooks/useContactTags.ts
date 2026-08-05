/**
 * Story 1.1: useContactTags - Tags for a specific contact
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tagService } from '@/services/tagService'
import type { Tag } from '@/types'

const CONTACT_TAGS_KEY = (contactId: string) => ['contact-tags', contactId]

export function useContactTags(contactId: string | null) {
  const queryClient = useQueryClient()

  const tagsQuery = useQuery({
    queryKey: CONTACT_TAGS_KEY(contactId || ''),
    queryFn: () => tagService.getContactTags(contactId!),
    enabled: !!contactId,
    staleTime: 30 * 1000,
  })

  const syncMutation = useMutation({
    mutationFn: (tagIds: string[]) => tagService.syncContactTags(contactId!, tagIds),
    onSuccess: (updatedTags) => {
      queryClient.setQueryData<Tag[]>(CONTACT_TAGS_KEY(contactId!), updatedTags)
      // Invalidate global tags to refresh counts
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })

  return {
    tags: tagsQuery.data ?? [],
    isLoading: tagsQuery.isLoading,
    error: tagsQuery.error,

    sync: syncMutation.mutateAsync,
    isSyncing: syncMutation.isPending,

    refetch: tagsQuery.refetch,
  }
}
