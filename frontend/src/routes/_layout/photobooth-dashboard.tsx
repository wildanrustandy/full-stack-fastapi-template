import { createFileRoute } from "@tanstack/react-router"
import {
  Activity,
  BarChart3,
  Camera,
  DollarSign,
  TrendingUp,
} from "lucide-react"
import { Suspense, useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useDashboardOverview,
  useRecentTransactions,
  useRevenueReport,
} from "@/hooks/usePhotobooth"

export const Route = createFileRoute("/_layout/photobooth-dashboard")({
  component: PhotoboothDashboard,
  head: () => ({
    meta: [{ title: "Photobooth Dashboard - FastAPI Template" }],
  }),
})

type DateRange = "7days" | "30days" | "thisMonth"

function toLocalDateStr(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getDateRange(range: DateRange): {
  startDate: string
  endDate: string
} {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let start: Date

  switch (range) {
    case "7days":
      start = new Date(end)
      start.setDate(start.getDate() - 6)
      break
    case "30days":
      start = new Date(end)
      start.setDate(start.getDate() - 29)
      break
    case "thisMonth":
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      break
  }

  return {
    startDate: `${toLocalDateStr(start)}T00:00:00`,
    endDate: `${toLocalDateStr(end)}T23:59:59`,
  }
}

function formatRp(value: number): string {
  return `Rp ${value.toLocaleString("id-ID")}`
}

function RevenueChart() {
  const [dateRange, setDateRange] = useState<DateRange>("7days")
  const { startDate, endDate } = getDateRange(dateRange)
  const { data: revenueData } = useRevenueReport(startDate, endDate)

  const chartData = useMemo(() => {
    if (!revenueData || !Array.isArray(revenueData)) return []
    return (
      revenueData as Array<{ date: string; count: number; revenue: number }>
    ).map((item) => ({
      date: new Date(item.date).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
      }),
      revenue: item.revenue,
      count: item.count,
    }))
  }, [revenueData])

  const totalRevenue = useMemo(
    () => chartData.reduce((sum, item) => sum + item.revenue, 0),
    [chartData],
  )

  const todayStr = new Date().toISOString().split("T")[0]
  const todayRevenue = useMemo(() => {
    if (!revenueData || !Array.isArray(revenueData)) return 0
    const todayItem = (
      revenueData as Array<{ date: string; count: number; revenue: number }>
    ).find((item) => item.date === todayStr)
    return todayItem?.revenue ?? 0
  }, [revenueData, todayStr])

  return (
    <>
      {/* Today's Revenue stat card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatRp(todayRevenue)}</div>
        </CardContent>
      </Card>

      {/* Revenue Chart */}
      <Card className="col-span-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Revenue Overview</CardTitle>
          <Select
            value={dateRange}
            onValueChange={(value) => setDateRange(value as DateRange)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="thisMonth">This month</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-sm text-muted-foreground">
            Total revenue for period:{" "}
            <span className="font-semibold text-foreground">
              {formatRp(totalRevenue)}
            </span>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart
                data={chartData}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <defs>
                  <linearGradient
                    id="revenueGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="hsl(142, 71%, 45%)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(142, 71%, 45%)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value: number) => {
                    if (value >= 1_000_000)
                      return `${(value / 1_000_000).toFixed(1)}M`
                    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
                    return `${value}`
                  }}
                  className="text-muted-foreground"
                />
                <Tooltip
                  formatter={(value) => [formatRp(Number(value)), "Revenue"]}
                  labelClassName="font-medium"
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--border))",
                    backgroundColor: "hsl(var(--card))",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(142, 71%, 45%)"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[320px] items-center justify-center">
              <p className="text-muted-foreground">
                No revenue data for this period
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}

function DashboardContent() {
  const { data: overview } = useDashboardOverview()
  const { data: transactions } = useRecentTransactions(5)

  const stats = [
    {
      title: "Total Sessions",
      value: (overview as any)?.total_sessions ?? 0,
      icon: Camera,
      color: "text-blue-500",
    },
    {
      title: "Total Revenue",
      value: formatRp((overview as any)?.total_revenue ?? 0),
      icon: DollarSign,
      color: "text-green-500",
    },
    {
      title: "Active Booths",
      value: (overview as any)?.active_booths ?? 0,
      icon: Activity,
      color: "text-orange-500",
    },
    {
      title: "Today Sessions",
      value: (overview as any)?.today_sessions ?? 0,
      icon: BarChart3,
      color: "text-purple-500",
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Photobooth Dashboard
        </h1>
        <p className="text-muted-foreground">
          Overview of your photobooth operations
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
        <RevenueChart />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions &&
          Array.isArray(transactions) &&
          transactions.length > 0 ? (
            <div className="space-y-2">
              {(transactions as any[]).map((tx: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">
                      {tx.transaction_id || tx.reference_id || "-"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {tx.booth_name || "Unknown Booth"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      Rp {(tx.amount ?? 0).toLocaleString("id-ID")}
                    </p>
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
