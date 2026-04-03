import {
  createFileRoute,
  Navigate,
  Outlet,
  useLocation,
} from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import BoothInactiveOverlay from "@/components/Kiosk/BoothInactiveOverlay"
import { useKioskDevice } from "@/hooks/useKioskDevice"
import useKioskMode from "@/hooks/useKioskMode"

export const Route = createFileRoute("/_kiosk")({
  component: KioskLayout,
})

function KioskLayout() {
  useKioskMode({ idleTimeout: 120_000, preventBackButton: true })
  const {
    isAssigned,
    isLoading,
    wsUnassigned,
    unassignedReason,
    isInactiveBooth,
  } = useKioskDevice()
  const location = useLocation()

  // Show loading state
  if (isLoading) {
    return (
      <div className="kiosk h-dvh w-dvw overflow-hidden bg-black flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    )
  }

  const isWaitingPage = location.pathname.includes("waiting-assignment")

  // If WebSocket explicitly unassigned us (booth deactivated) OR if assigned to inactive booth
  const isInactive =
    (wsUnassigned && unassignedReason?.includes("deactivated")) ||
    isInactiveBooth

  // Redirect to waiting-assignment if not assigned and not inactive
  if (!isAssigned && !isWaitingPage && !isInactive) {
    return <Navigate to="/waiting-assignment" replace />
  }

  // If assigned and trying to access waiting-assignment, redirect to landing
  if (isAssigned && isWaitingPage) {
    return <Navigate to="/landing" replace />
  }

  return (
    <div className="kiosk h-dvh w-dvw overflow-hidden relative">
      <Outlet />
      {/* Show inactive overlay when booth is deactivated */}
      {isInactive && <BoothInactiveOverlay />}
    </div>
  )
}
