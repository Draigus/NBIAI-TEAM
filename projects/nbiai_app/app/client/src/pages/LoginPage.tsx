import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// NBI logo mark — geometric "N" in Electric Indigo Blue
// ---------------------------------------------------------------------------

function NbiLogoMark() {
  return (
    <div className="w-9 h-9 rounded-md bg-accent-muted flex items-center justify-center">
      <svg
        width={22}
        height={22}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Left vertical bar */}
        <rect x="2" y="2" width="4" height="20" fill="#4F6EF7" />
        {/* Diagonal bar: top-left to bottom-right */}
        <polygon points="6,2 10,2 18,22 14,22" fill="#4F6EF7" />
        {/* Right vertical bar */}
        <rect x="18" y="2" width="4" height="20" fill="#4F6EF7" />
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Error messages
// ---------------------------------------------------------------------------

type LoginError = 'invalid_credentials' | 'network_error' | 'account_inactive' | null

const ERROR_MESSAGES: Record<NonNullable<LoginError>, string> = {
  invalid_credentials: 'Invalid email or password. Please try again.',
  network_error: 'Something went wrong. Please check your connection and try again.',
  account_inactive: 'Your account has been deactivated. Contact your administrator.',
}

// ---------------------------------------------------------------------------
// LoginPage
// ---------------------------------------------------------------------------

export default function LoginPage() {
  const navigate = useNavigate()
  const { user, isLoading: authLoading, login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<LoginError>(null)

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, authLoading, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isSubmitting) return

    setError(null)
    setIsSubmitting(true)

    const timeoutId = setTimeout(() => {
      setIsSubmitting(false)
      setError('network_error')
    }, 10_000)

    try {
      await login(email, password)
      clearTimeout(timeoutId)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      clearTimeout(timeoutId)
      const status = (err as { status?: number })?.status
      const code = (err as { error?: { code?: string } })?.error?.code
      if (status === 401 || code === 'UNAUTHORIZED') {
        setError('invalid_credentials')
      } else if (status === 403 || code === 'FORBIDDEN') {
        setError('account_inactive')
      } else {
        setError('network_error')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-base">
      <div className="bg-surface border border-subtle rounded-xl p-10 w-[400px] shadow-lg">
        {/* Logo lockup */}
        <div className="flex flex-col items-center mb-8">
          <NbiLogoMark />
          <h1 className="text-[22px] font-bold tracking-tight text-primary text-center mt-3">
            NBIAI Team
          </h1>
          <p className="text-xs text-muted text-center mt-1">
            Control plane for your AI company
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Email field */}
          <div>
            <label
              htmlFor="login-email"
              className="text-xs font-medium text-secondary mb-1.5 block"
            >
              Email address
            </label>
            <Input
              id="login-email"
              type="email"
              placeholder="you@nbi-consulting.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              autoFocus
              autoComplete="email"
              required
            />
          </div>

          {/* Password field */}
          <div className="mt-4">
            <label
              htmlFor="login-password"
              className="text-xs font-medium text-secondary mb-1.5 block"
            >
              Password
            </label>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                autoComplete="current-password"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            className="w-full mt-6"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </Button>

          {/* Error alert */}
          {error && (
            <div
              className={cn(
                'flex items-start gap-2 rounded-md p-3 mt-4 text-sm',
                'bg-status-red/10 border border-status-red/30 text-status-red',
              )}
              role="alert"
              aria-live="polite"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{ERROR_MESSAGES[error]}</span>
            </div>
          )}
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted">
          Access is invitation only. Contact your administrator if you need access.
        </p>

        {/* Setup link */}
        <p className="mt-3 text-center text-xs text-muted">
          First time?{' '}
          <Link
            to="/setup"
            className="text-accent hover:text-accent-hover transition-colors"
          >
            Set up your account &rarr;
          </Link>
        </p>
      </div>
    </div>
  )
}
