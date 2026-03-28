import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
  createElement,
} from 'react'
import { auth, setTokens, clearTokens, getToken } from '@/lib/api'

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

  // On mount, attempt to restore the session.
  // BUG-001 fix: the access token is now stored in memory (not localStorage), so
  // it is always absent after a page reload. If a refresh token is in localStorage
  // we attempt a silent refresh to obtain a new access token before calling /me.
  useEffect(() => {
    const inMemoryToken = getToken()
    const storedRefreshToken = localStorage.getItem('refreshToken')

    if (!inMemoryToken && !storedRefreshToken) {
      // No session at all — nothing to restore.
      setIsLoading(false)
      return
    }

    const restoreSession = async () => {
      try {
        // If there is no in-memory access token (e.g. after a page reload) but
        // a refresh token exists, silently obtain a new access token first.
        if (!inMemoryToken && storedRefreshToken) {
          const refreshRes = (await auth.refreshWithToken(storedRefreshToken)) as {
            accessToken: string
            refreshToken: string
          }
          setTokens(refreshRes.accessToken, refreshRes.refreshToken)
        }

        // The /me endpoint returns the user object directly (no data wrapper).
        const res = await auth.me()
        const data = res as User
        setUser(data)
      } catch {
        clearTokens()
      } finally {
        setIsLoading(false)
      }
    }

    restoreSession()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    // The login endpoint returns { accessToken, refreshToken, user } directly
    // (no data wrapper). See auth.ts issueTokens().
    const res = (await auth.login(email, password)) as {
      accessToken: string
      refreshToken: string
      user: User
    }
    setTokens(res.accessToken, res.refreshToken)
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
