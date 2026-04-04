import { createFileRoute, useNavigate } from "@tanstack/react-router"
import QRCode from "qrcode"
import { useCallback, useEffect, useState } from "react"
import { z } from "zod"
import BoothNameHeader from "@/components/Kiosk/BoothNameHeader"
import CountdownTimer from "@/components/Kiosk/CountdownTimer"
import ProgressIndicator from "@/components/Kiosk/ProgressIndicator"
import QRDisplay from "@/components/Kiosk/QRDisplay"
import { useKioskDevice } from "@/hooks/useKioskDevice"
import {
  useCheckPaymentStatus,
  useCreateDemoPayment,
  useCreatePayment,
} from "@/hooks/usePhotobooth"

const paymentSearchSchema = z.object({
  printCount: z.coerce.number(),
  amount: z.coerce.number(),
})

export const Route = createFileRoute("/_kiosk/payment")({
  component: PaymentPage,
  validateSearch: paymentSearchSchema,
})

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount)
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

const COUNTDOWN_SECONDS = 5 * 60 // 5 minutes
const IS_DEMO_MODE = import.meta.env.VITE_DEMO_PAYMENT === "true"

interface PaymentCache {
  transactionId: string
  sessionId: string
  referenceId: string
  qrCodeUrl: string | null
  createdAt: number // timestamp
  boothId: string
  amount: number
  printCount: number
}

function getPaymentCacheKey(
  boothId: string,
  amount: number,
  printCount: number,
) {
  return `payment_${boothId}_${amount}_${printCount}`
}

function getPaymentCache(key: string): PaymentCache | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const cache: PaymentCache = JSON.parse(raw)
    // Expire after 5 minutes
    if (Date.now() - cache.createdAt > COUNTDOWN_SECONDS * 1000) {
      sessionStorage.removeItem(key)
      return null
    }
    return cache
  } catch {
    return null
  }
}

function setPaymentCache(key: string, cache: PaymentCache) {
  sessionStorage.setItem(key, JSON.stringify(cache))
}

function clearPaymentCache(key: string) {
  sessionStorage.removeItem(key)
}

function PaymentPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const { printCount, amount } = search
  const { booth, lastMessage } = useKioskDevice()
  const createPayment = useCreatePayment()
  const createDemoPayment = useCreateDemoPayment()
  const boothId = booth?.id

  const [transactionId, setTransactionId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [referenceId, setReferenceId] = useState<string | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<
    "pending" | "success" | "failed"
  >("pending")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)

  const { data: status } = useCheckPaymentStatus(transactionId || "")

  // Watch payment status from polling
  useEffect(() => {
    if (status && (status as any).Status === "success") {
      setPaymentStatus("success")
    }
  }, [status])

  // Watch for payment_success from WebSocket
  useEffect(() => {
    if (
      lastMessage?.type === "payment_success" &&
      paymentStatus === "pending"
    ) {
      console.log("Payment success received via WebSocket")
      setPaymentStatus("success")
      if (lastMessage.session_id) {
        setSessionId(lastMessage.session_id)
      }
    }
  }, [lastMessage, paymentStatus])

  // Countdown timer
  useEffect(() => {
    if (paymentStatus !== "pending") return
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setPaymentStatus("failed")
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [paymentStatus])

  // Auto-navigate on success
  useEffect(() => {
    if (paymentStatus === "success") {
      // Clear payment cache
      if (boothId) {
        const cacheKey = getPaymentCacheKey(boothId, amount, printCount || 1)
        clearPaymentCache(cacheKey)
      }
      const timeout = setTimeout(() => {
        navigate({
          to: "/photo-session",
          search: { sessionId: sessionId ?? undefined },
        })
      }, 2500)
      return () => clearTimeout(timeout)
    }
    if (paymentStatus === "failed") {
      // Clear payment cache
      if (boothId) {
        const cacheKey = getPaymentCacheKey(boothId, amount, printCount || 1)
        clearPaymentCache(cacheKey)
      }
      const timeout = setTimeout(() => {
        navigate({ to: "/landing" })
      }, 3000)
      return () => clearTimeout(timeout)
    }
  }, [paymentStatus, sessionId, navigate, boothId, amount, printCount])

  const handlePayment = useCallback(async () => {
    if (!boothId) {
      setError("Booth tidak ditemukan. Kembali ke halaman utama.")
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      if (IS_DEMO_MODE) {
        // Demo: immediately successful, no real QR
        const result = (await createDemoPayment.mutateAsync({
          amount: String(amount),
          booth_id: boothId,
          print_count: printCount || 1,
          product_name: "Photobooth Session",
        })) as any
        setTransactionId(result.TransactionId)
        setSessionId(result.SessionId)
        setReferenceId(result.ReferenceId)
        setPaymentStatus("success")
      } else {
        // Real iPaymu payment
        const result = (await createPayment.mutateAsync({
          amount: String(amount),
          booth_id: boothId,
          print_count: printCount || 1,
          product_name: "Photobooth Session",
        })) as any
        setTransactionId(result.TransactionId)
        setSessionId(result.SessionId)
        setReferenceId(result.ReferenceId)

        // Generate QR code image from iPaymu QrString (raw QRIS data)
        const qrString = result.QrString || ""
        let qrDataUrl: string | null = null
        if (qrString) {
          qrDataUrl = await QRCode.toDataURL(qrString, {
            width: 400,
            margin: 2,
            color: { dark: "#000000", light: "#ffffff" },
          })
          setQrCodeUrl(qrDataUrl)
        }

        // Cache payment details for refresh recovery
        const cacheKey = getPaymentCacheKey(boothId, amount, printCount || 1)
        setPaymentCache(cacheKey, {
          transactionId: result.TransactionId,
          sessionId: result.SessionId,
          referenceId: result.ReferenceId,
          qrCodeUrl: qrDataUrl,
          createdAt: Date.now(),
          boothId,
          amount,
          printCount: printCount || 1,
        })
        // Payment stays "pending" — status will be updated by polling/webhook
      }
    } catch {
      setError("Gagal membuat pembayaran. Coba lagi.")
    } finally {
      setIsLoading(false)
    }
  }, [amount, boothId, printCount, createPayment, createDemoPayment])

  // On mount: restore from cache or create new payment
  useEffect(() => {
    if (!boothId) return

    const cacheKey = getPaymentCacheKey(boothId, amount, printCount || 1)
    const cached = getPaymentCache(cacheKey)

    if (cached) {
      // Restore from cache — no new API call
      setTransactionId(cached.transactionId)
      setSessionId(cached.sessionId)
      setReferenceId(cached.referenceId)
      setQrCodeUrl(cached.qrCodeUrl)
      // Calculate remaining countdown
      const elapsed = Math.floor((Date.now() - cached.createdAt) / 1000)
      const remaining = Math.max(COUNTDOWN_SECONDS - elapsed, 0)
      setCountdown(remaining)
      if (remaining <= 0) {
        setPaymentStatus("failed")
        clearPaymentCache(cacheKey)
      }
    } else {
      handlePayment()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boothId, amount, handlePayment, printCount])

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{
        background: "var(--k-background)",
        color: "var(--k-on-surface)",
      }}
    >
      {/* Success Overlay */}
      {paymentStatus === "success" && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center rounded-3xl bg-white/90 backdrop-blur-sm">
          <div className="mb-8 flex h-32 w-32 scale-110 items-center justify-center rounded-full bg-green-500 shadow-2xl animate-pulse">
            <span className="material-symbols-outlined text-7xl font-bold text-white">
              check
            </span>
          </div>
          <h2 className="font-headline mb-3 text-4xl font-extrabold tracking-tight">
            Pembayaran Berhasil!
          </h2>
          <p
            className="animate-pulse text-xl font-medium"
            style={{ color: "var(--k-on-surface-variant)" }}
          >
            Menyiapkan Sesi Foto...
          </p>
        </div>
      )}

      {/* Failed Overlay */}
      {paymentStatus === "failed" && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center rounded-3xl bg-white/90 backdrop-blur-sm">
          <div className="mb-8 flex h-32 w-32 scale-110 items-center justify-center rounded-full bg-red-500 shadow-2xl animate-pulse">
            <span className="material-symbols-outlined text-7xl font-bold text-white">
              close
            </span>
          </div>
          <h2 className="font-headline mb-3 text-4xl font-extrabold tracking-tight">
            Waktu Habis / Gagal
          </h2>
          <p
            className="animate-pulse text-xl font-medium"
            style={{ color: "var(--k-on-surface-variant)" }}
          >
            Mengembalikan ke Halaman Utama...
          </p>
        </div>
      )}

      {/* Header */}
      <header
        className="flex flex-none items-center justify-between px-6 py-4 backdrop-blur-sm lg:px-8 lg:py-6"
        style={{ background: "rgba(237,248,255,0.8)" }}
      >
        <BoothNameHeader />
        <nav className="hidden items-center gap-8 md:flex">
          <span
            className="font-headline text-sm font-extrabold lg:text-base"
            style={{
              color: "var(--k-primary)",
              borderBottom: "4px solid var(--k-primary)",
              paddingBottom: 4,
            }}
          >
            Step 2/4
          </span>
        </nav>
        <div className="flex items-center gap-2 lg:gap-3">
          <button
            type="button"
            className="text-xl font-medium transition-transform duration-300 hover:scale-105 lg:text-2xl"
            style={{ color: "rgba(36,48,54,0.6)" }}
          >
            <span className="material-symbols-outlined">help</span>
          </button>
          <button
            type="button"
            className="text-xl font-medium transition-transform duration-300 hover:scale-105 lg:text-2xl"
            style={{ color: "rgba(36,48,54,0.6)" }}
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center overflow-hidden px-6 py-4 w-full max-w-4xl mx-auto relative">
        <div className="mb-4 flex-none">
          <ProgressIndicator currentStep={2} />
        </div>

        <section className="mb-6 w-full flex-none text-center">
          <h1 className="font-headline mb-2 text-4xl font-extrabold tracking-tight md:text-5xl">
            Pembayaran QRIS
          </h1>
          <p
            className="text-lg font-medium"
            style={{ color: "var(--k-on-surface-variant)" }}
          >
            Scan QR dengan aplikasi pembayaran Anda
          </p>
        </section>

        <div className="grid w-full flex-1 min-h-0 grid-cols-1 gap-6 md:grid-cols-12">
          {/* Order Summary */}
          <div className="order-2 flex flex-col gap-6 md:order-1 md:col-span-4">
            <div
              className="flex flex-col justify-between rounded-xl p-8 h-full"
              style={{
                background: "var(--k-surface-container-low)",
                boxShadow: "0 20px 40px rgba(36,48,54,0.06)",
              }}
            >
              <div>
                <h3
                  className="font-headline mb-6 text-xl font-bold"
                  style={{ color: "var(--k-primary)" }}
                >
                  Ringkasan
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span
                      className="font-medium"
                      style={{ color: "var(--k-on-surface-variant)" }}
                    >
                      Paket Foto
                    </span>
                    <span className="font-bold">Standard</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span
                      className="font-medium"
                      style={{ color: "var(--k-on-surface-variant)" }}
                    >
                      Jumlah Cetak
                    </span>
                    <span className="font-bold">{printCount} Lembar</span>
                  </div>
                  <div
                    className="my-2 h-px w-full"
                    style={{ background: "rgba(196,198,207,0.2)" }}
                  />
                  <div className="flex items-end justify-between">
                    <span
                      className="font-medium"
                      style={{ color: "var(--k-on-surface-variant)" }}
                    >
                      Total Harga
                    </span>
                    <span className="font-headline text-2xl font-black">
                      {formatRupiah(amount)}
                    </span>
                  </div>
                  {referenceId && (
                    <div
                      className="mt-4 border-t pt-4"
                      style={{ borderColor: "rgba(196,198,207,0.2)" }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="text-sm font-medium"
                          style={{ color: "var(--k-on-surface-variant)" }}
                        >
                          Ref ID
                        </span>
                        <span
                          className="font-mono text-sm font-bold tracking-wide"
                          style={{ color: "var(--k-primary)" }}
                        >
                          {referenceId}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div
                className="mt-8 border-t pt-8"
                style={{ borderColor: "rgba(196,198,207,0.1)" }}
              >
                <CountdownTimer
                  formattedTime={formatCountdown(countdown)}
                  isWarning={countdown <= 60}
                />
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="order-1 flex min-h-0 items-center justify-center md:order-2 md:col-span-8">
            <QRDisplay
              qrCodeUrl={qrCodeUrl}
              isLoading={isLoading}
              error={error}
              isDemo={IS_DEMO_MODE}
              onRetry={handlePayment}
            />
          </div>
        </div>

        {/* 3-step Instructions */}
        <div className="mb-4 mt-6 w-full grid grid-cols-1 gap-6 flex-none md:grid-cols-3">
          <div className="flex items-start gap-4 p-4">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ background: "rgba(167,41,90,0.1)" }}
            >
              <span
                className="material-symbols-outlined font-bold"
                style={{ color: "var(--k-primary)" }}
              >
                qr_code_scanner
              </span>
            </div>
            <div>
              <h4 className="font-headline font-bold">Buka Aplikasi</h4>
              <p
                className="text-sm"
                style={{ color: "var(--k-on-surface-variant)" }}
              >
                Gunakan Dana, GoPay, OVO, ShopeePay, atau BCA Mobile.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ background: "rgba(167,41,90,0.1)" }}
            >
              <span
                className="material-symbols-outlined font-bold"
                style={{ color: "var(--k-primary)" }}
              >
                ads_click
              </span>
            </div>
            <div>
              <h4 className="font-headline font-bold">Scan & Bayar</h4>
              <p
                className="text-sm"
                style={{ color: "var(--k-on-surface-variant)" }}
              >
                Pindai kode QR dan masukkan PIN keamanan Anda.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ background: "rgba(167,41,90,0.1)" }}
            >
              <span
                className="material-symbols-outlined font-bold"
                style={{ color: "var(--k-primary)" }}
              >
                task_alt
              </span>
            </div>
            <div>
              <h4 className="font-headline font-bold">Konfirmasi</h4>
              <p
                className="text-sm"
                style={{ color: "var(--k-on-surface-variant)" }}
              >
                Layar akan otomatis beralih setelah pembayaran berhasil.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="flex flex-none items-center justify-around rounded-t-[2rem] px-10 py-6 shadow-[0_-20px_40px_rgba(36,48,54,0.06)] backdrop-blur-xl lg:rounded-t-[3rem]"
        style={{ background: "rgba(255,255,255,0.6)" }}
      >
        {paymentStatus === "pending" && (
          <div
            className="flex flex-col items-center animate-pulse"
            style={{ color: "rgba(82,96,104,0.4)" }}
          >
            <span className="font-headline text-xs font-bold uppercase tracking-[0.2em]">
              Menunggu Pembayaran...
            </span>
          </div>
        )}
        {paymentStatus === "success" && (
          <div className="flex flex-col items-center text-green-500 animate-pulse">
            <span className="font-headline text-sm font-bold uppercase tracking-[0.2em]">
              Lanjut otomatis...
            </span>
          </div>
        )}
      </footer>
    </div>
  )
}
