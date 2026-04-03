import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import BoothNameHeader from "@/components/Kiosk/BoothNameHeader"

export const Route = createFileRoute("/_kiosk/landing")({
  component: LandingPage,
})

const slides = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCPX7bOgbiKU-qoxt7mfUPEEKEC1Lf_P1TW7duplwJV5R1VSWclOwsmbwN8tQ2UpGI3oQuvg69Txyzd0ONR-V1-6D7L8bAuX1wqDvEEh87CKUl960NPoQRTsuUGviSdFd8YO3VpqEr6FF2Qq6AnBLYUeirNCa7k1mjqhRp-7JwEcgBGdgsw1YSq7JYiGdAYgTl-nmpY9h80SjZL5z2nGVAoxGn9dKzIm1Mk1SDKxpuL27qi6gVQMZzwC2PnMizf9O4itUFHHcPo6ag",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAfQGq-nKsG1KOq9iYonhwFhrgqNCtUXiarbN8BI7ouPtbDaurpQ_bvvZRGReW0jLLekXn3I0RAZRt5vbvDA6c9ugctSbYQsbJK1pHH2-1pWnLT6Goxgip15xVx9PShUGhcgm5fIrbn4ZxIkfIeo39XefJ9RNWg0PrAYWqhKOcE9cUnWXcegFZgVVw0QZiDAHx2iklCcj49QCVoul9z2SAKveWKkwfBZk0IUMa-xEBc-odRRMrLjz9ENIWt3Hq0elxjjRIdHMyZDKg",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBZREI4zubx5R8_cLo7cmpfAFlGm9bhPVMjQK1D-Jn__Mp5OSvjYC0mdc9l1ZiXD6sKmB_uxSNBIkCtP6mEgX_C8gVxtBg8eydUpQB9TUxrmi9i78j2m_xaLJCSszsvDZd0BKlb8cY7dhZX-7Atkz3MP5MsX33TD3cKV8fpG5QI9x7R1tY4nTtGJ-6cdfm_3Qkuh3_fdGaabVGhRfMU_IbJ9SVyuJrKBPmZR0iyIy-3QlEMJKMBRWUP7EJhLiSYN0jaivZ30550aSg",
]

function LandingPage() {
  const navigate = useNavigate()
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{ background: "var(--k-background)" }}
    >
      {/* Background Images */}
      <div className="absolute inset-0 z-0 flex items-center justify-center">
        <div className="flex flex-wrap justify-center gap-3 p-4 opacity-40">
          {slides.map((slide, index) => (
            <div
              key={index}
              className="aspect-[3/4] w-32 overflow-hidden rounded-xl transition-opacity duration-1000 lg:w-48"
              style={{
                transform: `rotate(${((index % 3) - 1) * 5}deg) translateY(${index * 10}px)`,
                opacity: currentSlide === index ? 1 : 0.3,
              }}
            >
              <img
                src={slide}
                alt={`Slide ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Overlay Effects */}
      <div className="bg-grain pointer-events-none absolute inset-0 z-[1]" />
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(237,248,255,0.2), transparent, rgba(237,248,255,0.8))",
        }}
      />

      {/* Decorative Icons */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        <span
          className="material-symbols-outlined absolute left-1/4 top-1/4 text-3xl opacity-40 lg:text-4xl"
          style={{ color: "var(--k-primary)" }}
        >
          auto_awesome
        </span>
        <span
          className="material-symbols-outlined absolute bottom-1/3 right-1/4 text-4xl opacity-30 lg:text-5xl"
          style={{ color: "var(--k-secondary)" }}
        >
          favorite
        </span>
        <span
          className="material-symbols-outlined absolute right-10 top-1/3 text-2xl opacity-50 lg:text-3xl"
          style={{ color: "var(--k-primary-container)" }}
        >
          stars
        </span>
        <span
          className="material-symbols-outlined absolute bottom-16 left-10 text-5xl opacity-40 lg:text-6xl"
          style={{ color: "var(--k-tertiary)" }}
        >
          celebration
        </span>
      </div>

      {/* Header */}
      <header
        className="relative z-50 flex flex-none items-center justify-between px-6 py-4 backdrop-blur-sm lg:px-8 lg:py-6"
        style={{ background: "rgba(237,248,255,0.8)" }}
      >
        <BoothNameHeader />
        <div className="flex items-center gap-2 lg:gap-4">
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
      <main className="relative z-20 flex flex-1 flex-col items-center justify-center px-6">
        <div className="flex w-full max-w-2xl flex-col items-center gap-8 text-center lg:gap-10">
          <div className="space-y-3 lg:space-y-4">
            <h2
              className="font-headline text-4xl font-black tracking-tighter drop-shadow-sm sm:text-5xl md:text-6xl lg:text-7xl"
              style={{ color: "var(--k-primary)" }}
            >
              Photobooth
            </h2>
            <p
              className="mx-auto max-w-md text-sm font-medium sm:text-base md:text-lg lg:text-xl"
              style={{ color: "var(--k-on-surface-variant)" }}
            >
              Siap untuk pose terbaikmu? Ayo buat momen seru hari ini!
            </p>
          </div>

          <div className="relative group">
            <div
              className="absolute -inset-3 rounded-full opacity-30 blur-xl transition-opacity duration-500 group-hover:opacity-50 lg:-inset-4 lg:blur-2xl"
              style={{
                background:
                  "linear-gradient(to right, var(--k-primary), var(--k-primary-container))",
              }}
            />
            <button
              type="button"
              className="font-headline relative rounded-full px-10 py-5 text-xl font-extrabold tracking-widest shadow-[0_20px_40px_rgba(167,41,90,0.25)] transition-all duration-300 hover:scale-105 active:scale-95 sm:px-12 sm:text-2xl sm:py-6 md:px-16 md:text-3xl md:py-7 lg:px-20 lg:text-4xl lg:py-8"
              style={{
                background:
                  "linear-gradient(to right, var(--k-primary), var(--k-primary-container))",
                color: "var(--k-on-primary)",
              }}
              onClick={() => navigate({ to: "/print-count" })}
            >
              MULAI
            </button>
          </div>

          <div className="flex rotate-2 items-center gap-3 rounded-xl border border-white/40 bg-white/60 p-3 shadow-lg backdrop-blur-xl lg:gap-4 lg:p-4">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2"
              style={{
                borderColor: "rgba(167,41,90,0.2)",
                background: "var(--k-surface-container)",
              }}
            >
              <span
                className="material-symbols-outlined text-2xl lg:text-3xl"
                style={{ color: "var(--k-primary)" }}
              >
                photo_camera
              </span>
            </div>
            <div className="text-left">
              <p
                className="font-headline text-xs font-bold lg:text-sm"
                style={{ color: "var(--k-on-surface)" }}
              >
                Update Terbaru!
              </p>
              <p
                className="text-[10px] lg:text-xs"
                style={{ color: "var(--k-on-surface-variant)" }}
              >
                Filter Rose Glow baru saja ditambahkan
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
