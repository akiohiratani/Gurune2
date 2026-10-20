import { useEffect, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'
import CategoryCelebration from './CategoryCelebration.tsx'
import useCelebrationAudio from './useCelebrationAudio.ts'
import './WinCelebration.css'

const SHUTTER_DURATION_MS = 300
const IMAGE_SWITCH_INTERVAL_MS = 100
const WIN_IMAGES = ['/img/win/1.png', '/img/win/2.png']
const WIN_AUDIO = '/voice/2.mp3'

export default function WinCelebration({ audioRef, onReplay }: {
  audioRef: RefObject<HTMLAudioElement | null>
  onReplay: () => void
}) {
  const [phase, setPhase] = useState<'closing' | 'flashing'>('closing')
  const [imageIndex, setImageIndex] = useState(0)
  const [categoryNumber] = useState(() => Math.floor(Math.random() * 6) + 1)
  const audioFinished = useCelebrationAudio(audioRef, WIN_AUDIO, phase === 'flashing', 5000)

  useEffect(() => {
    if (phase !== 'closing') return
    // Animation events may be skipped when Safari suspends or disables animations.
    const timer = setTimeout(() => setPhase('flashing'), SHUTTER_DURATION_MS + 100)
    return () => clearTimeout(timer)
  }, [phase])

  useEffect(() => {
    if (phase !== 'flashing' || audioFinished) return
    const interval = setInterval(() => {
      setImageIndex((index) => (index + 1) % WIN_IMAGES.length)
    }, IMAGE_SWITCH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [phase, audioFinished])

  if (audioFinished) {
    return <CategoryCelebration number={categoryNumber} audioRef={audioRef} onReplay={onReplay} />
  }

  return (
    <main
      className="startup-playback win-celebration"
      aria-label="当選結果"
      data-phase={phase}
      style={{ '--shutter-duration': SHUTTER_DURATION_MS + 'ms' } as CSSProperties}
    >
      <p className="win-celebration__status" role="status">当選！</p>
      {WIN_IMAGES.map((src, index) => (
        <img
          key={src}
          className="startup-playback__win-image win-celebration__image"
          src={src}
          alt="当選"
          style={{ visibility: phase === 'flashing' && imageIndex === index ? 'visible' : 'hidden' }}
        />
      ))}
      {phase === 'closing' && (
        <div className="win-celebration__shutters" aria-hidden="true">
          <div className="win-celebration__shutter win-celebration__shutter--left">
            <img src={WIN_IMAGES[0]} alt="" />
          </div>
          <div
            className="win-celebration__shutter win-celebration__shutter--right"
            onAnimationEnd={() => setPhase('flashing')}
          >
            <img src={WIN_IMAGES[0]} alt="" />
          </div>
        </div>
      )}
    </main>
  )
}
