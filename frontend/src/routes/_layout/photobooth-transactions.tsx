import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { Suspense } from "react"
import { PhotoboothAdminService, UsersService } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const Route = createFileRoute("/_layout/photobooth-transactions")({
  component: PhotoboothTransactions,
  beforeLoad: async () => {
    const user = await UsersService.readUserMe()
    if (!user.is_superuser) {
      throw redirect({ to: "/" })
    }
  },
  head: () => ({ meta: [{ title: "Transactions - FastAPI Template" }] }),
})

function transactionsQueryOptions() {
  return {
    queryKey: ["photobooth", "transactions"],
    queryFn: () => PhotoboothAdminService.getTransactions({}),
  }
}

function TransactionsContent() {
  const { data: transactions } = useSuspenseQuery(transactionsQueryOptions())
  const txList = (Array.isArray(transactions) ? transactions : []) as any[]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground">View all payment transactions</p>
      </div>

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
              {txList.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    No transactions yet
                  </TableCell>
                </TableRow>
              ) : (
                txList.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">
                      {tx.reference_id || tx.transaction_id || "-"}
                    </TableCell>
                    <TableCell>{tx.booth_id || "-"}</TableCell>
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
  return (
    <Suspense fallback={<div className="p-6">Loading transactions...</div>}>
      <TransactionsContent />
    </Suspense>
  )
}
