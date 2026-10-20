import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import CategoryCelebration from './CategoryCelebration.tsx'
import './WinCelebration.css'

const SHUTTER_DURATION_MS = 300
const IMAGE_SWITCH_INTERVAL_MS = 100
const WIN_IMAGES = ['/img/win/1.png', '/img/win/2.png']
const WIN_AUDIO = '/voice/2.mp3'

function waitForAudio(audio: HTMLAudioElement, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      audio.removeEventListener('canplay', ready)
      audio.removeEventListener('error', failed)
      signal.removeEventListener('abort', aborted)
    }
    const ready = () => {
      cleanup()
      resolve()
    }
    const failed = () => {
      cleanup()
      reject(new Error('Win audio could not be loaded'))
    }
    const aborted = () => {
      cleanup()
      reject(new DOMException('Celebration cancelled', 'AbortError'))
    }

    if (signal.aborted) return aborted()
    if (audio.error) return failed()
    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return ready()
    audio.addEventListener('canplay', ready)
    audio.addEventListener('error', failed)
    signal.addEventListener('abort', aborted, { once: true })
  })
}

export default function WinCelebration({ onReplay }: { onReplay: () => void }) {
  const [phase, setPhase] = useState<'loading' | 'closing' | 'flashing' | 'finished'>('loading')
  const [imageIndex, setImageIndex] = useState(0)
  const [error, setError] = useState('')
  const [categoryNumber, setCategoryNumber] = useState<number | null>(null)
  const firstImageRef = useRef<HTMLImageElement>(null)
  const secondImageRef = useRef<HTMLImageElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedRef = useRef(false)
  const finishedRef = useRef(false)
  const activeRef = useRef(false)

  useEffect(() => {
    activeRef.current = true
    const controller = new AbortController()
    const audio = audioRef.current!

    // Decode both persistent image layers before the shutters start moving.
    void Promise.all([
      firstImageRef.current!.decode(),
      secondImageRef.current!.decode(),
      waitForAudio(audio, controller.signal),
    ]).then(() => {
      if (!controller.signal.aborted && !finishedRef.current) setPhase('closing')
    }).catch(() => {
      if (!controller.signal.aborted) {
        finishedRef.current = true
        setError('当選演出を読み込めませんでした。')
        setPhase('finished')
      }
    })

    return () => {
      activeRef.current = false
      controller.abort()
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      audio.pause()
    }
  }, [])

  function finishCelebration(message = '') {
    finishedRef.current = true
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    audioRef.current?.pause()
    setImageIndex(0)
    setPhase('finished')
    setError(message)
  }

  function finishWinAudio() {
    if (finishedRef.current || !startedRef.current) return
    // Stop the old interval before drawing the category exactly once.
    finishCelebration()
    setCategoryNumber(Math.floor(Math.random() * 6) + 1)
  }

  function startCelebration() {
    const audio = audioRef.current
    // Both animation events and repeated interaction may only start one run.
    if (startedRef.current || finishedRef.current || !audio) return
    startedRef.current = true
    setPhase('flashing')
    audio.currentTime = 0
    void audio.play().catch(() => {
      if (activeRef.current) finishCelebration('当選演出の音声を再生できませんでした。')
    })
  }

  function startImageSwitching() {
    if (!startedRef.current || finishedRef.current || intervalRef.current !== null) return
    // Start the clock when audio actually starts, rather than during buffering.
    intervalRef.current = setInterval(() => {
      setImageIndex((index) => (index + 1) % WIN_IMAGES.length)
    }, IMAGE_SWITCH_INTERVAL_MS)
  }

  const showImages = phase === 'flashing' || phase === 'finished'

  if (categoryNumber !== null) {
    return <CategoryCelebration key={categoryNumber} number={categoryNumber} onReplay={onReplay} />
  }

  return (
    <main
      className="startup-playback win-celebration"
      aria-label="当選結果"
      data-phase={phase}
      style={{ '--shutter-duration': `${SHUTTER_DURATION_MS}ms` } as CSSProperties}
    >
      {WIN_IMAGES.map((src, index) => (
        <img
          key={src}
          ref={index === 0 ? firstImageRef : secondImageRef}
          className="startup-playback__win-image win-celebration__image"
          src={src}
          alt="当選"
          style={{ visibility: showImages && imageIndex === index ? 'visible' : 'hidden' }}
        />
      ))}
      {phase === 'closing' && (
        <div className="win-celebration__shutters" aria-hidden="true">
          <div className="win-celebration__shutter win-celebration__shutter--left">
            <img src={WIN_IMAGES[0]} alt="" />
          </div>
          <div
            className="win-celebration__shutter win-celebration__shutter--right"
            onAnimationEnd={startCelebration}
          >
            <img src={WIN_IMAGES[0]} alt="" />
          </div>
        </div>
      )}
      <audio
        ref={audioRef}
        src={WIN_AUDIO}
        preload="auto"
        loop={false}
        onPlaying={startImageSwitching}
        onEnded={finishWinAudio}
        onError={() => finishCelebration('当選演出の音声を読み込めませんでした。')}
      />
      {error && <p className="win-celebration__error" role="alert">{error}</p>}
    </main>
  )
}
