import { createFileRoute, Navigate } from "@tanstack/react-router"
import { useKioskDevice } from "@/hooks/useKioskDevice"
import { Monitor, Wifi, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

export const Route = createFileRoute("/_kiosk/waiting-assignment")({
  component: WaitingAssignment,
})

function WaitingAssignment() {
  const { deviceId, isAssigned, isLoading, checkAssignment } = useKioskDevice()
  const [dots, setDots] = useState(".")
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected">("connected")

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "." : prev + ".")
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // Check connection status periodically
  useEffect(() => {
    const checkConnection = async () => {
      try {
        await checkAssignment()
        setConnectionStatus("connected")
      } catch {
        setConnectionStatus("disconnected")
      }
    }

    const interval = setInterval(checkConnection, 5000)
    return () => clearInterval(interval)
  }, [checkAssignment])

  // Redirect if assigned
  if (isAssigned) {
    return <Navigate to="/landing" />
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
      {/* Status indicator */}
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${connectionStatus === "connected" ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
        <Wifi className={`h-4 w-4 ${connectionStatus === "connected" ? "text-green-500" : "text-red-500"}`} />
        <span className="text-sm text-muted-foreground">
          {connectionStatus === "connected" ? "Connected" : "Offline"}
        </span>
      </div>

      {/* Main content */}
      <div className="text-center space-y-8 max-w-lg">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center">
            <Monitor className="h-12 w-12 text-white" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Waiting for Assignment</h1>
          <p className="text-lg text-muted-foreground">
            This kiosk needs to be assigned to a booth
          </p>
        </div>

        {/* Device ID Display */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <p className="text-sm text-muted-foreground uppercase tracking-wider">
            Device ID
          </p>
          <code className="text-2xl font-mono bg-black/50 px-4 py-2 rounded-lg block">
            {deviceId}
          </code>
          <p className="text-sm text-muted-foreground">
            Show this ID to an administrator to assign this device to a booth
          </p>
        </div>

        {/* Loading indicator */}
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Checking assignment status{dots}</span>
        </div>

        {/* Instructions */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p>To complete setup:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Go to Admin Panel → Booths</li>
            <li>Select a booth or create a new one</li>
            <li>Click "Assign Device" and enter the Device ID above</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
