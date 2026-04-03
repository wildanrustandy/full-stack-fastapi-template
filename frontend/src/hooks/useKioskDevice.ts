import { useEffect, useState } from "react"
import { DevicesService } from "@/services/devices"

const STORAGE_KEY = "kiosk_device_id"

export function useKioskDevice() {
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [isAssigned, setIsAssigned] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [booth, setBooth] = useState<any>(null)
  const [isRegistered, setIsRegistered] = useState(false)

  // Initialize and register device
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

      // Register device with backend
      try {
        await DevicesService.registerDevice(existingId, "Kiosk")
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
      } catch (error) {
        console.error("Failed to check assignment:", error)
        setIsAssigned(false)
      } finally {
        setIsLoading(false)
      }
    }

    init()
  }, [])

  // Poll for assignment status
  useEffect(() => {
    if (!deviceId || isAssigned) return

    const interval = setInterval(async () => {
      try {
        const result = await DevicesService.checkAssignment(deviceId)
        if (result.is_assigned && result.booth_id) {
          setIsAssigned(true)
          setBooth({
            id: result.booth_id,
            name: result.booth_name,
          })
        }
      } catch (error) {
        console.error("Failed to check assignment:", error)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [deviceId, isAssigned])

  return {
    deviceId,
    isAssigned,
    isLoading,
    isRegistered,
    booth,
  }
}
