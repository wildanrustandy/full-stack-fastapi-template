export default function BoothNameHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <span className="material-symbols-outlined text-3xl" style={{ color: "var(--k-primary)" }}>
          photo_camera
        </span>
        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="font-headline text-lg font-extrabold tracking-tight" style={{ color: "var(--k-primary)" }}>
            Photobooth
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest text-white"
            style={{ background: "linear-gradient(135deg, var(--k-primary), var(--k-primary-container))" }}
          >
            Premium
          </span>
        </div>
        <p className="text-xs font-medium" style={{ color: "var(--k-on-surface-variant)" }}>
          Booth #1 • Lobby Utama
        </p>
      </div>
    </div>
  )
}
