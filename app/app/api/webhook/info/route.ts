import { NextResponse } from 'next/server'
import { settingsDb } from '@/lib/supabase-db'

import { getVerifyToken } from '@/lib/verify-token'

export async function GET() {
  // Build webhook URL
  let webhookUrl: string

  const vercelEnv = process.env.VERCEL_ENV || null

  // Prioridade:
  // 1. WEBHOOK_BASE_URL (override explícito — permite fixar o domínio canônico)
  // 2. VERCEL_PROJECT_PRODUCTION_URL (domínio de produção da Vercel)
  // 3. VERCEL_URL (domínio do deploy atual — útil em preview)
  // 4. NEXT_PUBLIC_APP_URL (fallback genérico)
  // 5. localhost (desenvolvimento local)
  if (process.env.WEBHOOK_BASE_URL) {
    const base = process.env.WEBHOOK_BASE_URL.trim().replace(/\/+$/, '')
    webhookUrl = `${base}/api/webhook`
  } else if (vercelEnv === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    webhookUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()}/api/webhook`
  } else if (process.env.VERCEL_URL) {
    webhookUrl = `https://${process.env.VERCEL_URL.trim()}/api/webhook`
  } else if (process.env.NEXT_PUBLIC_APP_URL) {
    webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL.trim()}/api/webhook`
  } else {
    webhookUrl = 'http://localhost:3000/api/webhook'
  }

  const webhookToken = await getVerifyToken()

  // Stats are now tracked in Supabase (campaign_contacts table)
  // (Sem stats via cache)

  return NextResponse.json({
    webhookUrl,
    webhookToken,
    stats: null, // Stats removed - use campaign details page instead
    debug: {
      vercelEnv,
      vercelUrl: process.env.VERCEL_URL || null,
      vercelProjectProductionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL || null,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || null,
      env: {
        hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        hasSupabasePublishableKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
        hasSupabaseSecretKey: Boolean(process.env.SUPABASE_SECRET_KEY),
        hasQstashToken: Boolean(process.env.QSTASH_TOKEN),
        hasAuthSecret: Boolean(process.env.AUTH_SECRET),
      },
      gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
      gitCommitRef: process.env.VERCEL_GIT_COMMIT_REF || null,
      gitCommitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE || null,
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID || null,
    },
  })
}
