import { useState, useEffect, useCallback, useRef } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import useCamera from "@/hooks/useCamera"
import ProgressIndicator from "@/components/Kiosk/ProgressIndicator"
import BoothNameHeader from "@/components/Kiosk/BoothNameHeader"
import FilterSelector from "@/components/Kiosk/FilterSelector"

export const Route = createFileRoute("/_kiosk/photo-session")({
  component: PhotoSession,
})

const TOTAL_PHOTOS = 4
const DEFAULT_TIMER = 5

const FILTERS: Record<string, string> = {
  Normal: "",
  Lembut: "brightness(1.05) contrast(0.95) saturate(0.9)",
  "Hitam-Putih": "grayscale(100%)",
  BW2: "grayscale(100%) contrast(1.2)",
  BW3: "grayscale(100%) brightness(1.1) contrast(1.3)",
  Vintage: "sepia(40%) contrast(1.1) brightness(1.05)",
  Bright: "brightness(1.15) contrast(1.05)",
}

interface Photo {
  id: string
  url: string
  order: number
}

function PhotoSession() {
  const navigate = useNavigate()
  const { videoRef, isReady, startCamera, takePhoto, stopCamera } = useCamera()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [selectedFilter, setSelectedFilter] = useState("Normal")
  const [timer, setTimer] = useState(DEFAULT_TIMER)
  const [isCapturing, setIsCapturing] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [showCountdown, setShowCountdown] = useState(false)
  const [countdownValue, setCountdownValue] = useState(0)
  const [showRetakeModal, setShowRetakeModal] = useState(false)
  const [retakePhotoIndex, setRetakePhotoIndex] = useState<number | null>(null)
  const [showRetakeAllModal, setShowRetakeAllModal] = useState(false)
  const capturingRef = useRef(false)

  useEffect(() => {
    startCamera()
    return () => { stopCamera() }
  }, [startCamera, stopCamera])

  const photosTaken = photos.length
  const allPhotosTaken = photosTaken >= TOTAL_PHOTOS

  const playShutterSound = useCallback(() => {
    const audio = new Audio("/sounds/shutter.mp3")
    audio.currentTime = 0
    audio.play().catch(() => {})
  }, [])

  const captureCurrentPhoto = useCallback(async (order: number): Promise<boolean> => {
    const url = takePhoto()
    if (url) {
      playShutterSound()
      setPhotos((prev) => [...prev.filter((p) => p.order !== order), { id: `photo-${Date.now()}`, url, order }])
      return true
    }
    return false
  }, [takePhoto, playShutterSound])

  const startCountdown = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      setShowCountdown(true)
      setCountdownValue(timer)
      let current = timer
      const interval = setInterval(() => {
        current--
        setCountdownValue(current)
        if (current <= 0) {
          clearInterval(interval)
          setShowCountdown(false)
          resolve()
        }
      }, 1000)
    })
  }, [timer])

  const startPhotoSession = useCallback(async () => {
    if (capturingRef.current) return
    capturingRef.current = true
    setIsCapturing(true)
    setPhotos([])

    for (let i = 0; i < TOTAL_PHOTOS; i++) {
      setCurrentPhotoIndex(i)
      await startCountdown()
      await captureCurrentPhoto(i + 1)
    }

    setIsCapturing(false)
    capturingRef.current = false
  }, [startCountdown, captureCurrentPhoto])

  const retakePhoto = useCallback(async (order: number) => {
    setShowRetakeModal(false)
    await startCountdown()
    await captureCurrentPhoto(order)
  }, [startCountdown, captureCurrentPhoto])

  const handleNext = useCallback(() => {
    if (allPhotosTaken) {
      stopCamera()
      sessionStorage.setItem("pb_photos", JSON.stringify(photos.map((p) => p.url)))
      navigate({ to: "/preview" })
    }
  }, [allPhotosTaken, photos, navigate, stopCamera])

  const getPhotoByOrder = (order: number) => photos.find((p) => p.order === order)

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden" style={{ background: "var(--k-surface)", color: "var(--k-on-surface)" }}>
      {/* Header */}
      <header className="flex flex-none items-center justify-between px-6 py-4 backdrop-blur-sm lg:px-8" style={{ background: "rgba(255,255,255,0.5)" }}>
        <BoothNameHeader />
        <ProgressIndicator currentStep={3} />
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-y-auto w-full">
        <h1 className="font-headline py-6 text-center text-4xl font-black">
          {allPhotosTaken ? "Foto Selesai!" : "Sesi Foto"}
        </h1>

        <div className="flex flex-1 min-h-0 w-full max-w-5xl mx-auto flex-col lg:flex-row gap-6 items-start px-6">
          {/* Camera Preview */}
          <div className="flex flex-1 min-h-0 w-full flex-col">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border-4 border-white shadow-xl" style={{ background: "var(--k-surface-container)" }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full -scale-x-100 object-cover"
                style={{ filter: FILTERS[selectedFilter] || "" }}
              />

              {!isReady && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: "var(--k-surface-container)" }}>
                  <span className="material-symbols-outlined animate-pulse text-6xl" style={{ color: "var(--k-primary)" }}>photo_camera</span>
                </div>
              )}

              {/* Timer Selection */}
              <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2">
                <div className="flex items-center gap-1 rounded-full bg-white/90 px-2 py-2 shadow-lg backdrop-blur-md">
                  <span className="material-symbols-outlined ml-2 mr-1 text-lg" style={{ color: "var(--k-primary)" }}>timer</span>
                  {[3, 5, 10].map((t) => (
                    <button
                      key={t}
                      disabled={isCapturing}
                      onClick={() => setTimer(t)}
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                        timer === t ? "text-white" : "hover:bg-black/5"
                      }`}
                      style={{ background: timer === t ? "var(--k-primary)" : "transparent", color: timer === t ? "white" : "var(--k-on-surface)" }}
                    >
                      {t}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Countdown Overlay */}
              {showCountdown && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
                  <div className="text-center">
                    <span className="font-headline text-[8rem] font-black leading-none text-white drop-shadow-2xl">
                      {countdownValue}
                    </span>
                    <p className="mt-4 text-xl font-bold text-white/80">Foto {currentPhotoIndex + 1}/4</p>
                  </div>
                </div>
              )}

              {/* Capturing indicator */}
              {isCapturing && !showCountdown && (
                <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
                  <div className="rounded-full bg-white/90 px-6 py-2 shadow-lg backdrop-blur-md">
                    <span className="font-headline font-bold" style={{ color: "var(--k-primary)" }}>
                      Memotret {currentPhotoIndex + 1}/4...
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Filter Selection */}
            <div className="mt-6">
              <p className="mb-3 text-center text-sm font-bold" style={{ color: "rgba(36,48,54,0.6)" }}>Pilih Filter</p>
              <FilterSelector selectedFilter={selectedFilter} onSelect={setSelectedFilter} disabled={isCapturing} />
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex justify-center gap-4">
              {!isCapturing && !allPhotosTaken && (
                <button
                  className="flex items-center justify-center gap-3 rounded-full px-16 py-5 text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                  style={{ background: "var(--k-primary)" }}
                  onClick={startPhotoSession}
                >
                  <span className="material-symbols-outlined text-2xl">photo_camera</span>
                  <span className="font-headline text-xl font-extrabold">Mulai Foto</span>
                </button>
              )}

              {allPhotosTaken && (
                <button
                  className="flex items-center justify-center gap-3 rounded-full px-16 py-5 text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                  style={{ background: "linear-gradient(to right, var(--k-primary), var(--k-primary-container))" }}
                  onClick={handleNext}
                >
                  <span className="font-headline text-xl font-extrabold">Berikutnya</span>
                  <span className="material-symbols-outlined text-2xl">arrow_forward</span>
                </button>
              )}
            </div>
          </div>

          {/* Photo Preview Grid */}
          <div className="w-full shrink-0 flex flex-col lg:w-80">
            <div className="rounded-2xl p-6 shadow-lg" style={{ background: "var(--k-surface-container-low)" }}>
              <h3 className="font-headline mb-4 text-center font-bold">Preview</h3>

              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((order) => {
                  const photo = getPhotoByOrder(order)
                  const taken = !!photo
                  return (
                    <div
                      key={order}
                      className={`group relative aspect-square cursor-pointer overflow-hidden rounded-xl border-4 transition-all ${
                        taken ? "border-white shadow-md hover:border-[var(--k-primary)]" : "bg-[var(--k-surface-container)]"
                      }`}
                      style={{ borderColor: taken ? "white" : "rgba(196,198,207,0.2)" }}
                      onClick={() => taken && setRetakePhotoIndex(order) || taken && setShowRetakeModal(true)}
                    >
                      {photo ? (
                        <>
                          <img src={photo.url} alt={`Photo ${order}`} className="h-full w-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
                            <span className="material-symbols-outlined text-2xl text-white">refresh</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <span className="font-headline text-3xl font-black" style={{ color: "rgba(82,96,104,0.3)" }}>{order}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 text-center">
                <p className="text-sm" style={{ color: "var(--k-on-surface-variant)" }}>
                  {photosTaken}/4 foto selesai
                </p>
              </div>

              {allPhotosTaken && (
                <button
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border-2 py-3 font-bold transition-all hover:bg-[var(--k-surface-container)]"
                  style={{ borderColor: "var(--k-outline-variant)", color: "var(--k-on-surface-variant)" }}
                  onClick={() => setShowRetakeAllModal(true)}
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                  Ulangi Semua
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Retake Modal */}
      {showRetakeModal && retakePhotoIndex && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-6 max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "var(--k-surface-container)" }}>
              <span className="material-symbols-outlined text-3xl" style={{ color: "var(--k-primary)" }}>refresh</span>
            </div>
            <h3 className="font-headline mb-2 text-xl font-bold">Ambil Ulang Foto?</h3>
            <p className="mb-6 text-sm" style={{ color: "var(--k-on-surface-variant)" }}>
              Foto #{retakePhotoIndex} akan diambil ulang dengan countdown timer.
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 rounded-full border-2 py-3 font-bold transition-all active:scale-95"
                style={{ borderColor: "var(--k-outline-variant)", color: "var(--k-on-surface-variant)" }}
                onClick={() => setShowRetakeModal(false)}
              >
                Batal
              </button>
              <button
                className="flex-1 rounded-full py-3 font-bold text-white transition-all active:scale-95"
                style={{ background: "var(--k-primary)" }}
                onClick={() => retakePhoto(retakePhotoIndex)}
              >
                Ambil Ulang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Retake All Modal */}
      {showRetakeAllModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-6 max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "var(--k-error-container)" }}>
              <span className="material-symbols-outlined text-3xl" style={{ color: "var(--k-error)" }}>delete</span>
            </div>
            <h3 className="font-headline mb-2 text-xl font-bold">Ulangi Semua Foto?</h3>
            <p className="mb-6 text-sm" style={{ color: "var(--k-on-surface-variant)" }}>
              Semua foto akan dihapus dan diambil ulang dari awal.
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 rounded-full border-2 py-3 font-bold transition-all active:scale-95"
                style={{ borderColor: "var(--k-outline-variant)", color: "var(--k-on-surface-variant)" }}
                onClick={() => setShowRetakeAllModal(false)}
              >
                Batal
              </button>
              <button
                className="flex-1 rounded-full py-3 font-bold text-white transition-all active:scale-95"
                style={{ background: "var(--k-error)" }}
                onClick={() => {
                  setShowRetakeAllModal(false)
                  startPhotoSession()
                }}
              >
                Ulangi Semua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
