/** Initial company setup. Administrative credentials are required before any write. */
import { NextRequest, NextResponse } from 'next/server'
import { completeSetup, isSetupComplete } from '@/lib/user-auth'
import { unauthorizedResponse, verifyAdminAccess } from '@/lib/auth'

export async function POST(request: NextRequest) {
  if (process.env.INSTALLER_ENABLED === 'false') {
    return NextResponse.json({ error: 'Installer desabilitado' }, { status: 403 })
  }
  const auth = await verifyAdminAccess(request)
  if (!auth.valid) return unauthorizedResponse(auth.error)

  try {
    if (await isSetupComplete()) {
      return NextResponse.json({ error: 'Setup já foi concluído' }, { status: 400 })
    }

    const { companyName, companyAdmin, email, phone } = await request.json()
    if (![companyName, companyAdmin, email, phone].every(value => typeof value === 'string' && value.length > 0)) {
      return NextResponse.json(
        { error: 'Empresa, responsável, e-mail e telefone são obrigatórios' },
        { status: 400 }
      )
    }

    const result = await completeSetup(companyName, companyAdmin, email, phone, request)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json({ success: true, company: result.company })
  } catch (error) {
    console.error('[auth/setup] Falha ao completar setup:', error)
    return NextResponse.json({ error: 'Erro ao completar setup' }, { status: 500 })
  }
}
