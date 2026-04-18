/**
 * WebSocket server — bridges PostgreSQL NOTIFY to connected browser clients.
 *
 * Route:   GET /ws
 * Auth:    JWT passed as the first message after connection (within 5 seconds).
 *          Token claims: { sub: userId, companyId, role }
 *
 * Protocol (client → server):
 *   { type: 'auth',      token: string }
 *   { type: 'subscribe', channels: NotifyChannel[] }
 *   { type: 'ping' }
 *
 * Protocol (server → client):
 *   { type: 'authenticated', userId, companyId }
 *   { type: 'event',  channel, data, timestamp }
 *   { type: 'ping' }
 *   { type: 'pong' }
 *
 * Heartbeat: server sends ping every 30 s; clients that have not responded
 * within 10 s are considered dead and removed.
 */

import { randomUUID } from 'crypto'
import type { FastifyInstance } from 'fastify'
import type { WebSocket } from '@fastify/websocket'
import type { JwtPayload } from '../types/index.js'
import { startListener, stopListener } from './notify.js'
import type { NotifyChannel, NotifyPayload } from './notify.js'

// ---------------------------------------------------------------------------
// Connected client tracking
// ---------------------------------------------------------------------------

interface WsClient {
  id: string
  socket: WebSocket
  companyId: string
  userId: string
  subscriptions: NotifyChannel[]
  /** Whether a server-sent ping is awaiting a pong from this client. */
  awaitingPong: boolean
}

const clients = new Map<string, WsClient>()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeSend(client: WsClient, message: unknown): void {
  try {
    if (client.socket.readyState === client.socket.OPEN) {
      client.socket.send(JSON.stringify(message))
    }
  } catch (err) {
    console.warn(`[ws] Failed to send to client ${client.id}:`, err)
  }
}

function broadcast(channel: NotifyChannel, data: unknown, companyId?: string): void {
  const timestamp = new Date().toISOString()

  for (const client of clients.values()) {
    // Scope to company if the payload carries a companyId field
    if (companyId && client.companyId !== companyId) {
      continue
    }

    // If the client has an explicit subscription list, respect it.
    // An empty subscriptions array means "subscribe to all channels".
    if (client.subscriptions.length > 0 && !client.subscriptions.includes(channel)) {
      continue
    }

    safeSend(client, { type: 'event', channel, data, timestamp })
  }
}

// ---------------------------------------------------------------------------
// Heartbeat
// ---------------------------------------------------------------------------

const HEARTBEAT_INTERVAL_MS = 30_000
const PONG_TIMEOUT_MS = 10_000

