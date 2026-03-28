/**
 * PostgreSQL LISTEN/NOTIFY integration.
 *
 * `startListener`    — opens a dedicated pg.Client (never pooled) and subscribes
 *                       to all seven notification channels. Reconnects automatically
 *                       on connection errors.
 * `stopListener`     — gracefully unlistens and ends the client connection.
 * `sendNotification` — emits a pg_notify call via the shared pool so that any
 *                       part of the application can publish an event.
 */

import pg from 'pg'
import { pool } from '../db/index.js'

// ---------------------------------------------------------------------------
// Channel types
// ---------------------------------------------------------------------------

export type NotifyChannel =
  | 'agent_activity'
  | 'task_update'
  | 'approval_update'
  | 'heartbeat_update'
  | 'execution_complete'
  | 'budget_alert'
  | 'activity_log'

const ALL_CHANNELS: NotifyChannel[] = [
  'agent_activity',
  'task_update',
  'approval_update',
  'heartbeat_update',
  'execution_complete',
  'budget_alert',
  'activity_log',
]

export interface NotifyPayload {
  channel: NotifyChannel
  data: unknown
}

export type NotifyHandler = (payload: NotifyPayload) => void

// ---------------------------------------------------------------------------
// Listener
// ---------------------------------------------------------------------------

/**
 * Start a dedicated PostgreSQL listener connection.
 *
 * Uses a fresh `pg.Client` — not the pool. LISTEN/NOTIFY requires a long-lived
 * dedicated connection; pooled connections are returned to the pool between
 * queries and therefore cannot hold a LISTEN state.
 *
 * On connection error the client is ended and a reconnect is attempted after
 * 5 seconds. The handler is preserved across reconnects.
 *
 * Returns the pg.Client so the caller can stop it later with `stopListener`.
 */
export async function startListener(handler: NotifyHandler): Promise<pg.Client> {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('[realtime] DATABASE_URL is not set — cannot start LISTEN client.')
  }

  const client = new pg.Client({ connectionString: databaseUrl })

  async function connect(target: pg.Client): Promise<void> {
    await target.connect()

    // Subscribe to every channel in one shot
    for (const channel of ALL_CHANNELS) {
      await target.query(`LISTEN ${channel}`)
    }

    console.info('[realtime] PostgreSQL LISTEN client connected and listening on all channels.')

    target.on('notification', (msg) => {
      const channel = msg.channel as NotifyChannel

      if (!ALL_CHANNELS.includes(channel)) {
        // Unexpected channel — ignore
        return
      }

      let data: unknown = null

      if (msg.payload) {
        try {
          data = JSON.parse(msg.payload)
        } catch {
          console.warn(`[realtime] Failed to parse notification payload on channel "${channel}":`, msg.payload)
          data = msg.payload
        }
      }

      handler({ channel, data })
    })

    target.on('error', (err) => {
      console.error('[realtime] LISTEN client error — will attempt reconnect in 5s:', err.message)

      // End the client before reconnecting to avoid dangling connections
      target.end().catch(() => {
        // Ignore errors during cleanup
      })

      setTimeout(() => {
        const replacement = new pg.Client({ connectionString: databaseUrl })
        connect(replacement).catch((reconnectErr) => {
          console.error('[realtime] Reconnect failed:', reconnectErr)
        })
      }, 5000)
    })
  }

  await connect(client)

  return client
}

/**
 * Gracefully stop a LISTEN client.
 *
 * Issues UNLISTEN * to deregister all subscriptions before ending the
 * connection. Safe to call if the client has already disconnected; errors
 * during UNLISTEN are swallowed.
 */
export async function stopListener(client: pg.Client): Promise<void> {
  try {
    await client.query('UNLISTEN *')
  } catch {
    // Client may already be disconnected — ignore
  }

  try {
    await client.end()
    console.info('[realtime] PostgreSQL LISTEN client stopped.')
  } catch (err) {
    console.warn('[realtime] Error ending LISTEN client:', err)
  }
}

// ---------------------------------------------------------------------------
// Sender
// ---------------------------------------------------------------------------

/**
 * Emit a PostgreSQL notification on the given channel.
 *
 * Uses the shared connection pool — this is a standard query that does not
 * require a dedicated connection. Any part of the application (routes, the
 * execution runner, scheduled jobs) should call this to publish an event.
 *
 * The data object is serialised to JSON and passed as the notification payload.
 * PostgreSQL notification payloads are limited to 8000 bytes; keep the data
 * object lean.
 */
export async function sendNotification(channel: NotifyChannel, data: unknown): Promise<void> {
  const payload = JSON.stringify(data)
  await pool.query('SELECT pg_notify($1, $2)', [channel, payload])
}
