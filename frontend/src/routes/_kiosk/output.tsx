import { useState, useEffect } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import BoothNameHeader from "@/components/Kiosk/BoothNameHeader"

export const Route = createFileRoute("/_kiosk/output")({
  component: OutputPage,
})

function OutputPage() {
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(10)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          navigate({ to: "/landing" })
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [navigate])

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden" style={{ background: "var(--k-background)" }}>
      {/* Background decoration */}
      <div className="bg-grain pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(167,41,90,0.05), transparent, rgba(255,112,159,0.1))" }} />

      {/* Decorative confetti icons */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="material-symbols-outlined absolute left-[10%] top-[15%] text-4xl opacity-20" style={{ color: "var(--k-primary)" }}>celebration</span>
        <span className="material-symbols-outlined absolute right-[15%] top-[20%] text-3xl opacity-15" style={{ color: "var(--k-secondary)" }}>auto_awesome</span>
        <span className="material-symbols-outlined absolute bottom-[25%] left-[20%] text-5xl opacity-10" style={{ color: "var(--k-primary-container)" }}>favorite</span>
        <span className="material-symbols-outlined absolute bottom-[15%] right-[10%] text-4xl opacity-20" style={{ color: "var(--k-tertiary)" }}>stars</span>
      </div>

      {/* Header */}
      <header className="relative z-50 flex flex-none items-center justify-between px-6 py-4 backdrop-blur-sm lg:px-8 lg:py-6" style={{ background: "rgba(237,248,255,0.8)" }}>
        <BoothNameHeader />
      </header>

      {/* Main Content */}
      <main className="relative z-20 flex flex-1 flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center gap-8 text-center">
          {/* Success Icon */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-full opacity-30 blur-xl animate-pulse" style={{ background: "var(--k-primary)" }} />
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full shadow-2xl" style={{ background: "linear-gradient(135deg, var(--k-primary), var(--k-primary-container))" }}>
              <span className="material-symbols-outlined text-7xl text-white">check</span>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="font-headline text-5xl font-black tracking-tighter lg:text-6xl" style={{ color: "var(--k-primary)" }}>
              Terima Kasih!
            </h1>
            <p className="text-xl font-medium" style={{ color: "var(--k-on-surface-variant)" }}>
              Foto kamu sudah siap. Selamat menikmati!
            </p>
          </div>

          {/* Countdown Card */}
          <div className="flex items-center gap-3 rounded-full px-6 py-3 shadow-lg" style={{ background: "white" }}>
            <span className="material-symbols-outlined" style={{ color: "var(--k-primary)" }}>timer</span>
            <span className="font-headline text-sm font-bold" style={{ color: "var(--k-on-surface-variant)" }}>
              Kembali ke halaman utama dalam <span style={{ color: "var(--k-primary)" }}>{countdown}</span> detik
            </span>
          </div>

          <button
            className="flex items-center justify-center gap-3 rounded-full px-12 py-5 text-xl font-extrabold tracking-widest text-white shadow-[0_20px_40px_rgba(167,41,90,0.25)] transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(to right, var(--k-primary), var(--k-primary-container))",
            }}
            onClick={() => navigate({ to: "/landing" })}
          >
            <span className="material-symbols-outlined text-2xl">home</span>
            KEMBALI
          </button>
        </div>
      </main>
    </div>
  )
}
