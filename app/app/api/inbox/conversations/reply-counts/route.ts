/**
 * Story 1.3: GET /api/inbox/conversations/reply-counts
 * Returns conversation counts grouped by reply_status
 */

import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const { data, error } = await supabase.rpc('get_reply_status_counts', {
      p_status: 'open',
    })

    if (error) {
      // Fallback: direct count if RPC not available
      const { data: conversations } = await supabase
        .from('inbox_conversations')
        .select('reply_status')
        .eq('status', 'open')

      const replied = conversations?.filter((c) => c.reply_status === 'replied').length || 0
      const unreplied = conversations?.filter((c) => c.reply_status === 'unreplied').length || 0

      return NextResponse.json({
        replied,
        unreplied,
        total: replied + unreplied,
      })
    }

    const counts = { replied: 0, unreplied: 0, total: 0 }
    for (const row of data || []) {
      if (row.reply_status === 'replied') counts.replied = Number(row.count)
      if (row.reply_status === 'unreplied') counts.unreplied = Number(row.count)
    }
    counts.total = counts.replied + counts.unreplied

    return NextResponse.json(counts)
  } catch (error) {
    console.error('[GET /api/inbox/conversations/reply-counts]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
