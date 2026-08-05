/**
 * Tags Database Layer
 * Story 1.1: CRUD operations for tags and contact-tag associations
 * Tags are CRM-level lead/contact classification (separate from inbox_labels)
 */

import { getSupabaseAdmin } from '@/lib/supabase'
import type { Tag, CreateTagDTO, UpdateTagDTO } from '@/types'

function getClient() {
  const client = getSupabaseAdmin()
  if (!client) {
    throw new Error('Supabase admin client not configured. Check SUPABASE_SECRET_KEY env var.')
  }
  return client
}

// =============================================================================
// Tags CRUD
// =============================================================================

/**
 * Get all tags with contact counts
 */
export async function getTags(): Promise<Tag[]> {
  const supabase = getClient()

  const { data: tags, error } = await supabase
    .from('tags')
    .select('*')
    .order('name')

  if (error) {
    throw new Error(`Failed to fetch tags: ${error.message}`)
  }

  // Get counts via RPC
  const { data: counts } = await supabase.rpc('get_tag_counts')

  const countMap = new Map<string, number>()
  if (counts) {
    for (const row of counts) {
      countMap.set(row.tag_id, Number(row.contact_count))
    }
  }

  return (tags || []).map((tag) => ({
    ...tag,
    contact_count: countMap.get(tag.id) || 0,
  })) as Tag[]
}

/**
 * Get a single tag by ID
 */
export async function getTagById(id: string): Promise<Tag | null> {
  const supabase = getClient()

  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw new Error(`Failed to fetch tag: ${error.message}`)
  }

  return data as Tag
}

/**
 * Create a tag
 */
export async function createTag(dto: CreateTagDTO): Promise<Tag> {
  const supabase = getClient()

  const { data, error } = await supabase
    .from('tags')
    .insert({
      name: dto.name,
      color: dto.color || '#6B7280',
      category: dto.category || 'custom',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create tag: ${error.message}`)
  }

  return { ...data, contact_count: 0 } as Tag
}

/**
 * Update a tag
 */
export async function updateTag(id: string, dto: UpdateTagDTO): Promise<Tag> {
  const supabase = getClient()

  const { data, error } = await supabase
    .from('tags')
    .update({ ...dto, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update tag: ${error.message}`)
  }

  return data as Tag
}

/**
 * Delete a tag (cascade deletes contact_tags)
 */
export async function deleteTag(id: string): Promise<void> {
  const supabase = getClient()

  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete tag: ${error.message}`)
  }
}

// =============================================================================
// Contact-Tag Associations
// =============================================================================

/**
 * Get tags for a specific contact
 */
export async function getContactTags(contactId: string): Promise<Tag[]> {
  const supabase = getClient()

  const { data, error } = await supabase
    .from('contact_tags')
    .select('tag:tags(*)')
    .eq('contact_id', contactId)

  if (error) {
    throw new Error(`Failed to fetch contact tags: ${error.message}`)
  }

  return (data || [])
    .map((row: { tag: Tag | Tag[] }) => Array.isArray(row.tag) ? row.tag[0] : row.tag)
    .filter(Boolean) as Tag[]
}

/**
 * Sync tags for a contact (replace all with provided tag IDs)
 */
export async function syncContactTags(
  contactId: string,
  tagIds: string[]
): Promise<void> {
  const supabase = getClient()

  // Delete existing
  await supabase
    .from('contact_tags')
    .delete()
    .eq('contact_id', contactId)

  // Insert new
  if (tagIds.length > 0) {
    const { error } = await supabase
      .from('contact_tags')
      .insert(
        tagIds.map((tagId) => ({
          contact_id: contactId,
          tag_id: tagId,
        }))
      )

    if (error) {
      throw new Error(`Failed to sync contact tags: ${error.message}`)
    }
  }
}
