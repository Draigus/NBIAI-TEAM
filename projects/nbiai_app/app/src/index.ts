/**
 * NBIAI Team App — Fastify server entry point.
 *
 * Registers all plugins and route handlers, then starts listening.
 *
 * Plugin registration order matters in Fastify:
 * 1. CORS (must be first so preflight requests are handled before auth)
 * 2. Rate limiting
 * 3. JWT
 * 4. WebSocket
 * 5. Static files (serves the built React client in production)
 * 6. API routes
 *
 * All API routes are prefixed with /api/v1.
 * The health check at /health is outside the API prefix for load balancer use.
 */

import 'dotenv/config'
import Fastify from 'fastify'
import fastifyCors from '@fastify/cors'
import fastifyRateLimit from '@fastify/rate-limit'
import fastifyJwt from '@fastify/jwt'
import fastifyWebsocket from '@fastify/websocket'
import fastifyStatic from '@fastify/static'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

import { authRoutes } from './routes/auth.js'
import { agentRoutes } from './routes/agents.js'
import { projectRoutes } from './routes/projects.js'
import { taskRoutes } from './routes/tasks.js'
import { approvalRoutes } from './routes/approvals.js'
import { financeRoutes } from './routes/finance.js'
import { clientRoutes } from './routes/clients.js'
import { settingsRoutes } from './routes/settings.js'
import { dashboardRoutes } from './routes/dashboard.js'
import { executionRoutes } from './routes/executions.js'
import { userRoutes } from './routes/users.js'
import { queueRoutes } from './routes/queue.js'
import { sessionRoutes } from './routes/sessions.js'
import { setupWebSocket } from './realtime/websocket.js'
import { startHeartbeat, stopHeartbeat } from './execution/heartbeat.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const PORT = parseInt(process.env.PORT ?? '3000', 10)
const NODE_ENV = process.env.NODE_ENV ?? 'development'
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'
const JWT_SECRET = process.env.JWT_SECRET
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET


if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  console.error(
    '[startup] JWT_SECRET and JWT_REFRESH_SECRET must be set in environment variables.',
  )
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Create Fastify instance
// ---------------------------------------------------------------------------

const fastify = Fastify({
  logger: {
    level: NODE_ENV === 'production' ? 'info' : 'debug',
    ...(NODE_ENV !== 'production' && {
      transport: {
        target: 'pino-pretty',
        options: { colorize: true },
      },
    }),
  },
})

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

await fastify.register(fastifyCors, {
  origin: FRONTEND_URL,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
})

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

// Global rate limit: 100 requests per minute per IP
await fastify.register(fastifyRateLimit, {
  max: 100,
  timeWindow: '1 minute',
  errorResponseBuilder: (_req, context) => ({
    error: {
      code: 'RATE_LIMITED',
      message: `Rate limit exceeded. Try again in ${Math.ceil((context as { ttl: number }).ttl / 1000)} seconds.`,
    },
  }),
})

// ---------------------------------------------------------------------------
// JWT
// ---------------------------------------------------------------------------

await fastify.register(fastifyJwt, {
  secret: JWT_SECRET,
  sign: {
    expiresIn: '15m',
  },
})

// ---------------------------------------------------------------------------
// WebSocket
// ---------------------------------------------------------------------------

await fastify.register(fastifyWebsocket)

// ---------------------------------------------------------------------------
// Static files (serves the built React client in production)
// ---------------------------------------------------------------------------

const clientDistPath = join(__dirname, '..', '..', 'client', 'dist')

if (NODE_ENV === 'production') {
  await fastify.register(fastifyStatic, {
    root: clientDistPath,
    prefix: '/',
    // Do not serve static files for /api routes -- let the API handlers deal with those
    decorateReply: false,
  })
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

fastify.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
}))

// ---------------------------------------------------------------------------
// API routes (all prefixed /api/v1)
// ---------------------------------------------------------------------------

// Auth routes have a tighter rate limit: 10 per minute
await fastify.register(
  async (instance) => {
    await instance.register(fastifyRateLimit, {
      max: 10,
      timeWindow: '1 minute',
      errorResponseBuilder: (_req, context) => ({
        error: {
          code: 'RATE_LIMITED',
          message: `Too many authentication attempts. Try again in ${Math.ceil((context as { ttl: number }).ttl / 1000)} seconds.`,
        },
      }),
    })
    await instance.register(authRoutes)
  },
  { prefix: '/api/v1/auth' },
)

await fastify.register(agentRoutes, { prefix: '/api/v1' })
await fastify.register(projectRoutes, { prefix: '/api/v1' })
await fastify.register(taskRoutes, { prefix: '/api/v1' })
await fastify.register(approvalRoutes, { prefix: '/api/v1' })
await fastify.register(financeRoutes, { prefix: '/api/v1' })
await fastify.register(clientRoutes, { prefix: '/api/v1' })
await fastify.register(settingsRoutes, { prefix: '/api/v1' })
await fastify.register(dashboardRoutes, { prefix: '/api/v1' })
await fastify.register(executionRoutes, { prefix: '/api/v1' })
await fastify.register(userRoutes, { prefix: '/api/v1' })
await fastify.register(queueRoutes, { prefix: '/api/v1' })
await fastify.register(sessionRoutes, { prefix: '/api/v1' })

// ---------------------------------------------------------------------------
// Real-time WebSocket endpoint (/ws)
// ---------------------------------------------------------------------------

setupWebSocket(fastify)

// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------

fastify.setNotFoundHandler((_request, reply) => {
  reply.status(404).send({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource does not exist.',
    },
  })
})

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

fastify.setErrorHandler((error, _request, reply) => {
  fastify.log.error(error)

  // Fastify validation errors (from JSON Schema validation on route schemas)
  if (error.validation) {
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
        details: error.validation,
      },
    })
  }

  // JWT errors
  if (error.statusCode === 401) {
    return reply.status(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: error.message,
      },
    })
  }

  // Rate limit errors (already formatted by the rate limit plugin)
  if (error.statusCode === 429) {
    return reply.status(429).send({
      error: {
        code: 'RATE_LIMITED',
        message: error.message,
      },
    })
  }

  // All other errors
  const statusCode = error.statusCode ?? 500
  return reply.status(statusCode).send({
    error: {
      code: statusCode === 500 ? 'INTERNAL_ERROR' : 'ERROR',
      message:
        NODE_ENV === 'production'
          ? 'An unexpected error occurred.'
          : error.message,
    },
  })
})

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' })
  fastify.log.info(`[server] NBIAI Team App listening on port ${PORT}`)

  // Start the agent heartbeat scheduler after the server is listening.
  // Skipped in test environments to prevent open handles from keeping the
  // test runner alive.
  if (NODE_ENV !== 'test') {
    const heartbeatTimer = startHeartbeat()

    // Graceful shutdown: stop the heartbeat scheduler and close the server
    const shutdown = async (signal: string) => {
      fastify.log.info(`[server] Received ${signal} — shutting down gracefully`)
      stopHeartbeat(heartbeatTimer)
      await fastify.close()
      process.exit(0)
    }

    process.once('SIGTERM', () => void shutdown('SIGTERM'))
    process.once('SIGINT', () => void shutdown('SIGINT'))
  }
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
