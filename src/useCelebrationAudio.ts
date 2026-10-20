import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

// Audio must never prevent the visual sequence from reaching the result.
export default function useCelebrationAudio(
  audioRef: RefObject<HTMLMediaElement | null>,
  src: string,
  active: boolean,
  fallbackDurationMs: number,
) {
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    if (!active) return
    const audio = audioRef.current
    let cancelled = false
    let completed = false
    let timer: ReturnType<typeof setTimeout>

    function finish() {
      if (cancelled || completed) return
      completed = true
      clearTimeout(timer)
      removeListeners()
      audio?.pause()
      setFinished(true)
    }

    function schedule(durationMs: number) {
      clearTimeout(timer)
      timer = setTimeout(finish, durationMs)
    }

    function playing() {
      if (!audio || cancelled || completed) return
      const remaining = (audio.duration - audio.currentTime) * 1000
      schedule(Number.isFinite(remaining) && remaining > 0
        ? Math.min(remaining + 1000, 30_000)
        : fallbackDurationMs)
    }

    function unavailable() {
      if (!cancelled && !completed) schedule(fallbackDurationMs)
    }

    function removeListeners() {
      audio?.removeEventListener('playing', playing)
      audio?.removeEventListener('ended', finish)
      audio?.removeEventListener('error', unavailable)
    }

    // This also covers stalled requests and play() promises that never settle.
    schedule(fallbackDurationMs + 5000)
    if (audio) {
      audio.addEventListener('playing', playing)
      audio.addEventListener('ended', finish)
      audio.addEventListener('error', unavailable)
      try {
        // The movie player also supports audio-only sources; preserve its tap permission.
        audio.src = src
        audio.load()
        void audio.play().catch(unavailable)
      } catch {
        unavailable()
      }
    } else {
      unavailable()
    }

    return () => {
      cancelled = true
      clearTimeout(timer)
      removeListeners()
      audio?.pause()
    }
  }, [audioRef, src, active, fallbackDurationMs])

  return finished
}
