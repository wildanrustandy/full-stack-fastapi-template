import { useEffect, useRef, useCallback, useState } from "react"

interface UseWebSocketOptions {
  onMessage?: (data: any) => void
  onOpen?: () => void
  onClose?: () => void
  onError?: (error: Event) => void
  reconnectInterval?: number
  reconnectAttempts?: number
}

const useWebSocket = (url: string | null, options: UseWebSocketOptions = {}) => {
  const {
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnectInterval = 5000,
    reconnectAttempts = 10,
  } = options
  const reconnectCountRef = useRef(0)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [lastMessage, setLastMessage] = useState<any>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const lastMessageRef = useRef<any>(null)

  const connect = useCallback(() => {
    if (!url || wsRef.current?.readyState === WebSocket.OPEN) return

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        reconnectCountRef.current = 0
        onOpen?.()
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        lastMessageRef.current = data
        setLastMessage(data)
        onMessage?.(data)
      }

      ws.onerror = (error) => {
        onError?.(error)
      }

      ws.onclose = () => {
        setIsConnected(false)
        onClose?.()

        if (reconnectCountRef.current < reconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectCountRef.current += 1
            connect()
          }, reconnectInterval)
        }
      }
    } catch (error) {
      console.error("WebSocket connection error:", error)
    }
  }, [url, onMessage, onOpen, onClose, onError, reconnectInterval, reconnectAttempts])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    wsRef.current?.close()
    wsRef.current = null
  }, [])

  const sendMessage = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === "string" ? data : JSON.stringify(data))
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    isConnected,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
  }
}

export default useWebSocket
