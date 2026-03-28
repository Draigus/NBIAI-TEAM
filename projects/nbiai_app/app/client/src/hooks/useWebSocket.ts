import { useEffect, useRef } from 'react'
import { createWsClient, type WsClient } from '@/lib/websocket'
import { useAuth } from './useAuth'

/**
 * Creates and manages a WebSocket connection for the lifetime of the component.
 * Reconnects automatically when the authenticated user changes.
 *
 * @param onEvent - Callback fired whenever an event arrives on any channel.
 */
export function useWebSocket(
  onEvent: (channel: string, data: unknown) => void,
): void {
  const { user } = useAuth()
  const clientRef = useRef<WsClient | null>(null)
  const onEventRef = useRef(onEvent)

  // Keep the callback ref up to date without triggering reconnects
  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  useEffect(() => {
    // Only connect when there is an authenticated user
    if (!user) return

    const client = createWsClient((channel, data) => {
      onEventRef.current(channel, data)
    })
    clientRef.current = client

    return () => {
      client.close()
      clientRef.current = null
    }
  }, [user])
}
