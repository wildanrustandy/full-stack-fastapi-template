import { useEffect, useState } from "react"
import { DevicesService } from "@/services/devices"

const STORAGE_KEY = "kiosk_device_id"
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000"

// Singleton WebSocket instance
let globalWs: WebSocket | null = null
let globalDeviceId: string | null = null

export function useKioskDevice() {
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [pin, setPin] = useState<string | null>(null)
  const [isAssigned, setIsAssigned] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [booth, setBooth] = useState<any>(null)
  const [isRegistered, setIsRegistered] = useState(false)
  const [lastMessage, setLastMessage] = useState<any>(null)

  // Initialize device (runs once)
  useEffect(() => {
    const init = async () => {
      // Get or generate device ID
      let existingId = localStorage.getItem(STORAGE_KEY)
      if (!existingId) {
        const random = Array.from(crypto.getRandomValues(new Uint8Array(16)))
          .map(b => b.toString(36).padStart(2, '0'))
          .join('')
          .slice(0, 22)
        existingId = `dev_${random}`
        localStorage.setItem(STORAGE_KEY, existingId)
      }
      setDeviceId(existingId)
      globalDeviceId = existingId

      // Register device with backend
      try {
        const device = await DevicesService.registerDevice(existingId, "Kiosk")
        setPin(device.pin)
        setIsRegistered(true)
      } catch (error) {
        console.error("Failed to register device:", error)
      }

      // Check assignment
      try {
        const result = await DevicesService.checkAssignment(existingId)
        if (result.is_assigned && result.booth_id) {
          setIsAssigned(true)
          setBooth({
            id: result.booth_id,
            name: result.booth_name,
          })
        } else {
          setIsAssigned(false)
          setBooth(null)
        }
        if (result.pin) {
          setPin(result.pin)
        }
      } catch (error) {
        console.error("Failed to check assignment:", error)
        setIsAssigned(false)
      } finally {
        setIsLoading(false)
      }
    }

    init()
  }, [])

  // WebSocket connection (singleton pattern)
  useEffect(() => {
    if (!deviceId) return

    // Use existing connection if available for same device
    if (globalWs && globalWs.readyState === WebSocket.OPEN && globalDeviceId === deviceId) {
      console.log("Using existing WebSocket connection")
      return
    }

    // Close existing connection if different device
    if (globalWs) {
      globalWs.close()
      globalWs = null
    }

    const wsUrl = API_BASE.replace("http://", "ws://").replace("https://", "wss://")
    const ws = new WebSocket(`${wsUrl}/api/v1/ws/device/${deviceId}`)
    globalWs = ws
    globalDeviceId = deviceId

    ws.onopen = () => {
      console.log("WebSocket connected")
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log("WebSocket message:", data)
        setLastMessage(data)

        if (data.type === "assigned") {
          setIsAssigned(true)
          setBooth({
            id: data.booth_id,
            name: data.booth_name,
          })
        } else if (data.type === "unassigned") {
          setIsAssigned(false)
          setBooth(null)
        } else if (data.type === "kicked") {
          setIsAssigned(false)
          setBooth(null)
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error)
      }
    }

    ws.onerror = (error) => {
      console.error("WebSocket error:", error)
    }

    ws.onclose = () => {
      console.log("WebSocket disconnected")
      if (globalWs === ws) {
        globalWs = null
      }
    }

    // Heartbeat
    const heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }))
      }
    }, 30000)

    return () => {
      clearInterval(heartbeatInterval)
      // Don't close on unmount - keep connection alive
    }
  }, [deviceId])

  // Fallback polling (every 10 seconds)
  useEffect(() => {
    if (!deviceId) return

    const interval = setInterval(async () => {
      try {
        const result = await DevicesService.checkAssignment(deviceId)
        
        if (result.is_assigned && result.booth_id) {
          setIsAssigned(true)
          setBooth({
            id: result.booth_id,
            name: result.booth_name,
          })
        } else {
          setIsAssigned(false)
          setBooth(null)
        }
      } catch (error) {
        console.error("Failed to check assignment:", error)
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [deviceId])

  return {
    deviceId,
    pin,
    isAssigned,
    isLoading,
    isRegistered,
    booth,
    lastMessage,
  }
}
