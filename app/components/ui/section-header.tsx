import * as React from "react"
import { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * SectionHeader - Header de seção com indicador visual de cor
 *
 * Usado para organizar seções em páginas de configuração e formulários.
 * O indicador de cor ajuda a categorizar visualmente diferentes tipos de seções.
 *
 * Cores disponíveis:
 * - brand (emerald): Configurações principais, features ativas
 * - warning (amber): Configurações opcionais, atenção necessária
 * - info (blue): Informações, documentação
 * - neutral (zinc): Seções padrão
 *
 * @example
 * ```tsx
 * // Com indicador de cor
 * <SectionHeader
 *   title="Meta App (opcional)"
 *   description="Habilita validação forte do token"
 *   color="brand"
 *   icon={Settings}
 * />
 *
 * // Sem indicador
 * <SectionHeader
 *   title="Configurações Avançadas"
 *   showIndicator={false}
 * />
 *
 * // Com ações
 * <SectionHeader
 *   title="Webhooks"
 *   icon={Webhook}
 *   color="brand"
 *   actions={<Button size="sm">Configurar</Button>}
 * />
 * ```
 */

const indicatorColors = {
  brand: "bg-[var(--ds-text-brand)]",
  warning: "bg-[var(--ds-status-warning)]",
  info: "bg-[var(--ds-status-info)]",
  error: "bg-[var(--ds-status-error-text)]",
  neutral: "bg-[var(--ds-border-strong)]",
} as const

type IndicatorColor = keyof typeof indicatorColors

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Título da seção */
  title: string
  /** Descrição opcional (pode ser string ou ReactNode para formatação) */
  description?: React.ReactNode
  /** Cor do indicador */
  color?: IndicatorColor
  /** Se deve mostrar o indicador de cor */
  showIndicator?: boolean
  /** Ícone opcional */
  icon?: LucideIcon
  /** Ações à direita (botões, etc) */
  actions?: React.ReactNode
  /** Badge ou tag após o título */
  badge?: React.ReactNode
}

function SectionHeader({
  title,
  description,
  color = "brand",
  showIndicator = true,
  icon: Icon,
  actions,
  badge,
  className,
  ...props
}: SectionHeaderProps) {
  return (
    <div
      data-slot="section-header"
      className={cn("flex min-w-0 flex-wrap items-start gap-3", className)}
      {...props}
    >
      {/* Indicator bar */}
      {showIndicator && (
        <div
          className={cn(
            "w-1 self-stretch rounded-full flex-shrink-0",
            indicatorColors[color]
          )}
          aria-hidden="true"
        />
      )}

      {/* Icon */}
      {Icon && (
        <div className="ds-icon-tile" data-size="sm" data-tone={color} aria-hidden="true">
          <Icon className="size-1/2" />
        </div>
      )}

      {/* Content */}
      <div className="min-w-[min(12rem,100%)] flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-heading-4 text-[var(--ds-text-primary)]">{title}</h3>
          {badge}
        </div>
        {description && (
          <p className="text-body-small text-[var(--ds-text-muted)] mt-1">{description}</p>
        )}
      </div>

      {/* Actions */}
      {actions && (
        <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  )
}

/**
 * SectionContent - Wrapper para conteúdo de seção com padding alinhado
 */
function SectionContent({
  className,
  hasIndicator = true,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { hasIndicator?: boolean }) {
  return (
    <div
      data-slot="section-content"
      className={cn(
        "mt-4",
        hasIndicator && "pl-4", // Alinha com conteúdo após o indicador
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Section - Componente completo de seção (header + content)
 */
function Section({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      data-slot="section"
      className={cn("space-y-4", className)}
      {...props}
    >
      {children}
    </section>
  )
}

export { SectionHeader, SectionContent, Section, type IndicatorColor }
