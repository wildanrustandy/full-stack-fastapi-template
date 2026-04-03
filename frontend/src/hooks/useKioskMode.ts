import { useNavigate } from "@tanstack/react-router"
import { useCallback, useEffect, useRef, useState } from "react"

const DEFAULT_IDLE_TIMEOUT = 120_000 // 2 minutes

interface UseKioskModeOptions {
  idleTimeout?: number // ms, default 120000 (2 minutes)
  enableFullscreen?: boolean
  preventBackButton?: boolean // default true
}

export default function useKioskMode(options?: UseKioskModeOptions) {
  const {
    idleTimeout = DEFAULT_IDLE_TIMEOUT,
    enableFullscreen = false,
    preventBackButton = true,
  } = options ?? {}

  const navigate = useNavigate()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // --- Reset / navigate to landing ---
  const resetToLanding = useCallback(() => {
    sessionStorage.removeItem("pb_photos")
    navigate({ to: "/landing" })
  }, [navigate])

  // --- Idle timeout ---
  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      resetToLanding()
    }, idleTimeout)
  }, [idleTimeout, resetToLanding])

  useEffect(() => {
    const events = [
      "mousemove",
      "mousedown",
      "touchstart",
      "click",
      "keydown",
    ] as const

    const handler = () => {
      resetTimer()
    }

    for (const event of events) {
      window.addEventListener(event, handler)
    }

    // Start the initial timer
    resetTimer()

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      for (const event of events) {
        window.removeEventListener(event, handler)
      }
    }
  }, [resetTimer])

  // --- Back-button prevention ---
  useEffect(() => {
    if (!preventBackButton) return

    // Push a state so we have something to intercept
    window.history.pushState(null, "", window.location.href)

    const onPopState = () => {
      // Re-push to keep the user on the current page
      window.history.pushState(null, "", window.location.href)
    }

    window.addEventListener("popstate", onPopState)

    return () => {
      window.removeEventListener("popstate", onPopState)
    }
  }, [preventBackButton])

  // --- Fullscreen ---
  useEffect(() => {
    if (!enableFullscreen) return

    const requestFs = () => {
      const el = document.documentElement as HTMLElement & {
        requestFullscreen?: () => Promise<void>
        webkitRequestFullscreen?: () => Promise<void>
        msRequestFullscreen?: () => Promise<void>
      }

      if (typeof el.requestFullscreen === "function") {
        el.requestFullscreen()
          .then(() => setIsFullscreen(true))
          .catch(() => {
            // Fullscreen request denied or unavailable
          })
      } else if (typeof el.webkitRequestFullscreen === "function") {
        el.webkitRequestFullscreen()
        setIsFullscreen(true)
      } else if (typeof el.msRequestFullscreen === "function") {
        el.msRequestFullscreen()
        setIsFullscreen(true)
      }
    }

    requestFs()

    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", onFullscreenChange)

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange)
    }
  }, [enableFullscreen])

  return { resetToLanding, isFullscreen }
}
