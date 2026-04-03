import { createFileRoute, Navigate, Outlet, useLocation } from "@tanstack/react-router"
import useKioskMode from "@/hooks/useKioskMode"
import { useKioskDevice } from "@/hooks/useKioskDevice"
import { Loader2 } from "lucide-react"

export const Route = createFileRoute("/_kiosk")({
  component: KioskLayout,
})

function KioskLayout() {
  useKioskMode({ idleTimeout: 120_000, preventBackButton: true })
  const { isAssigned, isLoading } = useKioskDevice()
  const location = useLocation()

  // Show loading state
  if (isLoading) {
    return (
      <div className="kiosk h-dvh w-dvw overflow-hidden bg-black flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    )
  }

  // Redirect to waiting-assignment if not assigned
  // But allow access to waiting-assignment page itself
  const isWaitingPage = location.pathname.includes("waiting-assignment")
  if (!isAssigned && !isWaitingPage) {
    return <Navigate to="/waiting-assignment" />
  }

  // If assigned and trying to access waiting-assignment, redirect to landing
  if (isAssigned && isWaitingPage) {
    return <Navigate to="/landing" />
  }

  return (
    <div className="kiosk h-dvh w-dvw overflow-hidden">
      <Outlet />
    </div>
  )
}
