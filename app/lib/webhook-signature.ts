import type { NextRequest } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { settingsDb } from '@/lib/supabase-db'

type WebhookSignatureResult =
  | { valid: true; mode: 'verified' | 'dev_bypass' }
  | { valid: false; reason: 'missing_secret' | 'missing_header' | 'invalid_signature' }

/**
 * Resolve o Meta App Secret com prioridade:
 *   1. env var `META_APP_SECRET` (produção)
 *   2. Supabase settings `metaAppSecret` (fallback — salvo via /api/settings/meta-app)
 *
 * Retorna string vazia se nenhuma fonte tiver valor.
 */
async function resolveMetaAppSecret(): Promise<string> {
  const envSecret = String(process.env.META_APP_SECRET || '').trim()
  if (envSecret) return envSecret

  try {
    const dbSecret = await settingsDb.get('metaAppSecret')
    if (typeof dbSecret === 'string' && dbSecret.trim()) {
      return dbSecret.trim()
    }
  } catch (err) {
    console.error('[Webhook] Falha ao buscar metaAppSecret do Supabase settings:', err)
  }

  return ''
}

/**
 * Valida assinatura HMAC-SHA256 do webhook Meta (header `X-Hub-Signature-256`).
 *
 * Política fail-close (ADR-004 / Fase 0 C5):
 *   - Se o app secret não está configurado em nenhuma fonte (env + settings), retorna
 *     `{ valid: false, reason: 'missing_secret' }`. O caller responde 503 para que
 *     a Meta tente retry depois de o operador regularizar a configuração.
 *   - Bypass explícito apenas em dev: `WEBHOOK_ALLOW_UNSIGNED=true` ativa o modo
 *     `dev_bypass` (com log warn) — NUNCA usar em produção.
 *   - Header ausente ou malformado → `missing_header`.
 *   - Assinatura não bate → `invalid_signature` (caller responde 401 — Meta descarta).
 */
export async function verifyMetaWebhookSignature(input: {
  request: NextRequest
  rawBody: string
}): Promise<WebhookSignatureResult> {
  const appSecret = await resolveMetaAppSecret()

  if (!appSecret) {
    if (process.env.NODE_ENV === 'development' && process.env.WEBHOOK_ALLOW_UNSIGNED === 'true') {
      console.warn(
        '[Webhook][SECURITY] META_APP_SECRET ausente — bypass habilitado via WEBHOOK_ALLOW_UNSIGNED=true. Uso restrito a ambientes de desenvolvimento.'
      )
      return { valid: true, mode: 'dev_bypass' }
    }
    console.error(
      '[Webhook][CRITICAL] META_APP_SECRET não configurado (env var ausente e Supabase settings `metaAppSecret` vazio). Webhooks retornarão 503 até regularização. Configure via /api/settings/meta-app ou variável de ambiente.'
    )
    return { valid: false, reason: 'missing_secret' }
  }

  const header =
    input.request.headers.get('x-hub-signature-256') ||
    input.request.headers.get('X-Hub-Signature-256') ||
    ''

  if (!header.startsWith('sha256=')) {
    return { valid: false, reason: 'missing_header' }
  }

  const expected = `sha256=${createHmac('sha256', appSecret).update(input.rawBody, 'utf8').digest('hex')}`
  try {
    const a = Buffer.from(header)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return { valid: false, reason: 'invalid_signature' }
    const ok = timingSafeEqual(a, b)
    return ok ? { valid: true, mode: 'verified' } : { valid: false, reason: 'invalid_signature' }
  } catch {
    return { valid: false, reason: 'invalid_signature' }
  }
}

