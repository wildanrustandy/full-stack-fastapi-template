import { createFileRoute, Navigate } from "@tanstack/react-router"
import { useKioskDevice } from "@/hooks/useKioskDevice"
import { Monitor, Wifi, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

export const Route = createFileRoute("/_kiosk/waiting-assignment")({
  component: WaitingAssignment,
})

function WaitingAssignment() {
  const { deviceId, pin, isAssigned, isLoading } = useKioskDevice()
  const [dots, setDots] = useState(".")
  const [connectionStatus] = useState<"connected" | "disconnected">("connected")

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "." : prev + ".")
    }, 500)
    return () => clearInterval(interval)
  }, [])

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

        {/* PIN Display */}
        {pin && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
            <p className="text-sm text-muted-foreground uppercase tracking-wider">
              Enter this PIN in Admin Panel
            </p>
            <div className="text-5xl font-mono font-bold tracking-widest bg-black/50 px-8 py-4 rounded-lg">
              {pin}
            </div>
            <p className="text-sm text-muted-foreground">
              Go to Admin → Booths → Assign Device and enter this 6-digit code
            </p>
          </div>
        )}

        {/* Device ID (small, for reference) */}
        <div className="text-xs text-muted-foreground">
          Device: <code className="bg-white/5 px-2 py-1 rounded">{deviceId}</code>
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
            <li>Go to Admin Panel → Photobooth → Booths</li>
            <li>Select a booth and click "Assign Device"</li>
            <li>Enter the 6-digit PIN shown above</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
