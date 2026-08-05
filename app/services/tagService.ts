/**
 * Story 1.1: Tag Service - Client-side API wrapper for tags
 */

import type { Tag, CreateTagDTO, UpdateTagDTO } from '@/types'

async function listTags(): Promise<Tag[]> {
  const response = await fetch('/api/tags')
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch tags' }))
    throw new Error(error.error || 'Failed to fetch tags')
  }
  return response.json()
}

async function createTag(params: CreateTagDTO): Promise<Tag> {
  const response = await fetch('/api/tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create tag' }))
    throw new Error(error.error || 'Failed to create tag')
  }
  return response.json()
}

async function updateTag(id: string, params: UpdateTagDTO): Promise<Tag> {
  const response = await fetch(`/api/tags/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update tag' }))
    throw new Error(error.error || 'Failed to update tag')
  }
  return response.json()
}

async function deleteTag(id: string): Promise<void> {
  const response = await fetch(`/api/tags/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete tag' }))
    throw new Error(error.error || 'Failed to delete tag')
  }
}

async function getContactTags(contactId: string): Promise<Tag[]> {
  const response = await fetch(`/api/contacts/${contactId}/tags`)
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch contact tags' }))
    throw new Error(error.error || 'Failed to fetch contact tags')
  }
  return response.json()
}

async function syncContactTags(contactId: string, tagIds: string[]): Promise<Tag[]> {
  const response = await fetch(`/api/contacts/${contactId}/tags`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag_ids: tagIds }),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to sync contact tags' }))
    throw new Error(error.error || 'Failed to sync contact tags')
  }
  return response.json()
}

export const tagService = {
  listTags,
  createTag,
  updateTag,
  deleteTag,
  getContactTags,
  syncContactTags,
}
