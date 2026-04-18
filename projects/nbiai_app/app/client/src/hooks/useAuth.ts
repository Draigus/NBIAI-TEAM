import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
  createElement,
} from 'react'
import { auth, setAccessToken, clearTokens } from '@/lib/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface User {
  id: string
  email: string
  displayName: string
  role: 'board' | 'admin' | 'viewer'
  avatarUrl: string | null
}

interface AuthState {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthState | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // On mount, attempt to restore the session. Access tokens live in memory
  // and are always absent after a page reload; the refresh token is an
  // httpOnly cookie the browser sends automatically to /api/v1/auth/*.
  // A successful silent refresh re-hydrates the in-memory access token and
  // lets us call /me. Any failure (no cookie, expired, revoked) leaves the
  // user logged out.
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const refreshRes = await auth.silentRefresh()
        if (!refreshRes) {
          setIsLoading(false)
          return
        }
        setAccessToken(refreshRes.accessToken)

        // The /me endpoint returns the user object directly (no data wrapper).
        const res = await auth.me()
        setUser(res as User)
      } catch {
        clearTokens()
      } finally {
        setIsLoading(false)
      }
    }

    restoreSession()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    // The login endpoint returns { accessToken, user } directly (no data
    // wrapper). The refresh token is set as an httpOnly cookie by the server.
    const res = (await auth.login(email, password)) as {
      accessToken: string
      user: User
    }
    setAccessToken(res.accessToken)
    setUser(res.user)
  }, [])

  const logout = useCallback(async () => {
    try {
      await auth.logout()
    } catch {
      // Proceed with local cleanup even if the server call fails
    } finally {
      clearTokens()
      setUser(null)
    }
  }, [])

  return createElement(AuthContext.Provider, { value: { user, isLoading, login, logout } }, children)
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
