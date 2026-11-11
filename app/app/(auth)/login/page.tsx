'use client'

/**
 * Login Page
 * 
 * Simple password login for single-tenant DaaS
 */

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, Eye, EyeOff, LogIn } from 'lucide-react'
import Image from 'next/image'
import { clearStoredOnboardingProgress } from '@/components/features/onboarding/hooks/useOnboardingProgress'
import LoginScene from './LoginScene'
import styles from './login.module.css'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [isLocalhost, setIsLocalhost] = useState(false)
  const [isConfigured, setIsConfigured] = useState(true)

  useEffect(() => {
    try {
      const host = window.location.hostname
      setIsLocalhost(host === 'localhost' || host === '127.0.0.1' || host === '::1')
    } catch {
      setIsLocalhost(false)
    }

    // Get company name from auth status
    fetch('/api/auth/status')
      .then(res => {
        return res.json()
      })
      .then(async (data) => {
        if (!data.isConfigured) {
          setIsConfigured(false)

          // Em localhost, não forçamos o fluxo da Vercel. Mostramos instrução para configurar .env.local.
          if (isLocalhost) {
            setError('Configuração local incompleta: defina MASTER_PASSWORD no .env.local e reinicie o servidor (npm run dev).')
            return
          }

          router.push('/install')
        } else if (!data.isSetup) {
          // Instalação incompleta - redireciona para o wizard
          router.push('/install/wizard')
        } else if (data.isAuthenticated) {
          router.push('/')
        } else if (data.company) {
          setCompanyName(data.company.name)
        }
      })
      .catch((err) => {
        console.error('🔍 [LOGIN] Auth status error:', err)
      })
  }, [router, isLocalhost])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!password) {
      setError('Digite sua senha')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao fazer login')
      }

      clearStoredOnboardingProgress()

      // Redirect to original destination or dashboard
      router.push(redirectTo)
      router.refresh()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.shell}>
      {/* Logo */}
      <div className={styles.brand}>
        <Image src="/icons/icon-512.png" alt="WhatsFlow" width={88} height={88} priority className={`${styles.logo} brand-mark brand-mark--pulse`} />
        <h1 className={styles.title}>
          {companyName || 'WhatsFlow'}
        </h1>
        <p className={styles.subtitle}>Entre para continuar</p>
      </div>

      {/* Card */}
      <div className={styles.panel}>
        {!isConfigured && isLocalhost && (
          <div className="mb-4 bg-[var(--ds-status-success-bg)] border border-[var(--ds-status-success)]/20 rounded-xl p-4">
            <p className="text-sm text-[var(--ds-status-success-text)] font-medium">Modo local</p>
            <p className="text-xs text-[var(--ds-text-secondary)] mt-1">
              Para destravar o login no localhost, defina <code className="bg-[var(--ds-bg-surface)] px-1.5 py-0.5 rounded">MASTER_PASSWORD</code> no <code className="bg-[var(--ds-bg-surface)] px-1.5 py-0.5 rounded">.env.local</code> e reinicie o dev server.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} aria-busy={isLoading}>
          <label htmlFor="login-password" className={styles.label}>Senha de acesso</label>
          <div className={styles.field}>
            <Lock className={styles.lock} size={20} aria-hidden="true" />
            <input
              id="login-password"
              aria-invalid={!!error}
              aria-describedby={error ? 'login-error' : undefined}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              name="password"
              autoComplete="current-password"
              className={styles.input}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={styles.eye}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {error && (
            <p id="login-error" role="alert" className={styles.error}>{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading || (!isConfigured && isLocalhost)}
            className={styles.submit}
          >
            {isLoading ? (
              <><span className={styles.spinner} aria-hidden="true" /><span role="status">Entrando...</span></>
            ) : (
              <>
                Entrar
                <LogIn className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p className={styles.footer}>
        WhatsFlow © {new Date().getFullYear()} | by{' '}
        <a
          href="https://www.instagram.com/luizhenriquexpro/"
          target="_blank"
          rel="noopener noreferrer"
        >
          @luizhenrique
        </a>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className={styles.page}>
      <LoginScene />
      <Suspense fallback={
        <p role="status">Carregando acesso...</p>
      }>
        <LoginForm />
      </Suspense>
    </main>
  )
}
