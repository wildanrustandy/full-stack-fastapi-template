interface CountdownTimerProps {
  formattedTime: string
  isWarning: boolean
}

export default function CountdownTimer({
  formattedTime,
  isWarning,
}: CountdownTimerProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="font-label text-xs font-bold uppercase tracking-widest text-[var(--k-on-surface-variant)]">
        Sisa Waktu
      </span>
      <div
        className={`flex items-center gap-2 rounded-2xl px-6 py-3 ${
          isWarning ? "animate-pulse" : ""
        }`}
        style={{
          background: isWarning
            ? "var(--k-error-container)"
            : "var(--k-surface-container-lowest)",
          color: isWarning ? "var(--k-error)" : "var(--k-primary)",
        }}
      >
        <span className="material-symbols-outlined text-xl">timer</span>
        <span className="font-headline text-2xl font-black tracking-tight">
          {formattedTime}
        </span>
      </div>
    </div>
  )
}
