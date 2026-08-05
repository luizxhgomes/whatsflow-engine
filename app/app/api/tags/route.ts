/**
 * Story 1.1: GET/POST /api/tags - List and create tags
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTags, createTag } from '@/lib/tags/tags-db'

const postSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#6B7280'),
  category: z.enum(['lead_status', 'segment', 'custom']).optional().default('custom'),
})

export async function GET() {
  try {
    const tags = await getTags()
    return NextResponse.json(tags)
  } catch (error) {
    console.error('[GET /api/tags]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = postSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const tag = await createTag(parsed.data)
    return NextResponse.json(tag, { status: 201 })
  } catch (error) {
    console.error('[POST /api/tags]', error)

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
