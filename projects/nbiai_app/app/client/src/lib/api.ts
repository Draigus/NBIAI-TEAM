// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

export function getToken(): string | null {
  return localStorage.getItem('accessToken')
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem('accessToken', accessToken)
  localStorage.setItem('refreshToken', refreshToken)
}

export function clearTokens(): void {
  localStorage.removeItem('accessToken')
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
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return null
    const json = await res.json()
    const { accessToken, refreshToken: newRefreshToken } = json.data
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
    apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    apiFetch('/api/auth/logout', { method: 'POST' }),

  refresh: () =>
    apiFetch('/api/auth/refresh', { method: 'POST' }),

  me: () =>
    apiFetch('/api/auth/me'),

  setup: (data: Record<string, unknown>) =>
    apiFetch('/api/auth/setup', {
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
    return apiFetch(`/api/agents${qs}`)
  },

  get: (id: string) =>
    apiFetch(`/api/agents/${id}`),

  create: (data: Record<string, unknown>) =>
    apiFetch('/api/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Record<string, unknown>) =>
    apiFetch(`/api/agents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch(`/api/agents/${id}`, { method: 'DELETE' }),

  trigger: (agentId: string, taskId?: string) =>
    apiFetch(`/api/agents/${agentId}/trigger`, {
      method: 'POST',
      body: JSON.stringify({ taskId }),
    }),

  executions: (agentId: string) =>
    apiFetch(`/api/agents/${agentId}/executions`),

  budget: (agentId: string) =>
    apiFetch(`/api/agents/${agentId}/budget`),
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export const projects = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return apiFetch(`/api/projects${qs}`)
  },

  get: (id: string) =>
    apiFetch(`/api/projects/${id}`),

  create: (data: Record<string, unknown>) =>
    apiFetch('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Record<string, unknown>) =>
    apiFetch(`/api/projects/${id}`, {
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
    return apiFetch(`/api/tasks${qs}`)
  },

  get: (id: string) =>
    apiFetch(`/api/tasks/${id}`),

  create: (data: Record<string, unknown>) =>
    apiFetch('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Record<string, unknown>) =>
    apiFetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  comment: (id: string, content: string) =>
    apiFetch(`/api/tasks/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  checkout: (id: string, agentId: string) =>
    apiFetch(`/api/tasks/${id}/checkout`, {
      method: 'POST',
      body: JSON.stringify({ agentId }),
    }),

  checkin: (id: string, agentId: string, output?: string) =>
    apiFetch(`/api/tasks/${id}/checkin`, {
      method: 'POST',
      body: JSON.stringify({ agentId, output }),
    }),
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export const dashboard = {
  summary: () =>
    apiFetch('/api/dashboard/summary'),

  activity: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return apiFetch(`/api/dashboard/activity${qs}`)
  },

  agentStatus: () =>
    apiFetch('/api/dashboard/agent-status'),
}

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------

export const approvals = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return apiFetch(`/api/approvals${qs}`)
  },

  pending: () =>
    apiFetch('/api/approvals/pending'),

  decide: (id: string, decision: 'approve' | 'reject', comment?: string) =>
    apiFetch(`/api/approvals/${id}/decide`, {
      method: 'POST',
      body: JSON.stringify({ decision, comment }),
    }),
}

// ---------------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------------

export const finance = {
  revenueSummary: () =>
    apiFetch('/api/finance/revenue'),

  payrollSummary: () =>
    apiFetch('/api/finance/payroll'),

  summary: () =>
    apiFetch('/api/finance/summary'),

  agentCosts: () =>
    apiFetch('/api/finance/agent-costs'),

  addRevenue: (data: Record<string, unknown>) =>
    apiFetch('/api/finance/revenue', {
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
    return apiFetch(`/api/clients/pipeline${qs}`)
  },

  active: () =>
    apiFetch('/api/clients/active'),

  overdue: () =>
    apiFetch('/api/clients/overdue'),
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export const settings = {
  company: () =>
    apiFetch('/api/settings/company'),

  updateCompany: (data: Record<string, unknown>) =>
    apiFetch('/api/settings/company', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  users: () =>
    apiFetch('/api/settings/users'),

  apiKeys: () =>
    apiFetch('/api/settings/api-keys'),

  budgets: () =>
    apiFetch('/api/settings/budgets'),

  knowledge: () =>
    apiFetch('/api/settings/knowledge'),
}
