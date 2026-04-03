import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  BoothsService,
  PaymentsService,
  PhotoboothAdminService,
} from "@/client"

// Booth hooks
const useBooths = () => {
  return useQuery({
    queryKey: ["booths"],
    queryFn: () => BoothsService.readBooths({ skip: 0, limit: 100 }),
  })
}

const useBooth = (id: string) => {
  return useQuery({
    queryKey: ["booths", id],
    queryFn: () => BoothsService.readBooth({ id }),
    enabled: !!id,
  })
}

// Dashboard hooks
const useDashboardOverview = () => {
  return useQuery({
    queryKey: ["photobooth", "dashboard"],
    queryFn: () => PhotoboothAdminService.getDashboardOverview(),
  })
}

const useRecentTransactions = (limit: number = 10) => {
  return useQuery({
    queryKey: ["photobooth", "transactions", "recent", limit],
    queryFn: () => PhotoboothAdminService.getRecentTransactions({ limit }),
  })
}

const useActiveSessions = () => {
  return useQuery({
    queryKey: ["photobooth", "sessions", "active"],
    queryFn: () => PhotoboothAdminService.getActiveSessions(),
  })
}

const useRecentSessions = (limit: number = 20) => {
  return useQuery({
    queryKey: ["photobooth", "sessions", "recent", limit],
    queryFn: () => PhotoboothAdminService.getRecentSessions({ limit }),
  })
}

const useRevenueReport = (startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ["photobooth", "reports", "revenue", startDate, endDate],
    queryFn: () => PhotoboothAdminService.getRevenueReport({ startDate, endDate }),
    enabled: !!startDate && !!endDate,
  })
}

// Payment hooks
const useCreatePayment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { amount: string; booth_id: string; print_count: number; product_name?: string }) =>
      PaymentsService.createPayment({ requestBody: data as any }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photobooth"] })
    },
  })
}

const useCreateDemoPayment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { amount: string; booth_id: string; print_count: number; product_name?: string }) =>
      PaymentsService.createDemoPayment({ requestBody: data as any }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photobooth"] })
    },
  })
}

const useCheckPaymentStatus = (transactionId: string) => {
  return useQuery({
    queryKey: ["payments", "status", transactionId],
    queryFn: () => PaymentsService.checkStatus({ transactionId }),
    enabled: !!transactionId,
    refetchInterval: 3000,
  })
}

// Booth mutations
const useCreateBooth = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; location?: string; config?: Record<string, unknown> }) =>
      BoothsService.createBooth({ requestBody: data as any }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booths"] })
    },
  })
}

const useUpdateBooth = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; location?: string; is_active?: boolean }) =>
      BoothsService.updateBooth({ id, requestBody: data as any }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booths"] })
    },
  })
}

const useDeleteBooth = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => BoothsService.deleteBooth({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booths"] })
    },
  })
}

export {
  useBooths,
  useBooth,
  useDashboardOverview,
  useRecentTransactions,
  useActiveSessions,
  useRecentSessions,
  useRevenueReport,
  useCreatePayment,
  useCreateDemoPayment,
  useCheckPaymentStatus,
  useCreateBooth,
  useUpdateBooth,
  useDeleteBooth,
}
