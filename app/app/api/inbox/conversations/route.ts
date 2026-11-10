/**
 * T020: GET /api/inbox/conversations - List conversations with filters
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { listConversations } from '@/lib/inbox/inbox-service'
import { getSupabaseAdmin } from '@/lib/supabase'
import { requireSessionOrApiKey } from '@/lib/request-auth'
import type { ConversationStatus, ConversationMode } from '@/types'

const querySchema = z.object({
  status: z.enum(['open', 'closed']).optional(),
  mode: z.enum(['bot', 'human']).optional(),
  label: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  // Story 1.2: Advanced filters
  tagIds: z.string().optional(), // comma-separated UUIDs
  assignedTo: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  phone: z.string().optional(),
  contactName: z.string().optional(),
  areaCode: z.string().max(5).optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  customFieldKey: z.string().optional(),
  customFieldValue: z.string().optional(),
  replyStatus: z.enum(['replied', 'unreplied', 'all']).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    if (searchParams.get('unreadCountOnly') === 'true') {
      const denied = await requireSessionOrApiKey(request)
      if (denied) return denied

      const db = getSupabaseAdmin()
      if (!db) throw new Error('Banco de dados não configurado')
      const { count, error } = await db
        .from('inbox_conversations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open')
        .gt('unread_count', 0)
      if (error) throw error
      if (!Number.isSafeInteger(count) || count === null || count < 0) throw new Error('Contagem de conversas indisponível')
      return NextResponse.json({ count }, { headers: { 'Cache-Control': 'private, no-store' } })
    }

    const parsed = querySchema.safeParse({
      status: searchParams.get('status') || undefined,
      mode: searchParams.get('mode') || undefined,
      label: searchParams.get('label') || undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20,
      // Story 1.2: Advanced filters
      tagIds: searchParams.get('tagIds') || undefined,
      assignedTo: searchParams.get('assignedTo') || undefined,
      campaignId: searchParams.get('campaignId') || undefined,
      phone: searchParams.get('phone') || undefined,
      contactName: searchParams.get('contactName') || undefined,
      areaCode: searchParams.get('areaCode') || undefined,
      createdAfter: searchParams.get('createdAfter') || undefined,
      createdBefore: searchParams.get('createdBefore') || undefined,
      customFieldKey: searchParams.get('customFieldKey') || undefined,
      customFieldValue: searchParams.get('customFieldValue') || undefined,
      replyStatus: searchParams.get('replyStatus') || undefined,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await listConversations({
      status: parsed.data.status as ConversationStatus | undefined,
      mode: parsed.data.mode as ConversationMode | undefined,
      labelId: parsed.data.label,
      search: parsed.data.search,
      page: parsed.data.page,
      limit: parsed.data.limit,
      // Story 1.2: Advanced filters
      tagIds: parsed.data.tagIds?.split(',').filter(Boolean),
      assignedTo: parsed.data.assignedTo,
      campaignId: parsed.data.campaignId,
      phone: parsed.data.phone,
      contactName: parsed.data.contactName,
      areaCode: parsed.data.areaCode,
      createdAfter: parsed.data.createdAfter,
      createdBefore: parsed.data.createdBefore,
      customFieldKey: parsed.data.customFieldKey,
      customFieldValue: parsed.data.customFieldValue,
      replyStatus: parsed.data.replyStatus as 'replied' | 'unreplied' | 'all' | undefined,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[GET /api/inbox/conversations]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
