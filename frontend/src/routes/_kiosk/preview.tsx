import { useState, useEffect } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import ProgressIndicator from "@/components/Kiosk/ProgressIndicator"
import BoothNameHeader from "@/components/Kiosk/BoothNameHeader"
import { createPhotoStrip, downloadStrip } from "@/utils/photoStrip"

export const Route = createFileRoute("/_kiosk/preview")({
  component: PreviewPage,
})

function PreviewPage() {
  const navigate = useNavigate()
  const photosJson = sessionStorage.getItem("pb_photos")
  const photos: string[] = photosJson ? JSON.parse(photosJson) : []
  const [showFinishModal, setShowFinishModal] = useState(false)
  const [stripUrl, setStripUrl] = useState<string | null>(null)

  // Generate the photo strip on mount
  useEffect(() => {
    if (photos.length > 0) {
      createPhotoStrip(photos).then(setStripUrl).catch(console.error)
    }
  }, [photos])

  // Auto-close timer
  const [autoCloseTimer, setAutoCloseTimer] = useState(120)

  useEffect(() => {
    const timer = setInterval(() => {
      setAutoCloseTimer((prev) => {
        if (prev <= 1) {
          navigate({ to: "/landing" })
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [navigate])

  const handleDownload = () => {
    if (stripUrl) {
      downloadStrip(stripUrl)
    }
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden" style={{ background: "var(--k-surface)", color: "var(--k-on-surface)" }}>
      {/* Header */}
      <header className="flex flex-none items-center justify-between px-6 py-4 backdrop-blur-sm lg:px-8" style={{ background: "rgba(255,255,255,0.5)" }}>
        <BoothNameHeader />
        <ProgressIndicator currentStep={4} />
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center overflow-y-auto px-6 py-4">
        <h1 className="font-headline mb-6 text-center text-4xl font-black">Preview Foto</h1>

        <div className="grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {/* Raw Cuts */}
          <div className="order-2 md:order-1">
            <h3 className="font-headline mb-3 text-center text-sm font-bold" style={{ color: "var(--k-on-surface-variant)" }}>Raw Cuts</h3>
            <div className="grid grid-cols-2 gap-2">
              {photos.map((photo, i) => (
                <div key={i} className="aspect-square overflow-hidden rounded-lg border-2 border-white shadow-md">
                  <img src={photo} alt={`Raw ${i + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* Photo Strip Preview */}
          <div className="order-1 flex flex-col items-center md:order-2">
            <h3 className="font-headline mb-3 text-center text-sm font-bold" style={{ color: "var(--k-on-surface-variant)" }}>Photo Strip</h3>
            <div className="w-48 overflow-hidden rounded-xl border-4 border-white shadow-xl">
              {stripUrl ? (
                <img src={stripUrl} alt="Photo Strip" className="w-full object-contain" />
              ) : (
                <div className="flex flex-col">
                  {photos.map((photo, i) => (
                    <img key={i} src={photo} alt={`Strip ${i + 1}`} className="aspect-square w-full object-cover" />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="order-3 flex flex-col gap-4">
            <h3 className="font-headline mb-3 text-center text-sm font-bold" style={{ color: "var(--k-on-surface-variant)" }}>Aksi</h3>

            <button
              className="flex items-center justify-center gap-2 rounded-full px-6 py-3 font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: "var(--k-primary)" }}
              onClick={() => window.print()}
            >
              <span className="material-symbols-outlined">print</span>
              Cetak Foto
            </button>

            <button
              className="flex items-center justify-center gap-2 rounded-full border-2 px-6 py-3 font-bold transition-all hover:scale-[1.02] active:scale-95"
              style={{ borderColor: "var(--k-outline-variant)", color: "var(--k-on-surface-variant)" }}
              onClick={handleDownload}
            >
              <span className="material-symbols-outlined">download</span>
              Download Strip
            </button>

            <button
              className="flex items-center justify-center gap-2 rounded-full border-2 px-6 py-3 font-bold transition-all hover:scale-[1.02] active:scale-95"
              style={{ borderColor: "var(--k-outline-variant)", color: "var(--k-on-surface-variant)" }}
              onClick={() => navigate({ to: "/photo-session" })}
            >
              <span className="material-symbols-outlined">refresh</span>
              Ambil Ulang
            </button>

            <div className="mt-4 text-center">
              <p className="text-xs" style={{ color: "var(--k-on-surface-variant)" }}>
                Auto-close dalam {autoCloseTimer} detik
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex flex-none items-center justify-around rounded-t-[2rem] px-10 py-6 shadow-[0_-20px_40px_rgba(36,48,54,0.06)] backdrop-blur-xl lg:rounded-t-[3rem]" style={{ background: "rgba(255,255,255,0.6)" }}>
        <button
          className="flex items-center justify-center gap-2 rounded-full px-10 py-3 font-bold text-white shadow-lg transition-all hover:brightness-110 active:scale-95"
          style={{ background: "linear-gradient(to right, var(--k-primary), var(--k-primary-container))" }}
          onClick={() => setShowFinishModal(true)}
        >
          <span className="material-symbols-outlined">check_circle</span>
          <span className="font-body text-xs font-bold uppercase tracking-widest">SELESAI</span>
        </button>
      </footer>

      {/* Finish Modal */}
      {showFinishModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-6 max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500">
              <span className="material-symbols-outlined text-3xl text-white">check</span>
            </div>
            <h3 className="font-headline mb-2 text-xl font-bold">Sesi Selesai!</h3>
            <p className="mb-6 text-sm" style={{ color: "var(--k-on-surface-variant)" }}>
              Terima kasih telah menggunakan photobooth. Kembali ke halaman utama?
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 rounded-full border-2 py-3 font-bold transition-all active:scale-95"
                style={{ borderColor: "var(--k-outline-variant)", color: "var(--k-on-surface-variant)" }}
                onClick={() => setShowFinishModal(false)}
              >
                Batal
              </button>
              <button
                className="flex-1 rounded-full py-3 font-bold text-white transition-all active:scale-95"
                style={{ background: "linear-gradient(to right, var(--k-primary), var(--k-primary-container))" }}
                onClick={() => navigate({ to: "/landing" })}
              >
                Ya, Kembali
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
