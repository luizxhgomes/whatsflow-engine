import { randomBytes } from 'crypto'
import { Receiver } from '@upstash/qstash'

/**
 * Authentication & Authorization Middleware
 *
 * Provides API key authentication for all API routes
 * Protects against unauthorized access
 */

import { NextRequest, NextResponse } from 'next/server'

// ============================================================================
// Types
// ============================================================================

export interface AuthResult {
  valid: boolean
  error?: string
  keyType?: 'admin' | 'api'
}

// ============================================================================
// Constants
// ============================================================================

// Admin endpoints that require special protection
export const ADMIN_ENDPOINTS = [
  '/api/database/init',
  '/api/database/cleanup',
  '/api/database/migrate',
  '/api/database/fix-schema',
  '/api/vercel/redeploy',
  '/api/vercel/info',
]

// Public endpoints that don't require authentication
export const PUBLIC_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/status',
  '/api/webhook',
  '/api/health',
  '/api/system',
  '/api/flows/endpoint', // Meta data exchange, verified by its handler
]

// ============================================================================
// API Key Verification
// ============================================================================

/**
 * Verify API key from request headers
 * 
 * Expects header: Authorization: Bearer <api_key>
 * Or: X-API-Key: <api_key>
 */
export async function verifyApiKey(request: Pick<NextRequest, 'headers'>): Promise<AuthResult> {
  // Extract API key from headers
  const authHeader = request.headers.get('authorization')
  const apiKeyHeader = request.headers.get('x-api-key')

  let apiKey: string | null = null

  if (authHeader?.startsWith('Bearer ')) {
    apiKey = authHeader.slice(7)
  } else if (apiKeyHeader) {
    apiKey = apiKeyHeader
  }

  if (!apiKey) {
    return {
      valid: false,
      error: 'Missing API key. Use Authorization: Bearer <key> or X-API-Key header'
    }
  }

  // Check against environment variables
  const envApiKey = process.env.WHATSFLOW_API_KEY
  const envAdminKey = process.env.WHATSFLOW_ADMIN_KEY

  if (envAdminKey && apiKey === envAdminKey) {
    return { valid: true, keyType: 'admin' }
  }

  if (envApiKey && apiKey === envApiKey) {
    return { valid: true, keyType: 'api' }
  }

  return {
    valid: false,
    error: 'Invalid API key'
  }
}

/**
 * Check if request is for an admin endpoint
 */
export function isAdminEndpoint(pathname: string): boolean {
  return ADMIN_ENDPOINTS.some(endpoint => pathname.startsWith(endpoint))
}

/**
 * Check if request is for a public endpoint
 */
export function isPublicEndpoint(pathname: string): boolean {
  return PUBLIC_ENDPOINTS.includes(pathname) || /^\/api\/public\/lead-forms\/[^/]+(?:\/submit)?$/.test(pathname)
}

/**
 * Verify admin access
 * Returns true if request has admin-level API key
 */
export async function verifyAdminAccess(request: Pick<NextRequest, 'headers'>): Promise<AuthResult> {
  const authResult = await verifyApiKey(request)

  if (!authResult.valid) {
    return authResult
  }

  if (authResult.keyType !== 'admin') {
    return {
      valid: false,
      error: 'Admin access required for this endpoint'
    }
  }

  return authResult
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    {
      error: 'Unauthorized',
      message,
      hint: 'Include Authorization: Bearer <api_key> header'
    },
    {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Bearer realm="WhatsFlow API"'
      }
    }
  )
}

/**
 * Create forbidden response
 */
export function forbiddenResponse(message: string = 'Forbidden'): NextResponse {
  return NextResponse.json(
    {
      error: 'Forbidden',
      message
    },
    { status: 403 }
  )
}

// ============================================================================
// API Key Management
// ============================================================================

/**
 * Generate a new API key
 */
export function generateApiKey(): string {
  return 'szap_' + randomBytes(24).toString('base64url').slice(0, 32)
}

/** QStash authentication binds the signature to the raw body and destination URL. */
export async function verifyQStashRequest(request: Request, body: string): Promise<boolean> {
  const signature = request.headers.get('upstash-signature')
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY
  if (!signature || !currentSigningKey || !nextSigningKey) return false
  try {
    const url = new URL(request.url)
    const publicBase = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.WEBHOOK_BASE_URL?.trim()
    if (publicBase) {
      const origin = new URL(publicBase)
      url.protocol = origin.protocol
      url.host = origin.host
      url.port = origin.port
    }
    return await new Receiver({ currentSigningKey, nextSigningKey }).verify({
      signature, body, url: url.href,
    })
  } catch {
    return false
  }
}
