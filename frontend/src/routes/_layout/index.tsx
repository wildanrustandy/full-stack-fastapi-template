import { createFileRoute, redirect } from "@tanstack/react-router"

import { UsersService } from "@/client"
import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/")({
  beforeLoad: async () => {
    const user = await UsersService.readUserMe()
    if (user.is_superuser) {
      throw redirect({ to: "/photobooth-dashboard" })
    }
    // Non-superusers stay on this page
  },
  component: UserDashboard,
  head: () => ({
    meta: [{ title: "Dashboard - FastAPI Template" }],
  }),
})

function UserDashboard() {
  const { user: currentUser } = useAuth()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Hi, {currentUser?.full_name || currentUser?.email} 👋
        </h1>
        <p className="text-muted-foreground">
          Welcome back! You are logged in as a regular user.
        </p>
      </div>
      <div className="rounded-lg border p-6">
        <p className="text-muted-foreground">
          This account has limited access. Contact an administrator for more
          information.
        </p>
      </div>
    </div>
  )
}
