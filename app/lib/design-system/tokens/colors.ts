/**
 * WhatsFlow Design System - Color Tokens
 *
 * Sistema de cores baseado em camadas:
 * 1. Primitivas (raw colors) - valores hex/hsl puros
 * 2. Semânticas (semantic) - cores com significado (brand, status, etc)
 * 3. Componentes (component) - cores específicas de UI
 *
 * IDENTIDADE VISUAL v2:
 * - Brand Primary: Red (Crimson)
 * - Info/Processing: Purple (absorveu papel do blue)
 * - Error: Neutro (preto no light, branco no dark)
 * - Success: Green (semântico, mantido)
 * - Blue: REMOVIDO da paleta
 */

// =============================================================================
// PRIMITIVE COLORS
// Cores brutas sem significado semântico - base para tudo
// =============================================================================

export const primitiveColors = {
  // Zinc Scale (Neutrals)
  zinc: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
    950: '#09090b',
  },

  // Green Scale (Success only - semântico)
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },

  // Red Scale (Brand Primary - Crimson)
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },

  // Amber Scale (Warning)
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },

  // Orange Scale (Info/Processing + Scheduled/AI + Triggers)
  orange: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
    950: '#431407',
  },

  // Violet Scale (AI/Agent nodes)
  violet: {
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
  },

  // Cyan Scale (Data/Templates)
  cyan: {
    400: '#22d3ee',
    500: '#06b6d4',
    600: '#0891b2',
  },

  // Pink Scale (Media nodes)
  pink: {
    400: '#f472b6',
    500: '#ec4899',
    600: '#db2777',
  },

  // Pure values
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const

// =============================================================================
// SEMANTIC COLORS
// Cores com significado - usadas na aplicação
// =============================================================================

export const semanticColors = {
  // Brand (Red Crimson - nova identidade WhatsFlow v2)
  brand: {
    primary: primitiveColors.red[600],       // #dc2626
    primaryHover: primitiveColors.red[700],   // #b91c1c
    primaryActive: primitiveColors.red[800],  // #991b1b
    primaryMuted: primitiveColors.red[600] + '1a', // 10% opacity
    primarySubtle: primitiveColors.red[950],  // #450a0a
  },

  // Backgrounds
  bg: {
    base: primitiveColors.zinc[950],
    elevated: primitiveColors.zinc[900],
    surface: primitiveColors.zinc[800],
    overlay: 'rgba(9, 9, 11, 0.8)',
    glass: 'rgba(24, 24, 27, 0.7)',
    hover: 'rgba(255, 255, 255, 0.05)',
    active: 'rgba(255, 255, 255, 0.08)',
  },

  // Text
  text: {
    primary: primitiveColors.zinc[100],
    secondary: primitiveColors.zinc[400],
    muted: primitiveColors.zinc[500],
    disabled: primitiveColors.zinc[600],
    inverse: primitiveColors.zinc[950],
    brand: primitiveColors.red[400],          // #f87171
  },

  // Borders
  border: {
    subtle: 'rgba(255, 255, 255, 0.05)',
    default: 'rgba(255, 255, 255, 0.10)',
    strong: 'rgba(255, 255, 255, 0.15)',
    brand: primitiveColors.red[600],          // #dc2626
    focus: primitiveColors.red[400],          // #f87171
  },

  // Status Colors
  status: {
    success: {
      base: primitiveColors.green[500],       // #22c55e
      text: primitiveColors.green[400],       // #4ade80
      bg: primitiveColors.green[500] + '1a',
      border: primitiveColors.green[500] + '33',
    },
    error: {
      // Neutro: preto (light mode) / branco (dark mode)
      // Tokens TS definem dark mode default, CSS vars fazem override no light
      base: primitiveColors.white,
      text: primitiveColors.white,
      bg: 'rgba(255, 255, 255, 0.08)',
      border: 'rgba(255, 255, 255, 0.15)',
    },
    warning: {
      base: primitiveColors.amber[500],
      text: primitiveColors.amber[400],
      bg: primitiveColors.amber[500] + '1a',
      border: primitiveColors.amber[500] + '33',
    },
    info: {
      base: primitiveColors.orange[500],      // #f97316
      text: primitiveColors.orange[400],      // #fb923c
      bg: primitiveColors.orange[500] + '1a',
      border: primitiveColors.orange[500] + '33',
    },
  },

  // Campaign Status (specific to WhatsFlow)
  campaign: {
    draft: {
      text: primitiveColors.zinc[400],
      bg: primitiveColors.zinc[500] + '1a',
    },
    scheduled: {
      text: primitiveColors.orange[400],
      bg: primitiveColors.orange[500] + '1a',
    },
    sending: {
      text: primitiveColors.orange[300],      // #fdba74
      bg: primitiveColors.orange[500] + '1a',
    },
    completed: {
      text: primitiveColors.green[400],       // #4ade80
      bg: primitiveColors.green[500] + '1a',
    },
    paused: {
      text: primitiveColors.amber[400],
      bg: primitiveColors.amber[500] + '1a',
    },
    failed: {
      // Neutro: adapta ao tema
      text: primitiveColors.zinc[400],
      bg: primitiveColors.zinc[500] + '1a',
    },
  },
} as const

