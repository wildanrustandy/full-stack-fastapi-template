import { createFileRoute, Outlet } from "@tanstack/react-router"
import useKioskMode from "@/hooks/useKioskMode"

export const Route = createFileRoute("/_kiosk")({
  component: KioskLayout,
})

function KioskLayout() {
  useKioskMode({ idleTimeout: 120_000, preventBackButton: true })

  return (
    <div className="kiosk h-dvh w-dvw overflow-hidden">
      <Outlet />
    </div>
  )
}
