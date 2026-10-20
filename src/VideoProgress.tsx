import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import './VideoProgress.css'

const FALLBACK_DURATION_SECONDS = 30

export default function VideoProgress({ videoRef }: {
  videoRef: RefObject<HTMLVideoElement | null>
}) {
  const [progress, setProgress] = useState({ value: 0, visible: false })

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let frame: number | null = null

    function cancelFrame() {
      if (frame !== null) cancelAnimationFrame(frame)
      frame = null
    }

    function getValue() {
      if (video!.ended) return 1
      const duration = Number.isFinite(video!.duration) && video!.duration > 0
        ? video!.duration
        : FALLBACK_DURATION_SECONDS
      return Math.max(0, Math.min(1, video!.currentTime / duration))
    }

    function hide() {
      cancelFrame()
      setProgress({ value: getValue(), visible: false })
    }

    function reset() {
      cancelFrame()
      setProgress({ value: 0, visible: false })
    }

    function update() {
      frame = null
      if (video!.paused || video!.ended) {
        hide()
        return
      }
      setProgress({ value: getValue(), visible: true })
      frame = requestAnimationFrame(update)
    }

    function start() {
      if (frame === null) update()
    }

    video.addEventListener('playing', start)
    video.addEventListener('pause', hide)
    video.addEventListener('ended', hide)
    video.addEventListener('emptied', reset)
    video.addEventListener('error', reset)
    if (!video.paused && !video.ended) start()

    return () => {
      cancelFrame()
      video.removeEventListener('playing', start)
      video.removeEventListener('pause', hide)
      video.removeEventListener('ended', hide)
      video.removeEventListener('emptied', reset)
      video.removeEventListener('error', reset)
    }
  }, [videoRef])

  return (
    <div
      className="video-progress"
      role="progressbar"
      aria-label="動画の再生状況"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress.value * 100)}
      hidden={!progress.visible}
    >
      <div className="video-progress__fill" style={{ transform: `scaleX(${progress.value})` }} />
    </div>
  )
}
