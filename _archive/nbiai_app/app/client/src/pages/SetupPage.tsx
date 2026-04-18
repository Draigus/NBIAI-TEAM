import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Check,
  CheckCircle,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { auth } from '@/lib/api'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Password strength
// ---------------------------------------------------------------------------

type PasswordStrength = 'weak' | 'fair' | 'strong'

function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return 'weak'
  let score = 0
  if (password.length >= 12) score++
  if (password.length >= 16) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (score >= 4) return 'strong'
  if (score >= 2) return 'fair'
  return 'weak'
}

const STRENGTH_CONFIG: Record<PasswordStrength, { label: string; colour: string; bars: number }> = {
  weak: { label: 'Weak', colour: 'bg-status-red', bars: 1 },
  fair: { label: 'Fair', colour: 'bg-status-amber', bars: 2 },
  strong: { label: 'Strong', colour: 'bg-status-green', bars: 3 },
}

function PasswordStrengthIndicator({ password }: { password: string }) {
  if (!password) return null
  const strength = getPasswordStrength(password)
  const config = STRENGTH_CONFIG[strength]
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3].map((bar) => (
          <div
            key={bar}
            className={cn(
              'h-1 flex-1 rounded-full transition-all duration-150',
              bar <= config.bars ? config.colour : 'bg-elevated',
            )}
          />
        ))}
      </div>
      <p
        className={cn(
          'text-xs',
          strength === 'strong'
            ? 'text-status-green'
            : strength === 'fair'
            ? 'text-status-amber'
            : 'text-status-red',
        )}
      >
        {config.label}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step indicator (3 steps)
// ---------------------------------------------------------------------------

