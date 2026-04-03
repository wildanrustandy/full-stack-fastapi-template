import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useDashboardOverview, useRecentTransactions } from "@/hooks/usePhotobooth"
import { BarChart3, DollarSign, Camera, Activity } from "lucide-react"

export const Route = createFileRoute("/_layout/photobooth-dashboard")({
  component: PhotoboothDashboard,
  head: () => ({ meta: [{ title: "Photobooth Dashboard - FastAPI Template" }] }),
})

function DashboardContent() {
  const { data: overview } = useDashboardOverview()
  const { data: transactions } = useRecentTransactions(5)

  const stats = [
    { title: "Total Sessions", value: (overview as any)?.total_sessions ?? 0, icon: Camera, color: "text-blue-500" },
    { title: "Total Revenue", value: `Rp ${((overview as any)?.total_revenue ?? 0).toLocaleString("id-ID")}`, icon: DollarSign, color: "text-green-500" },
    { title: "Active Booths", value: (overview as any)?.active_booths ?? 0, icon: Activity, color: "text-orange-500" },
    { title: "Today Sessions", value: (overview as any)?.today_sessions ?? 0, icon: BarChart3, color: "text-purple-500" },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Photobooth Dashboard</h1>
        <p className="text-muted-foreground">Overview of your photobooth operations</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions && Array.isArray(transactions) && transactions.length > 0 ? (
            <div className="space-y-2">
              {(transactions as any[]).map((tx: any, i: number) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{tx.transaction_id || tx.reference_id || "-"}</p>
                    <p className="text-sm text-muted-foreground">{tx.booth_name || "Unknown Booth"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">Rp {(tx.amount ?? 0).toLocaleString("id-ID")}</p>
                    <p className="text-sm text-muted-foreground">{tx.status}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No recent transactions</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function PhotoboothDashboard() {
  return (
    <Suspense fallback={<div className="p-6">Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
