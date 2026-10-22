import { useCallback, useEffect, useRef } from "react"

/** Single freewheel click (~50 ms), cut from the source loop. */
const SOUND_URL = "/audio/freewheel.mp3"

/** Minimum gap between plays so rapid scrub does not stack. */
const MIN_INTERVAL_MS = 45

/**
 * Play one short click while scrubbing.
 * Unlocks on first user gesture; respects prefers-reduced-motion.
 */
export function useFreewheelSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const unlockedRef = useRef(false)
  const lastTickRef = useRef(-1)
  const lastPlayAtRef = useRef(0)
  const reducedMotionRef = useRef(false)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    reducedMotionRef.current = mq.matches
    const onChange = () => {
      reducedMotionRef.current = mq.matches
    }
    mq.addEventListener("change", onChange)

    const audio = new Audio(SOUND_URL)
    audio.preload = "auto"
    audio.volume = 0.45
    audioRef.current = audio

    return () => {
      mq.removeEventListener("change", onChange)
      audio.pause()
      audioRef.current = null
    }
  }, [])

  const unlock = useCallback(() => {
    if (unlockedRef.current) return
    const audio = audioRef.current
    if (!audio) return
    unlockedRef.current = true
    void audio
      .play()
      .then(() => {
        audio.pause()
        audio.currentTime = 0
      })
      .catch(() => {
        unlockedRef.current = false
      })
  }, [])

  const reset = useCallback(() => {
    lastTickRef.current = -1
  }, [])

  /** Call while scrubbing with a discrete tick index (e.g. floor(progress * steps)). */
  const tick = useCallback(
    (tickIndex: number) => {
      if (reducedMotionRef.current) return
      if (document.hidden) return
      if (tickIndex === lastTickRef.current) return
      lastTickRef.current = tickIndex

      const now = performance.now()
      if (now - lastPlayAtRef.current < MIN_INTERVAL_MS) return
      lastPlayAtRef.current = now

      const audio = audioRef.current
      if (!audio) return
      unlock()
      audio.pause()
      audio.currentTime = 0
      void audio.play().catch(() => {})
    },
    [unlock],
  )

  return { tick, reset, unlock }
}