// =============================================================================
// NODE COLORS (Workflow Builder)
// Cores específicas para o builder de workflows
// =============================================================================

export const nodeColors = {
  message: {
    border: 'hsl(0, 72%, 51%)',              // Red brand
    bg: 'hsl(0, 60%, 16%)',
    accent: primitiveColors.red[600],
  },
  ai: {
    border: 'hsl(262.1, 83.3%, 57.8%)',
    bg: 'hsl(263, 70%, 24%)',
    accent: primitiveColors.violet[500],
  },
  flow: {
    border: 'hsl(25, 95%, 53%)',             // Orange (substituiu blue→purple)
    bg: 'hsl(25, 80%, 16%)',
    accent: primitiveColors.orange[500],
  },
  trigger: {
    border: 'hsl(20.5, 90.2%, 48.2%)',
    bg: 'hsl(20, 80%, 18%)',
    accent: primitiveColors.orange[500],
  },
  media: {
    border: 'hsl(333.3, 71.4%, 50.6%)',
    bg: 'hsl(326, 60%, 18%)',
    accent: primitiveColors.pink[500],
  },
  data: {
    border: 'hsl(191.6, 91.4%, 36.5%)',
    bg: 'hsl(192, 80%, 14%)',
    accent: primitiveColors.cyan[500],
  },
  default: {
    border: 'hsl(0, 0%, 34%)',
    bg: 'hsl(0, 0%, 12%)',
    accent: primitiveColors.zinc[500],
  },
} as const

// =============================================================================
// CSS VARIABLES MAPPING
// Para uso no globals.css
// =============================================================================

export const colorCssVars = {
  // Primitivas já estão definidas no globals.css
  // Aqui definimos as semânticas como CSS vars

  '--ds-brand-primary': semanticColors.brand.primary,
  '--ds-brand-primary-hover': semanticColors.brand.primaryHover,
  '--ds-brand-primary-muted': semanticColors.brand.primaryMuted,

  '--ds-bg-base': semanticColors.bg.base,
  '--ds-bg-elevated': semanticColors.bg.elevated,
  '--ds-bg-surface': semanticColors.bg.surface,
  '--ds-bg-overlay': semanticColors.bg.overlay,
  '--ds-bg-glass': semanticColors.bg.glass,
  '--ds-bg-hover': semanticColors.bg.hover,

  '--ds-text-primary': semanticColors.text.primary,
  '--ds-text-secondary': semanticColors.text.secondary,
  '--ds-text-muted': semanticColors.text.muted,
  '--ds-text-brand': semanticColors.text.brand,

  '--ds-border-subtle': semanticColors.border.subtle,
  '--ds-border-default': semanticColors.border.default,
  '--ds-border-strong': semanticColors.border.strong,
  '--ds-border-focus': semanticColors.border.focus,
} as const

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type PrimitiveColorScale = keyof typeof primitiveColors
export type SemanticColorCategory = keyof typeof semanticColors
export type NodeCategory = keyof typeof nodeColors
export type CampaignStatus = keyof typeof semanticColors.campaign

/** @deprecated Blue scale removed in v2. Use purple for info/processing. */
export const BLUE_REMOVED_NOTICE = 'Blue scale removed. Use primitiveColors.orange instead.' as const
