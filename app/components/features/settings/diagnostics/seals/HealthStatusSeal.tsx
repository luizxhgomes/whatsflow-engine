'use client'

import type { MetaDiagnosticsCheck, MetaDiagnosticsCheckStatus } from '../types'
import { StatusBadge } from '../StatusBadge'
import { Container } from '@/components/ui/container'

export interface HealthStatusSealProps {
  checks: MetaDiagnosticsCheck[]
}

export function HealthStatusSeal({ checks }: HealthStatusSealProps) {
  const health = checks.find((c) => c.id === 'meta_health_status')
  const overall = String((health?.details as Record<string, unknown>)?.overall || '')

  const status: MetaDiagnosticsCheckStatus =
    overall === 'BLOCKED' ? 'fail' : overall === 'LIMITED' ? 'warn' : overall === 'AVAILABLE' ? 'pass' : 'info'

  const subtitle =
    overall === 'BLOCKED'
      ? 'Bloqueio confirmado pela Meta (Health Status). Não há "auto-fix" aqui: precisa resolver no Business Manager/Meta.'
      : overall === 'LIMITED'
        ? 'Envio limitado pela Meta. Pode afetar volume/entregabilidade até resolver a causa.'
        : overall === 'AVAILABLE'
          ? 'Envio liberado segundo a Meta (prova oficial).'
          : 'Health Status não disponível (ou não foi possível consultar).'

  return (
    <Container variant="glass" padding="md">
      <div className="text-xs text-gray-500">Semaforo</div>
      <div className="mt-2 flex items-center gap-2">
        <StatusBadge status={status} />
        <div className="text-sm text-white font-medium">Health Status: {overall || '—'}</div>
      </div>
      <div className="mt-2 text-sm text-gray-300">{subtitle}</div>
      <div className="mt-2 text-xs text-gray-500">
        Fonte: Graph API · field <span className="font-mono">health_status</span>
      </div>
    </Container>
  )
}
