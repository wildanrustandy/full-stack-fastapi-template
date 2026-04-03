interface QRDisplayProps {
  qrCodeUrl: string | null
  isLoading?: boolean
  error?: string | null
  isDemo?: boolean
  onRetry?: () => void
}

export default function QRDisplay({ qrCodeUrl, isLoading, error, isDemo, onRetry }: QRDisplayProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl bg-white p-2 shadow-lg">
      <div className="relative flex flex-1 flex-col items-center justify-center rounded-xl border-4 border-white p-4">
        <div className="relative flex h-full w-full items-center justify-center rounded-lg p-4">
          {/* Loading State */}
          {isLoading && (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-lg" style={{ background: "var(--k-surface-container)" }}>
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--k-primary)]/30 border-t-[var(--k-primary)]" />
              <span className="text-sm font-medium text-[var(--k-on-surface-variant)]">Memuat QRIS...</span>
            </div>
          )}

          {/* Error State */}
          {error && !qrCodeUrl && (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-lg p-4" style={{ background: "var(--k-error-container)/10" }}>
              <span className="material-symbols-outlined text-5xl" style={{ color: "var(--k-error)" }}>error</span>
              <span className="text-center text-sm font-medium" style={{ color: "var(--k-error)" }}>{error}</span>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
                  style={{ background: "var(--k-primary)" }}
                >
                  Coba Lagi
                </button>
              )}
            </div>
          )}

          {/* Demo Mode */}
          {isDemo && !qrCodeUrl && !isLoading && (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-lg p-4" style={{ background: "var(--k-tertiary-container)/20" }}>
              <span className="material-symbols-outlined text-5xl" style={{ color: "var(--k-tertiary)" }}>qr_code_2</span>
              <span className="text-sm font-medium" style={{ color: "var(--k-tertiary)" }}>Mode Demo</span>
              <span className="text-center text-xs text-[var(--k-on-surface-variant)]">QRIS tidak tersedia di mode demo</span>
            </div>
          )}

          {/* QR Code Image */}
          {qrCodeUrl && (
            <>
              <img src={qrCodeUrl} alt="QRIS Code" className="h-full w-full object-contain" />
              <div className="absolute left-0 top-0 h-1 w-full rounded-full" style={{ background: "var(--k-primary)", boxShadow: "0 0 15px rgba(167,41,90,0.5)" }} />
            </>
          )}

          {/* Corner brackets */}
          <div className="absolute left-4 top-4 h-12 w-12 rounded-tl-lg border-t-4 border-l-4" style={{ borderColor: "var(--k-primary)" }} />
          <div className="absolute right-4 top-4 h-12 w-12 rounded-tr-lg border-t-4 border-r-4" style={{ borderColor: "var(--k-primary)" }} />
          <div className="absolute bottom-4 left-4 h-12 w-12 rounded-bl-lg border-b-4 border-l-4" style={{ borderColor: "var(--k-primary)" }} />
          <div className="absolute bottom-4 right-4 h-12 w-12 rounded-br-lg border-b-4 border-r-4" style={{ borderColor: "var(--k-primary)" }} />
        </div>
      </div>

      {/* QRIS / GPN labels */}
      <div className="mb-2 mt-3 flex items-center gap-4">
        <span className="font-headline text-xs font-extrabold uppercase tracking-widest text-[var(--k-on-surface-variant)]">
          QRIS
        </span>
        <div className="h-6 w-px" style={{ background: "var(--k-outline-variant)" }} />
        <span className="font-headline text-xs font-extrabold uppercase tracking-widest text-[var(--k-on-surface-variant)]">
          GPN
        </span>
      </div>
    </div>
  )
}
