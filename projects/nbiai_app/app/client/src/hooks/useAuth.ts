import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
  createElement,
} from 'react'
import { auth, setTokens, clearTokens } from '@/lib/api'

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

  // On mount, if a token exists, hydrate the user
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      setIsLoading(false)
      return
    }

    auth
      .me()
      .then((res) => {
        const data = (res as { data: User }).data
        setUser(data)
      })
      .catch(() => {
        clearTokens()
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = (await auth.login(email, password)) as {
      data: { accessToken: string; refreshToken: string; user: User }
    }
    setTokens(res.data.accessToken, res.data.refreshToken)
    setUser(res.data.user)
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
