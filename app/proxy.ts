import { NextRequest, NextResponse } from 'next/server'
import {
    verifyApiKey, verifyAdminAccess, verifyQStashRequest,
    isAdminEndpoint, isPublicEndpoint, unauthorizedResponse, forbiddenResponse,
} from '@/lib/auth'
import { validateSession } from '@/lib/user-auth'

export const config = {
    // Only actual static directories/files bypass authentication, never API suffixes.
    matcher: ['/((?!_next/static(?:/|$)|_next/image$|favicon\\.ico$|manifest\\.json$|sw\\.js$|openapi\\.yaml$|nexus\\.mp3$|icons/|screenshots/).*)'],
}

const PUBLIC_PAGES = ['/login', '/f', '/atendimento', '/docs']
const CORS_ALLOWED_ORIGINS = ['http://localhost:5173', 'http://localhost:3000']

function addCorsHeaders(response: NextResponse, request: NextRequest): NextResponse {
    const origin = request.headers.get('origin') || ''
    if (origin && (origin === request.nextUrl.origin || CORS_ALLOWED_ORIGINS.includes(origin))) {
        response.headers.set('Access-Control-Allow-Origin', origin)
        response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD')
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key')
        response.headers.set('Access-Control-Allow-Credentials', 'true')
        response.headers.set('Vary', 'Origin')
    }
    return response
}

export async function proxy(request: NextRequest) {
    const pathname = request.nextUrl.pathname
    const hasMasterPassword = !!process.env.MASTER_PASSWORD
    const isApiRoute = pathname.startsWith('/api/')
    const next = () => addCorsHeaders(NextResponse.next(), request)
    const login = () => {
        const url = new URL('/login', request.url)
        url.searchParams.set('redirect', pathname)
        return NextResponse.redirect(url)
    }

    if (request.method === 'OPTIONS') {
        return addCorsHeaders(new NextResponse(null, { status: 204 }), request)
    }

    // Neon verifies server JWTs using this public key, including during setup.
    if (pathname === '/.well-known/jwks.json') return next()

    // Setup creates an administrative session, so a prior cookie is not sufficient.
    if (pathname === '/api/auth/setup') {
        if (process.env.INSTALLER_ENABLED === 'false') return forbiddenResponse('Installer desabilitado')
        const auth = await verifyAdminAccess(request)
        return auth.valid ? next() : unauthorizedResponse(auth.error)
    }

    const isInstallerPage = pathname === '/install' || pathname.startsWith('/install/')
    const isInstallerApi = pathname.startsWith('/api/installer/')
    if (isInstallerApi && process.env.INSTALLER_ENABLED === 'false') return forbiddenResponse('Installer desabilitado')
    if (!hasMasterPassword) {
        if (isInstallerPage || isInstallerApi) return next()
        if (!isApiRoute) return NextResponse.redirect(new URL('/install', request.url))
    }

    // Exact callback paths stay public; their handlers authenticate external senders.
    if (isApiRoute && isPublicEndpoint(pathname, request.method)) return next()
    if (!isApiRoute && PUBLIC_PAGES.some(page => pathname === page || pathname.startsWith(`${page}/`))) {
        return NextResponse.next()
    }

    // QStash callbacks must never trust the presence of a header.
    const isQStashCallback = pathname === '/api/campaign/dispatch' ||
        pathname === '/api/campaign/workflow' ||
        /^\/api\/builder\/workflow\/[^/]+\/(execute|timeout)$/.test(pathname)
    if (isQStashCallback && request.headers.has('upstash-signature')) {
        return await verifyQStashRequest(request, await request.clone().text())
            ? next() : unauthorizedResponse('Invalid QStash signature')
    }

    if (isApiRoute && isAdminEndpoint(pathname)) {
        const auth = await verifyAdminAccess(request)
        if (!auth.valid) return auth.error?.includes('Admin')
            ? forbiddenResponse(auth.error) : unauthorizedResponse(auth.error)
        return next()
    }

    const token = request.cookies.get('whatsflow_session')?.value
    if (token && await validateSession(token)) return next()
    if (!isApiRoute) return login()

    const auth = isInstallerApi ? await verifyAdminAccess(request) : await verifyApiKey(request)
    return auth.valid ? next() : unauthorizedResponse(auth.error)
}
