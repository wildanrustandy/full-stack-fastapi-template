import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { PhotoboothAdminService } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useBooths } from "@/hooks/usePhotobooth"

export const Route = createFileRoute("/_layout/photobooth-transactions")({
  component: PhotoboothTransactions,
  head: () => ({ meta: [{ title: "Transactions - FastAPI Template" }] }),
})

function TransactionsContent() {
  // Filter state
  const [boothId, setBoothId] = useState<string>("all")
  const [status, setStatus] = useState<string>("all")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")

  // Fetch booths for the dropdown + name resolution
  const { data: boothsData } = useBooths()
  const booths = boothsData?.data ?? []

  const boothMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const booth of booths) {
      map.set(booth.id, booth.name)
    }
    return map
  }, [booths])

  // Build query params, only including non-default values
  const queryParams = useMemo(() => {
    const params: {
      boothId?: string
      status?: string
      startDate?: string
      endDate?: string
    } = {}
    if (boothId && boothId !== "all") params.boothId = boothId
    if (status && status !== "all") params.status = status
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate
    return params
  }, [boothId, status, startDate, endDate])

  // Fetch transactions with filters
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["photobooth", "transactions", queryParams],
    queryFn: () => PhotoboothAdminService.getTransactions(queryParams),
  })

  const txList = (Array.isArray(transactions) ? transactions : []) as any[]

  const hasFilters =
    boothId !== "all" || status !== "all" || startDate !== "" || endDate !== ""

  const resetFilters = () => {
    setBoothId("all")
    setStatus("all")
    setStartDate("")
    setEndDate("")
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground">View all payment transactions</p>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 py-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Booth</span>
            <Select value={boothId} onValueChange={setBoothId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Booths" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Booths</SelectItem>
                {booths.map((booth) => (
                  <SelectItem key={booth.id} value={booth.id}>
                    {booth.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Status</span>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Start Date</span>
            <Input
              type="date"
              className="w-[160px]"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">End Date</span>
            <Input
              type="date"
              className="w-[160px]"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {hasFilters && (
            <Button variant="outline" onClick={resetFilters}>
              Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Booth</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    Loading transactions...
                  </TableCell>
                </TableRow>
              ) : txList.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    {hasFilters
                      ? "No transactions found matching the filters"
                      : "No transactions yet"}
                  </TableCell>
                </TableRow>
              ) : (
                txList.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">
                      {tx.reference_id || tx.transaction_id || "-"}
                    </TableCell>
                    <TableCell>
                      {tx.booth_id
                        ? boothMap.get(tx.booth_id) || tx.booth_id
                        : "-"}
                    </TableCell>
                    <TableCell>
                      Rp {(tx.amount ?? 0).toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          tx.status === "success"
                            ? "default"
                            : tx.status === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {tx.created_at
                        ? new Date(tx.created_at).toLocaleDateString("id-ID")
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function PhotoboothTransactions() {
  return <TransactionsContent />
}
