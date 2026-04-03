import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000"

export function useAdminWebSocket() {
  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    // Only connect if user is authenticated (has token)
    const token = localStorage.getItem("access_token")
    if (!token) {
      console.log("Admin WebSocket: No token found, skipping connection")
      return
    }

    const wsUrl = API_BASE.replace("http://", "ws://").replace(
      "https://",
      "wss://",
    )
    console.log("Admin WebSocket: Connecting to", `${wsUrl}/api/v1/ws/admin`)
    const ws = new WebSocket(`${wsUrl}/api/v1/ws/admin`)
    wsRef.current = ws

    ws.onopen = () => {
      console.log("Admin WebSocket connected")
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log("Admin WebSocket message:", data)

        if (data.type === "booth_update") {
          // Invalidate booths query to refetch data
          console.log("Booth updated, invalidating query...")
          queryClient.invalidateQueries({ queryKey: ["booths"] })
        } else if (data.type === "transaction_update") {
          // Invalidate transaction-related queries
          queryClient.invalidateQueries({ queryKey: ["photobooth"] })
        }
      } catch (error) {
        console.error("Failed to parse admin WebSocket message:", error)
      }
    }

    ws.onerror = (error) => {
      console.error("Admin WebSocket error:", error)
    }

    ws.onclose = () => {
      console.log("Admin WebSocket disconnected")
    }

    // Heartbeat to keep connection alive
    const heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }))
      }
    }, 30000)

    return () => {
      clearInterval(heartbeatInterval)
      ws.close()
    }
  }, [queryClient])

  return wsRef.current
}