function startHeartbeat(): NodeJS.Timeout {
  return setInterval(() => {
    for (const client of clients.values()) {
      if (client.awaitingPong) {
        // Client did not respond to the previous ping — consider it dead
        console.info(`[ws] Removing unresponsive client ${client.id}`)
        client.socket.terminate()
        clients.delete(client.id)
        continue
      }

      client.awaitingPong = true
      safeSend(client, { type: 'ping' })

      // Give the client PONG_TIMEOUT_MS to reply before we check on the next cycle.
      // We use a short per-client timeout so that slow clients are caught before the
      // next full heartbeat round fires.
      setTimeout(() => {
        const stillConnected = clients.get(client.id)
        if (stillConnected?.awaitingPong) {
          console.info(`[ws] Pong timeout — removing client ${client.id}`)
          client.socket.terminate()
          clients.delete(client.id)
        }
      }, PONG_TIMEOUT_MS)
    }
  }, HEARTBEAT_INTERVAL_MS)
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

/**
 * Register the /ws WebSocket route on the Fastify instance.
 *
 * Call this after all plugins (including @fastify/jwt and @fastify/websocket)
 * have been registered but before fastify.listen().
 */
export function setupWebSocket(fastify: FastifyInstance): void {
  let pgListenerClient: import('pg').Client | null = null
  let heartbeatTimer: NodeJS.Timeout | null = null

  // Start the PostgreSQL LISTEN connection and the server heartbeat when the
  // Fastify server is ready (all plugins registered).
  fastify.addHook('onReady', async () => {
    pgListenerClient = await startListener((payload: NotifyPayload) => {
      const companyId =
        payload.data !== null &&
        typeof payload.data === 'object' &&
        'companyId' in (payload.data as Record<string, unknown>)
          ? String((payload.data as Record<string, unknown>).companyId)
          : undefined

      broadcast(payload.channel, payload.data, companyId)
    })

    heartbeatTimer = startHeartbeat()

    console.info('[ws] WebSocket server and PostgreSQL listener ready.')
  })

  // Clean up on server close
  fastify.addHook('onClose', async () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
    }

    for (const client of clients.values()) {
      client.socket.terminate()
    }
    clients.clear()

    if (pgListenerClient) {
      await stopListener(pgListenerClient)
    }
  })

  // ---------------------------------------------------------------------------
  // WebSocket route
  // ---------------------------------------------------------------------------

  fastify.get('/ws', { websocket: true }, (socket: WebSocket) => {
    const clientId = randomUUID()

    // Each client starts unauthenticated. The first message must be an auth
    // message; if it doesn't arrive within 5 seconds we close the connection.
    let authenticated = false

    const authTimeout = setTimeout(() => {
      if (!authenticated) {
        console.warn(`[ws] Client ${clientId} did not authenticate within 5s — closing.`)
        socket.close(4001, 'Authentication timeout')
      }
    }, 5000)

    socket.on('message', (rawMessage: Buffer | string) => {
      let message: Record<string, unknown>

      try {
        message = JSON.parse(rawMessage.toString()) as Record<string, unknown>
      } catch {
        console.warn(`[ws] Client ${clientId} sent non-JSON message — ignoring.`)
        return
      }

      // ------------------------------------------------------------------
      // Auth handshake (must be the first message)
      // ------------------------------------------------------------------
      if (!authenticated) {
        if (message.type !== 'auth' || typeof message.token !== 'string') {
          socket.close(4001, 'First message must be { type: "auth", token: string }')
          clearTimeout(authTimeout)
          return
        }

        let decoded: JwtPayload

        try {
          decoded = fastify.jwt.verify<JwtPayload>(message.token)
        } catch {
          console.warn(`[ws] Client ${clientId} provided an invalid JWT.`)
          socket.close(4001, 'Invalid token')
          clearTimeout(authTimeout)
          return
        }

        clearTimeout(authTimeout)
        authenticated = true

        const wsClient: WsClient = {
          id: clientId,
          socket,
          companyId: decoded.companyId,
          userId: decoded.sub,
          subscriptions: [],
          awaitingPong: false,
        }

        clients.set(clientId, wsClient)

        safeSend(wsClient, {
          type: 'authenticated',
          userId: decoded.sub,
          companyId: decoded.companyId,
        })

        console.info(`[ws] Client ${clientId} authenticated (user=${decoded.sub}, company=${decoded.companyId})`)
        return
      }

      // ------------------------------------------------------------------
      // Post-auth messages
      // ------------------------------------------------------------------
      const client = clients.get(clientId)

      if (!client) {
        // Should not happen — defensive guard
        return
      }

      switch (message.type) {
        case 'subscribe': {
          const channels = message.channels

          if (!Array.isArray(channels)) {
            console.warn(`[ws] Client ${clientId} sent malformed subscribe message.`)
            return
          }

          // Accept only valid channel names; silently drop unknowns
          const validChannels: NotifyChannel[] = [
            'agent_activity',
            'task_update',
            'approval_update',
            'heartbeat_update',
            'execution_complete',
            'budget_alert',
            'activity_log',
          ]

          client.subscriptions = (channels as unknown[])
            .filter((c): c is NotifyChannel => validChannels.includes(c as NotifyChannel))

          console.info(`[ws] Client ${clientId} subscribed to: ${client.subscriptions.join(', ') || '(all)'}`)
          break
        }

        case 'pong': {
          // Clear the awaiting flag set by the server heartbeat
          client.awaitingPong = false
          break
        }

        case 'ping': {
          safeSend(client, { type: 'pong' })
          break
        }

        default: {
          console.warn(`[ws] Client ${clientId} sent unknown message type: "${String(message.type)}"`)
        }
      }
    })

    socket.on('close', () => {
      clearTimeout(authTimeout)
      clients.delete(clientId)
      console.info(`[ws] Client ${clientId} disconnected. Active clients: ${clients.size}`)
    })

    socket.on('error', (err: Error) => {
      console.warn(`[ws] Socket error for client ${clientId}:`, err.message)
      clients.delete(clientId)
    })
  })
}
