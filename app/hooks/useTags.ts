/**
 * Story 1.1: useTags - Tag management hook (CRUD for all tags)
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tagService } from '@/services/tagService'
import type { Tag, CreateTagDTO, UpdateTagDTO } from '@/types'
import { CACHE } from '@/lib/constants'

const TAGS_KEY = ['tags']

export interface UseTagsOptions {
  initialData?: Tag[]
}

export function useTags(options: UseTagsOptions = {}) {
  const queryClient = useQueryClient()

  const tagsQuery = useQuery({
    queryKey: TAGS_KEY,
    queryFn: tagService.listTags,
    initialData: options.initialData,
    staleTime: CACHE.tags,
  })

  const createMutation = useMutation({
    mutationFn: (params: CreateTagDTO) => tagService.createTag(params),
    onSuccess: (newTag) => {
      queryClient.setQueryData<Tag[]>(TAGS_KEY, (old) =>
        old ? [...old, newTag].sort((a, b) => a.name.localeCompare(b.name)) : [newTag]
      )
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...params }: UpdateTagDTO & { id: string }) =>
      tagService.updateTag(id, params),
    onSuccess: (updatedTag) => {
      queryClient.setQueryData<Tag[]>(TAGS_KEY, (old) =>
        old?.map((t) => (t.id === updatedTag.id ? { ...t, ...updatedTag } : t))
          .sort((a, b) => a.name.localeCompare(b.name)) ?? []
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: tagService.deleteTag,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: TAGS_KEY })
      const previousTags = queryClient.getQueryData<Tag[]>(TAGS_KEY)
      queryClient.setQueryData<Tag[]>(TAGS_KEY, (old) =>
        old?.filter((tag) => tag.id !== id)
      )
      return { previousTags }
    },
    onError: (_, __, context) => {
      if (context?.previousTags) {
        queryClient.setQueryData(TAGS_KEY, context.previousTags)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-tags'] })
    },
  })

  return {
    tags: tagsQuery.data ?? [],
    isLoading: tagsQuery.isLoading,
    error: tagsQuery.error,

    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,

    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,

    refetch: tagsQuery.refetch,
  }
}
