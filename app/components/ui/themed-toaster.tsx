'use client'

import { Toaster } from 'sonner'
import { useTheme } from 'next-themes'

/**
 * Toaster que sincroniza automaticamente com o tema atual
 * Usa next-themes para detectar o tema resolvido
 */
export function ThemedToaster() {
  const { resolvedTheme } = useTheme()

  return (
    <Toaster
      richColors
      position="top-right"
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
    />
  )
}
