// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

// BUG-001 fix: access token stored in module-level memory to protect against XSS.
// It is never written to localStorage.
// BUG-002 partial fix: refresh token remains in localStorage for now so that
// sessions survive page reloads. In production this MUST be replaced with an
// httpOnly cookie set by the server (requires backend Set-Cookie change) so
// that JavaScript cannot access it at all.
let accessToken: string | null = null

export function getToken(): string | null {
  return accessToken
}

export function setTokens(newAccessToken: string, refreshToken: string): void {
  accessToken = newAccessToken
  localStorage.setItem('refreshToken', refreshToken)
}

export function clearTokens(): void {
  accessToken = null
  localStorage.removeItem('refreshToken')
}

// ---------------------------------------------------------------------------
// Base fetch
// ---------------------------------------------------------------------------

let isRefreshing = false
let refreshQueue: Array<(token: string | null) => void> = []

function drainQueue(token: string | null) {
  refreshQueue.forEach((cb) => cb(token))
  refreshQueue = []
}

async function attemptRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return null

  try {
    const res = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return null
    const json = await res.json()
    const { accessToken, refreshToken: newRefreshToken } = json
    setTokens(accessToken, newRefreshToken)
    return accessToken
  } catch {
    return null
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(path, { ...options, headers })

  if (res.status !== 401) {
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: res.statusText } }))
      throw err
    }
    return res.json() as Promise<T>
  }

  // 401 — attempt token refresh once
  if (isRefreshing) {
    return new Promise<T>((resolve, reject) => {
      refreshQueue.push(async (newToken) => {
        if (!newToken) {
          clearTokens()
          window.location.href = '/login'
          reject(new Error('Session expired'))
          return
        }
        const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` }
        const retryRes = await fetch(path, { ...options, headers: retryHeaders })
        if (!retryRes.ok) reject(await retryRes.json())
        else resolve(retryRes.json() as T)
      })
    })
  }

  isRefreshing = true
  const newToken = await attemptRefresh()
  isRefreshing = false
  drainQueue(newToken)

  if (!newToken) {
    clearTokens()
    window.location.href = '/login'
    throw new Error('Session expired')
  }

  const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` }
  const retryRes = await fetch(path, { ...options, headers: retryHeaders })
  if (!retryRes.ok) {
    if (retryRes.status === 401) {
      clearTokens()
      window.location.href = '/login'
    }
    throw await retryRes.json()
  }
  return retryRes.json() as T
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const auth = {
  login: (email: string, password: string) =>
    apiFetch('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () => {
    const refreshToken = localStorage.getItem('refreshToken')
    return apiFetch('/api/v1/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })
  },

  refresh: () =>
    apiFetch('/api/v1/auth/refresh', { method: 'POST' }),

  // Silent refresh used on app mount to restore an in-memory access token after
  // a page reload. Calls fetch directly rather than apiFetch to avoid the 401
  // retry loop that would cause infinite recursion during session restoration.
  refreshWithToken: async (refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> => {
    const res = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) throw new Error('Refresh failed')
    return res.json()
  },

  me: () =>
    apiFetch('/api/v1/auth/me'),

  setup: (data: Record<string, unknown>) =>
    apiFetch('/api/v1/auth/setup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

export const agents = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return apiFetch(`/api/v1/agents${qs}`)
  },

  get: (id: string) =>
    apiFetch(`/api/v1/agents/${id}`),

  create: (data: Record<string, unknown>) =>
    apiFetch('/api/v1/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Record<string, unknown>) =>
    apiFetch(`/api/v1/agents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch(`/api/v1/agents/${id}`, { method: 'DELETE' }),

  trigger: (agentId: string, taskId?: string) =>
    apiFetch('/api/v1/executions/trigger', {
      method: 'POST',
      body: JSON.stringify({ agentId, taskId }),
    }),

  executions: (agentId: string) =>
    apiFetch(`/api/v1/agents/${agentId}/executions`),

  budget: (agentId: string) =>
    apiFetch(`/api/v1/agents/${agentId}/budget`),
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export const projects = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return apiFetch(`/api/v1/projects${qs}`)
  },

  get: (id: string) =>
    apiFetch(`/api/v1/projects/${id}`),

  create: (data: Record<string, unknown>) =>
    apiFetch('/api/v1/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Record<string, unknown>) =>
    apiFetch(`/api/v1/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export const tasks = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return apiFetch(`/api/v1/tasks${qs}`)
  },

  get: (id: string) =>
    apiFetch(`/api/v1/tasks/${id}`),

  create: (data: Record<string, unknown>) =>
    apiFetch('/api/v1/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Record<string, unknown>) =>
    apiFetch(`/api/v1/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  comment: (id: string, content: string) =>
    apiFetch(`/api/v1/tasks/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  checkout: (id: string, agentId: string) =>
    apiFetch(`/api/v1/tasks/${id}/checkout`, {
      method: 'POST',
      body: JSON.stringify({ agentId }),
    }),

  checkin: (id: string, agentId: string, output?: string) =>
    apiFetch(`/api/v1/tasks/${id}/checkin`, {
      method: 'POST',
      body: JSON.stringify({ agentId, output }),
    }),

  // POST /api/v1/tasks/:id/relations inserts two rows (the relation and
  // its mirror) so blocking/blocked_by stay consistent. relationType
  // values must match the server's task_relation_type enum.
  addRelation: (
    id: string,
    relatedTaskId: string,
    relationType: 'blocking' | 'blocked_by' | 'related',
  ) =>
    apiFetch(`/api/v1/tasks/${id}/relations`, {
      method: 'POST',
      body: JSON.stringify({ relatedTaskId, relationType }),
    }),
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export const dashboard = {
  summary: () =>
    apiFetch('/api/v1/dashboard/summary'),

  activity: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return apiFetch(`/api/v1/dashboard/activity${qs}`)
  },

  agentStatus: () =>
    apiFetch('/api/v1/dashboard/agent-status'),
}

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------

export const approvals = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return apiFetch(`/api/v1/approvals${qs}`)
  },

  pending: () =>
    apiFetch('/api/v1/approvals/pending'),

  decide: (id: string, decision: 'approved' | 'rejected' | 'changes_requested', comment?: string) =>
    apiFetch(`/api/v1/approvals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ decision, comment }),
    }),
}

// ---------------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------------

export const finance = {
  revenueSummary: () =>
    apiFetch('/api/v1/finance/revenue'),

  payrollSummary: () =>
    apiFetch('/api/v1/finance/payroll'),

  summary: () =>
    apiFetch('/api/v1/finance/summary'),

  agentCosts: () =>
    apiFetch('/api/v1/finance/agent-costs'),

  addRevenue: (data: Record<string, unknown>) =>
    apiFetch('/api/v1/finance/revenue', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export const clients = {
  pipeline: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return apiFetch(`/api/v1/clients/pipeline${qs}`)
  },

  active: () =>
    apiFetch('/api/v1/clients/active'),

  overdue: () =>
    apiFetch('/api/v1/clients/overdue'),
}

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

export const queue = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return apiFetch(`/api/v1/queue${qs}`)
  },

  create: (agentId: string, taskId: string) =>
    apiFetch('/api/v1/queue/create', {
      method: 'POST',
      body: JSON.stringify({ agentId, taskId }),
    }),

  getPrompt: (taskId: string) =>
    apiFetch(`/api/v1/queue/${taskId}/prompt`),

  postResults: (data: { taskId: string; sessionId?: string; status: string; output: string; notes?: string }) =>
    apiFetch('/api/v1/queue/results', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export const sessions = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return apiFetch(`/api/v1/sessions${qs}`)
  },

  create: (data: Record<string, unknown>) =>
    apiFetch('/api/v1/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Record<string, unknown>) =>
    apiFetch(`/api/v1/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export const settings = {
  company: () =>
    apiFetch('/api/v1/settings/company'),

  updateCompany: (data: Record<string, unknown>) =>
    apiFetch('/api/v1/settings/company', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  users: () =>
    apiFetch('/api/v1/users'),

  knowledge: () =>
    apiFetch('/api/v1/settings/knowledge'),
}
