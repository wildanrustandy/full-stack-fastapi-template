interface ProgressIndicatorProps {
  currentStep: number
}

const steps = ["Pilih Jumlah", "Pembayaran", "Sesi Foto", "Cetak"]

export default function ProgressIndicator({
  currentStep,
}: ProgressIndicatorProps) {
  return (
    <div className="flex items-center gap-1">
      {steps.map((label, i) => {
        const step = i + 1
        const isActive = step === currentStep
        const isCompleted = step < currentStep

        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  isActive
                    ? "scale-110 text-white shadow-md"
                    : isCompleted
                      ? "text-white"
                      : "text-[var(--k-on-surface-variant)]"
                }`}
                style={{
                  backgroundColor:
                    isActive || isCompleted
                      ? "var(--k-primary)"
                      : "var(--k-surface-container)",
                }}
              >
                {isCompleted ? (
                  <span className="material-symbols-outlined text-sm">
                    check
                  </span>
                ) : (
                  step
                )}
              </div>
              <span
                className={`mt-1 text-[10px] font-bold tracking-wide ${
                  isActive
                    ? "text-[var(--k-primary)]"
                    : "text-[var(--k-on-surface-variant)]/60"
                }`}
              >
                {label}
              </span>
            </div>
            {step < steps.length && (
              <span className="material-symbols-outlined mx-1 text-sm text-[var(--k-outline-variant)]">
                chevron_right
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
