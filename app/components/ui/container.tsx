import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Container com Design System
 *
 * Substitui as ~173 ocorrencias de:
 * - rounded-2xl border border-white/10 bg-zinc-900/60
 * - bg-zinc-950/40 border border-white/5
 *
 * Variantes:
 * - default: fundo elevado com borda sutil
 * - elevated: fundo mais claro com sombra maior
 * - glass: efeito glassmorphism com backdrop-blur
 * - surface: fundo sólido sem transparência
 */
const containerVariants = cva(
  [
    "min-w-0 rounded-2xl",
    "[transition:var(--ds-transition-normal)]",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-[var(--ds-bg-elevated)]",
          "border border-[var(--ds-border-default)]",
        ].join(" "),
        elevated: [
          "bg-[var(--ds-bg-surface)]",
          "border border-[var(--ds-border-default)]",
          "[box-shadow:var(--ds-shadow-card)]",
        ].join(" "),
        glass: [
          "glass-panel",
        ].join(" "),
        surface: [
          "bg-[var(--ds-bg-elevated)]",
          "border border-[var(--ds-border-default)]",
        ].join(" "),
        subtle: [
          "bg-[var(--ds-bg-base)]",
          "border border-[var(--ds-border-subtle)]",
        ].join(" "),
      },
      padding: {
        none: "",
        sm: "p-3",
        md: "p-[var(--ds-card-padding)]",
        lg: "p-[clamp(1rem,2.2vw,1.75rem)]",
        xl: "p-[clamp(1.25rem,3vw,2rem)]",
      },
      hover: {
        true: [
          "hover:[box-shadow:var(--ds-shadow-card-hover)]",
          "hover:border-[var(--ds-border-strong)]",
        ].join(" "),
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "md",
      hover: false,
    },
  }
)

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {}

/**
 * Container genérico com estilos do Design System
 *
 * @example
 * ```tsx
 * // Container padrão
 * <Container>Conteúdo aqui</Container>
 *
 * // Container com hover
 * <Container hover>Card clicável</Container>
 *
 * // Container glass
 * <Container variant="glass" padding="lg">Modal content</Container>
 * ```
 */
function Container({
  className,
  variant,
  padding,
  hover,
  ...props
}: ContainerProps) {
  return (
    <div
      data-slot="container"
      className={cn(containerVariants({ variant, padding, hover }), className)}
      {...props}
    />
  )
}

export { Container, containerVariants }
