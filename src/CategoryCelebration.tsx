import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import WinResult from './WinResult.tsx'
import './CategoryCelebration.css'

const POP_DURATION_MS = 650
const SHAKE_DURATION_MS = 3000
const SHAKE_CYCLE_MS = 60
const SETTLE_DURATION_MS = 650
const FLOAT_DURATION_MS = 600
const FLOAT_DISTANCE_PX = 5
const CATEGORY_AUDIO = '/voice/1.mp3'

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
      reject(new Error('Category audio could not be loaded'))
    }
    const aborted = () => {
      cleanup()
      reject(new DOMException('Category celebration cancelled', 'AbortError'))
    }

    if (signal.aborted) return aborted()
    if (audio.error) return failed()
    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return ready()
    audio.addEventListener('canplay', ready)
    audio.addEventListener('error', failed)
    signal.addEventListener('abort', aborted, { once: true })
  })
}

export default function CategoryCelebration({ number, onReplay }: {
  number: number
  onReplay: () => void
}) {
  const [phase, setPhase] = useState<'loading' | 'pop' | 'shaking' | 'settling' | 'floating'>('loading')
  const [error, setError] = useState('')
  const [audioFinished, setAudioFinished] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    const audio = audioRef.current!

    // Wait for the selected image and sound so the pop and audio start together.
    void Promise.all([
      imageRef.current!.decode(),
      waitForAudio(audio, controller.signal),
    ]).then(() => {
      if (controller.signal.aborted || startedRef.current) return
      startedRef.current = true
      setPhase('pop')
      if (audio.currentTime !== 0) audio.currentTime = 0
      return audio.play()
    }).catch(() => {
      if (!controller.signal.aborted) {
        setAudioFinished(true)
        setError('カテゴリー演出の画像または音声を再生できませんでした。')
        setPhase((current) => current === 'loading' ? 'pop' : current)
      }
    })

    return () => {
      controller.abort()
      audio.pause()
    }
  }, [])

  return (
    <main
      className="startup-playback category-celebration"
      aria-label="カテゴリー結果"
      data-phase={phase}
      style={{
        '--pop-duration': `${POP_DURATION_MS}ms`,
        '--shake-cycle': `${SHAKE_CYCLE_MS}ms`,
        '--shake-iterations': SHAKE_DURATION_MS / SHAKE_CYCLE_MS,
        '--settle-duration': `${SETTLE_DURATION_MS}ms`,
        '--float-duration': `${FLOAT_DURATION_MS}ms`,
        '--float-distance': `${FLOAT_DISTANCE_PX}px`,
      } as CSSProperties}
    >
      {phase === 'loading' && (
        <img className="startup-playback__win-image" src="/img/win/1.png" alt="当選" />
      )}
      <div
        className="category-celebration__pop"
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget && event.animationName === 'category-pop') {
            setPhase((current) => current === 'pop' ? 'shaking' : current)
          }
          if (event.target === event.currentTarget && event.animationName === 'category-settle') {
            setPhase((current) => current === 'settling' ? 'floating' : current)
          }
        }}
      >
        <div
          className="category-celebration__float"
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget && event.animationName === 'category-shake') {
              setPhase((current) => current === 'shaking' ? 'settling' : current)
            }
          }}
        >
          <img
            ref={imageRef}
            className="category-celebration__image"
            src={`/img/category/${number}.png`}
            alt={`カテゴリー${number}`}
          />
        </div>
      </div>
      <audio
        ref={audioRef}
        src={CATEGORY_AUDIO}
        preload="auto"
        loop={false}
        onEnded={() => setAudioFinished(true)}
        onError={() => setAudioFinished(true)}
      />
      {phase === 'floating' && audioFinished && <WinResult onReplay={onReplay} />}
      {error && <p className="category-celebration__error" role="alert">{error}</p>}
    </main>
  )
}