const STEP_LABELS = ['Company', 'Account', 'Done'] as const

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEP_LABELS.map((label, index) => {
        const stepNum = index + 1
        const isDone = current > stepNum
        const isActive = current === stepNum
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                  isDone
                    ? 'bg-status-green text-inverse'
                    : isActive
                    ? 'bg-accent text-inverse'
                    : 'bg-elevated text-muted border border-subtle',
                )}
              >
                {isDone ? <Check size={13} /> : stepNum}
              </div>
              <span
                className={cn(
                  'text-[11px] font-medium',
                  isActive ? 'text-primary' : 'text-muted',
                )}
              >
                {label}
              </span>
            </div>
            {index < STEP_LABELS.length - 1 && (
              <div
                className={cn(
                  'w-10 h-px mb-4',
                  current > stepNum ? 'bg-status-green' : 'bg-subtle',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// NBI logo mark
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
        <rect x="2" y="2" width="4" height="20" fill="#4F6EF7" />
        <polygon points="6,2 10,2 18,22 14,22" fill="#4F6EF7" />
        <rect x="18" y="2" width="4" height="20" fill="#4F6EF7" />
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SetupPage
// ---------------------------------------------------------------------------

export default function SetupPage() {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [networkError, setNetworkError] = useState('')
  const [alreadyComplete, setAlreadyComplete] = useState(false)

  // Step 1
  const [companyName, setCompanyName] = useState('')
  const [companyNameError, setCompanyNameError] = useState('')

  // Step 2
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // ---------------------------------------------------------------------------
  // Step 1 submit
  // ---------------------------------------------------------------------------

  function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyName.trim()) {
      setCompanyNameError('Company name is required.')
      return
    }
    setCompanyNameError('')
    setStep(2)
  }

  // ---------------------------------------------------------------------------
  // Step 2 validation
  // ---------------------------------------------------------------------------

  function validateStep2(): boolean {
    const errors: Record<string, string> = {}
    if (!displayName.trim()) errors.displayName = 'Full name is required.'
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email.trim()) {
      errors.email = 'Email address is required.'
    } else if (!emailPattern.test(email)) {
      errors.email = 'Enter a valid email address.'
    }
    if (password.length < 12) errors.password = 'Must be at least 12 characters.'
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.'
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleStep2Submit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateStep2()) return

    setNetworkError('')
    setIsLoading(true)

    try {
      await auth.setup({
        companyName: companyName.trim(),
        displayName: displayName.trim(),
        email: email.trim(),
        password,
      })
      setStep(3)
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status
      if (status === 403) {
        setAlreadyComplete(true)
      } else {
        setNetworkError('Something went wrong. Please check your connection and try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Already complete
  // ---------------------------------------------------------------------------

  if (alreadyComplete) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base">
        <div className="bg-surface border border-subtle rounded-xl p-10 w-[400px] shadow-lg text-center">
          <AlertCircle size={40} className="mx-auto mb-4 text-status-amber" />
          <h1 className="text-[22px] font-bold tracking-tight text-primary mb-2">
            Setup already complete
          </h1>
          <p className="text-sm text-secondary mb-6">
            Your NBIAI Command Centre has already been configured.
          </p>
          <Link to="/login">
            <Button size="lg" className="w-full">Sign in instead</Button>
          </Link>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Step 3 — done
  // ---------------------------------------------------------------------------

  if (step === 3) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base">
        <div className="bg-surface border border-subtle rounded-xl p-10 w-[400px] shadow-lg">
          <StepIndicator current={3} />
          <div className="flex flex-col items-center text-center">
            <CheckCircle size={48} className="text-status-green mb-6" />
            <h1 className="text-[22px] font-bold tracking-tight text-primary">
              You're all set.
            </h1>
            <p className="text-sm text-secondary mt-2 mb-8">
              Your NBIAI Command Centre is ready. Sign in to get started.
            </p>
            <Link to="/login" className="w-full">
              <Button size="lg" className="w-full">Go to Command Centre</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Shared card wrapper
  // ---------------------------------------------------------------------------

  return (
    <div className="flex items-center justify-center min-h-screen bg-base py-12">
      <div className="bg-surface border border-subtle rounded-xl p-10 w-[400px] shadow-lg">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <NbiLogoMark />
        </div>

        <StepIndicator current={step} />

        {/* Step 1 — Company */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} noValidate>
            <h1 className="text-[22px] font-bold tracking-tight text-primary mb-1">
              Set up your company
            </h1>
            <p className="text-sm text-secondary mb-6">
              This information is displayed throughout the app.
            </p>

            <div>
              <label
                htmlFor="setup-company"
                className="text-xs font-medium text-secondary mb-1.5 block"
              >
                Company name <span className="text-status-red">*</span>
              </label>
              <Input
                id="setup-company"
                placeholder="NBI Consulting"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value)
                  if (companyNameError) setCompanyNameError('')
                }}
                autoFocus
              />
              {companyNameError && (
                <p className="text-xs text-status-red mt-1.5">{companyNameError}</p>
              )}
            </div>

            <Button type="submit" size="lg" className="w-full mt-6">
              Continue
            </Button>

            <p className="mt-4 text-center text-xs text-muted">
              Already set up?{' '}
              <Link
                to="/login"
                className="text-accent hover:text-accent-hover transition-colors"
              >
                Sign in
              </Link>
            </p>
          </form>
        )}

        {/* Step 2 — Account */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} noValidate>
            <h1 className="text-[22px] font-bold tracking-tight text-primary mb-1">
              Set up the board user
            </h1>
            <p className="text-sm text-secondary mb-6">
              This is Glen Pryer — the human operator. Only one board user is allowed.
            </p>

            {/* Full name */}
            <div>
              <label
                htmlFor="setup-name"
                className="text-xs font-medium text-secondary mb-1.5 block"
              >
                Full name <span className="text-status-red">*</span>
              </label>
              <Input
                id="setup-name"
                placeholder="Glen Pryer"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value)
                  if (fieldErrors.displayName)
                    setFieldErrors((p) => ({ ...p, displayName: '' }))
                }}
                autoFocus
              />
              {fieldErrors.displayName && (
                <p className="text-xs text-status-red mt-1.5">{fieldErrors.displayName}</p>
              )}
            </div>

            {/* Email */}
            <div className="mt-4">
              <label
                htmlFor="setup-email"
                className="text-xs font-medium text-secondary mb-1.5 block"
              >
                Email address <span className="text-status-red">*</span>
              </label>
              <Input
                id="setup-email"
                type="email"
                placeholder="glen@nbi-consulting.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' }))
                }}
                autoComplete="email"
              />
              {fieldErrors.email && (
                <p className="text-xs text-status-red mt-1.5">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="mt-4">
              <label
                htmlFor="setup-password"
                className="text-xs font-medium text-secondary mb-1.5 block"
              >
                Password <span className="text-status-red">*</span>
              </label>
              <div className="relative">
                <Input
                  id="setup-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: '' }))
                  }}
                  autoComplete="new-password"
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
              {fieldErrors.password ? (
                <p className="text-xs text-status-red mt-1.5">{fieldErrors.password}</p>
              ) : (
                <PasswordStrengthIndicator password={password} />
              )}
            </div>

            {/* Confirm password */}
            <div className="mt-4">
              <label
                htmlFor="setup-confirm"
                className="text-xs font-medium text-secondary mb-1.5 block"
              >
                Confirm password <span className="text-status-red">*</span>
              </label>
              <div className="relative">
                <Input
                  id="setup-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    if (fieldErrors.confirmPassword)
                      setFieldErrors((p) => ({ ...p, confirmPassword: '' }))
                  }}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary transition-colors"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-status-red mt-1.5">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            {/* Network error */}
            {networkError && (
              <div
                className="flex items-start gap-2 rounded-md p-3 mt-4 text-sm bg-status-red/10 border border-status-red/30 text-status-red"
                role="alert"
                aria-live="polite"
              >
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{networkError}</span>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => setStep(1)}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button type="submit" size="lg" className="flex-1" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create account'
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
