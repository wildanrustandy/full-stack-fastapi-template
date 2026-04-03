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
  const reconnectCountRef = useRef(0)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const lastMessageRef = useRef<any>(null)

  const connect = useCallback(() => {
export default useWebSocket
