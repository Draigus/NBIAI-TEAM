const BASE_RECONNECT_DELAY = 1_000
const MAX_RECONNECT_DELAY = 30_000

export interface WsClient {
  close: () => void
  subscribe: (channels: string[]) => void
}

export function createWsClient(
  onEvent: (channel: string, data: unknown) => void,
): WsClient {
  let ws: WebSocket | null = null
  let reconnectDelay = BASE_RECONNECT_DELAY
  let shouldReconnect = true
  let pingInterval: ReturnType<typeof setInterval> | null = null

  function clearPing() {
    if (pingInterval !== null) {
      clearInterval(pingInterval)
      pingInterval = null
    }
  }

  function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/ws`
    ws = new WebSocket(url)

    ws.addEventListener('open', () => {
      reconnectDelay = BASE_RECONNECT_DELAY

      // Auth handshake
      const token = localStorage.getItem('accessToken')
      if (token) {
        ws!.send(JSON.stringify({ type: 'auth', token }))
      }

      // Subscribe to all channels
      ws!.send(JSON.stringify({ type: 'subscribe', channels: ['*'] }))

      // Keepalive ping every 25s
      pingInterval = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, 25_000)
    })

    ws.addEventListener('message', (event: MessageEvent) => {
      let payload: { type: string; channel?: string; data?: unknown }
      try {
        payload = JSON.parse(event.data as string)
      } catch {
        return
      }

      if (payload.type === 'pong') return
      if (payload.type === 'event' && payload.channel) {
        onEvent(payload.channel, payload.data)
      }
    })

    ws.addEventListener('close', () => {
      clearPing()
      if (!shouldReconnect) return

      setTimeout(() => {
        reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY)
        connect()
      }, reconnectDelay)
    })

    ws.addEventListener('error', () => {
      ws?.close()
    })
  }

  connect()

  return {
    close() {
      shouldReconnect = false
      clearPing()
      ws?.close()
    },
    subscribe(channels: string[]) {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'subscribe', channels }))
      }
    },
  }
}
