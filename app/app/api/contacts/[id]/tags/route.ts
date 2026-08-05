/**
 * Story 1.1: GET/PUT /api/contacts/[id]/tags - Get and sync contact tags
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getContactTags, syncContactTags } from '@/lib/tags/tags-db'

const putSchema = z.object({
  tag_ids: z.array(z.string().uuid()).max(50),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tags = await getContactTags(id)
    return NextResponse.json(tags)
  } catch (error) {
    console.error(`[GET /api/contacts/${(await params).id}/tags]`, error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = putSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    await syncContactTags(id, parsed.data.tag_ids)
    const tags = await getContactTags(id)
    return NextResponse.json(tags)
  } catch (error) {
    console.error(`[PUT /api/contacts/${(await params).id}/tags]`, error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
