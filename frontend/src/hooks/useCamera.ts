import { useRef, useState, useCallback, useEffect } from "react"

interface UseCameraOptions {
  width?: number
  height?: number
  facingMode?: string
  captureFormat?: "image/jpeg" | "image/png"
  captureQuality?: number
}

const useCamera = (options: UseCameraOptions = {}) => {
  const {
    width = 1280,
    height = 720,
    facingMode = "user",
    captureFormat = "image/jpeg",
    captureQuality = 0.9,
  } = options

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photos, setPhotos] = useState<string[]>([])

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: width }, height: { ideal: height }, facingMode },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setIsReady(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Camera access denied"
      setError(message)
      setIsReady(false)
    }
  }, [width, height, facingMode])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsReady(false)
  }, [])

  const capturePhoto = useCallback((): string | null => {
    if (!videoRef.current || !isReady) return null

    const canvas = document.createElement("canvas")
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    // Mirror horizontally for front-facing camera
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(videoRef.current, 0, 0)
    const dataUrl = canvas.toDataURL(captureFormat, captureQuality)
    return dataUrl
  }, [isReady, facingMode, captureFormat, captureQuality])

  const takePhoto = useCallback(() => {
    const photo = capturePhoto()
    if (photo) {
      setPhotos((prev) => [...prev, photo])
    }
    return photo
  }, [capturePhoto])

  const clearPhotos = useCallback(() => {
    setPhotos([])
  }, [])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  return {
    videoRef,
    isReady,
    error,
    photos,
    startCamera,
    stopCamera,
    takePhoto,
    clearPhotos,
    setPhotos,
  }
}

export default useCamera
