import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { z } from "zod"
import BoothNameHeader from "@/components/Kiosk/BoothNameHeader"
import ProgressIndicator from "@/components/Kiosk/ProgressIndicator"
import { useKioskDevice } from "@/hooks/useKioskDevice"

const printCountSearchSchema = z.object({
  boothId: z.string().optional(),
})

export const Route = createFileRoute("/_kiosk/print-count")({
  component: PrintCountPage,
  validateSearch: printCountSearchSchema,
})

const DEFAULT_PRICE_PER_SHEET = 35000
const MIN_PRINT = 1
const MAX_PRINT = 10

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount)
}

function PrintCountPage() {
  const navigate = useNavigate()
  const { booth } = useKioskDevice()
  const [printCount, setPrintCount] = useState(1)
  const pricePerSheet =
    booth?.config?.price_per_print || DEFAULT_PRICE_PER_SHEET
  const total = printCount * pricePerSheet

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{ background: "var(--k-background)" }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom right, rgba(167,41,90,0.05), transparent, rgba(254,193,214,0.1))",
        }}
      />

      {/* Header */}
      <header
        className="relative z-50 flex flex-none items-center justify-between px-6 py-4 backdrop-blur-sm lg:px-8 lg:py-6"
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
            Step 1/4
          </span>
        </nav>
        <div className="flex items-center gap-2 lg:gap-3">
          <button
            type="button"
            className="transition-transform duration-300 hover:scale-105 active:scale-95"
            style={{ color: "var(--k-primary)" }}
          >
            <span className="material-symbols-outlined text-xl lg:text-2xl">
              help
            </span>
          </button>
          <button
            type="button"
            className="transition-transform duration-300 hover:scale-105 active:scale-95"
            style={{ color: "var(--k-primary)" }}
          >
            <span className="material-symbols-outlined text-xl lg:text-2xl">
              settings
            </span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex flex-1 flex-col items-center overflow-hidden px-6 py-4 lg:py-6">
        <div className="mb-4 flex-none lg:mb-6">
          <ProgressIndicator currentStep={1} />
        </div>

        <h1
          className="font-headline mb-6 flex-none text-center text-3xl font-black tracking-tight lg:mb-8 md:text-4xl lg:text-5xl"
          style={{ color: "var(--k-on-surface)" }}
        >
          Mau cetak berapa lembar?
        </h1>

        <div className="flex w-full max-w-4xl flex-1 flex-col items-stretch gap-6 overflow-hidden md:flex-row lg:gap-8">
          {/* Sample Photo */}
          <div
            className="relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-xl p-4 lg:p-6"
            style={{
              background: "var(--k-surface-container-lowest)",
              boxShadow: "0 20px 40px rgba(36,48,54,0.06)",
            }}
          >
            <div
              className="absolute inset-0 opacity-50"
              style={{
                background:
                  "linear-gradient(to bottom right, rgba(167,41,90,0.05), transparent)",
              }}
            />
            <div className="group relative aspect-[3/4] w-full max-w-[180px] rotate-[-2deg] overflow-hidden rounded-lg border-4 border-white shadow-lg transition-transform duration-500 hover:rotate-0 lg:max-w-[220px] lg:border-8">
              <img
                alt="Sample photobooth strip"
                className="h-full w-full object-cover"
                style={{ background: "var(--k-surface-container)" }}
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDdq6jrNXK7j5BULFeaoh9oS-jXiQZEf0x49j6s8nqA7N5h1fqwHqPBR3b-SpRhhUzZ1phFHpWJ9WuvT8hATQh5yrw7OpqU0vQRk5mblnXOeCqp-_3RZ7r79ZThjhrPDMfXyeS3SbxXRKdk-7X3O7o3-upsiK1Jobrj9nKwjgA6fpksDcTfVPNdOeNA61Owdox7b3hPJNXfrJQY284JmIAOSLi00pBiUjVnqVMn9idvZe8XMXe8tHzWpi8ufuhCnopC6PjvPzYTHyY"
              />
            </div>
            <div className="relative z-10 mt-4 text-center lg:mt-6">
              <p
                className="font-label mb-1 text-xs font-bold uppercase tracking-widest lg:text-sm"
                style={{ color: "var(--k-primary)" }}
              >
                Standard Glossy
              </p>
              <p
                className="text-xs lg:text-sm"
                style={{ color: "var(--k-on-surface-variant)" }}
              >
                4x6 inch • 300dpi
              </p>
            </div>
          </div>

          {/* Quantity Selection */}
          <div
            className="flex flex-1 flex-col justify-between overflow-hidden rounded-xl p-6 lg:p-8"
            style={{
              background: "var(--k-surface-container-low)",
              boxShadow: "0 20px 40px rgba(36,48,54,0.04)",
            }}
          >
            <div className="flex-none">
              <div className="mb-4 flex items-center justify-between lg:mb-6">
                <span
                  className="font-label text-base font-bold lg:text-lg"
                  style={{ color: "var(--k-on-surface)" }}
                >
                  Quantity
                </span>
                <div
                  className="rounded-full px-3 py-1 text-xs font-bold lg:px-4 lg:text-sm"
                  style={{
                    background: "var(--k-secondary-container)",
                    color: "var(--k-on-secondary-container)",
                  }}
                >
                  {formatRupiah(pricePerSheet)} / lembar
                </div>
              </div>

              <div
                className="mb-6 flex items-center justify-between rounded-full border p-1.5 lg:mb-8 lg:p-2"
                style={{
                  background: "var(--k-surface-container-lowest)",
                  borderColor: "rgba(196,198,207,0.1)",
                }}
              >
                <button
                  type="button"
                  className="flex h-12 w-12 items-center justify-center rounded-full transition-all active:scale-90 lg:h-14 lg:w-14"
                  style={{
                    background: "var(--k-surface-container)",
                    color: "var(--k-primary)",
                  }}
                  disabled={printCount <= MIN_PRINT}
                  onClick={() =>
                    setPrintCount((c) => Math.max(MIN_PRINT, c - 1))
                  }
                >
                  <span className="material-symbols-outlined text-2xl font-bold lg:text-3xl">
                    remove
                  </span>
                </button>

                <span
                  className="font-headline text-4xl font-black lg:text-5xl"
                  style={{ color: "var(--k-on-surface)" }}
                >
                  {String(printCount).padStart(2, "0")}
                </span>

                <button
                  type="button"
                  className="flex h-12 w-12 items-center justify-center rounded-full shadow-md transition-all hover:brightness-110 active:scale-90 lg:h-14 lg:w-14"
                  style={{
                    background: "var(--k-primary)",
                    color: "var(--k-on-primary)",
                  }}
                  disabled={printCount >= MAX_PRINT}
                  onClick={() =>
                    setPrintCount((c) => Math.min(MAX_PRINT, c + 1))
                  }
                >
                  <span className="material-symbols-outlined text-2xl font-bold lg:text-3xl">
                    add
                  </span>
                </button>
              </div>
            </div>

            <div className="flex-none space-y-3 lg:space-y-4">
              <div
                className="flex items-end justify-between border-b pb-3 lg:pb-4"
                style={{ borderColor: "rgba(196,198,207,0.2)" }}
              >
                <span
                  className="text-sm font-medium lg:text-base"
                  style={{ color: "var(--k-on-surface-variant)" }}
                >
                  Subtotal
                </span>
                <span
                  className="text-lg font-bold tracking-tight lg:text-xl"
                  style={{ color: "var(--k-on-surface)" }}
                >
                  {formatRupiah(total)}
                </span>
              </div>
              <div className="flex items-baseline justify-between pt-1 lg:pt-2">
                <span
                  className="text-base font-bold lg:text-lg"
                  style={{ color: "var(--k-on-surface)" }}
                >
                  Total Payment
                </span>
                <span
                  className="font-headline text-2xl font-black tracking-tighter lg:text-4xl"
                  style={{ color: "var(--k-primary)" }}
                >
                  {formatRupiah(total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="flex flex-none items-center justify-around rounded-t-[2rem] px-8 py-4 shadow-[0_-20px_40px_rgba(36,48,54,0.06)] backdrop-blur-xl lg:rounded-t-[3rem] lg:px-10 lg:py-5"
        style={{ background: "rgba(255,255,255,0.6)" }}
      >
        <button
          type="button"
          className="flex flex-col items-center justify-center rounded-full px-8 py-3 shadow-sm transition-all duration-200 hover:brightness-110 active:scale-90 lg:px-10 lg:py-4"
          style={{
            background: "var(--k-surface-container-lowest)",
            color: "var(--k-on-surface)",
          }}
          onClick={() => navigate({ to: "/landing" })}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xs font-bold lg:text-sm">
              arrow_back_ios
            </span>
            <span className="font-body text-[10px] font-bold uppercase tracking-widest lg:text-xs">
              Back
            </span>
          </div>
        </button>

        <button
          type="button"
          className="flex flex-col items-center justify-center rounded-full px-10 py-3 text-white shadow-lg transition-all duration-200 hover:brightness-110 active:scale-90 lg:scale-110 lg:px-12 lg:py-4"
          style={{
            background:
              "linear-gradient(to right, var(--k-primary), var(--k-primary-container))",
          }}
          onClick={() =>
            navigate({ to: "/payment", search: { printCount, amount: total } })
          }
        >
          <div className="flex items-center gap-2">
            <span className="font-body text-[10px] font-bold uppercase tracking-widest lg:text-xs">
              LANJUTKAN
            </span>
            <span className="material-symbols-outlined text-xs font-bold lg:text-sm">
              arrow_forward_ios
            </span>
          </div>
        </button>
      </footer>
    </div>
  )
}
