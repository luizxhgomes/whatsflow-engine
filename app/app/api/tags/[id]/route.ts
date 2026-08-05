/**
 * Story 1.1: PATCH/DELETE /api/tags/[id] - Update and delete tags
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { updateTag, deleteTag, getTagById } from '@/lib/tags/tags-db'

const patchSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  category: z.enum(['lead_status', 'segment', 'custom']).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = patchSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const existing = await getTagById(id)
    if (!existing) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    const tag = await updateTag(id, parsed.data)
    return NextResponse.json(tag)
  } catch (error) {
    console.error(`[PATCH /api/tags/${(await params).id}]`, error)

    if (error instanceof Error && error.message.includes('duplicate')) {
      return NextResponse.json(
        { error: 'Tag with this name already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await getTagById(id)
    if (!existing) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    await deleteTag(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`[DELETE /api/tags/${(await params).id}]`, error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
