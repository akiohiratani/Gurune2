import { useEffect, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'
import WinResult from './WinResult.tsx'
import useCelebrationAudio from './useCelebrationAudio.ts'
import './CategoryCelebration.css'

const POP_DURATION_MS = 650
const SHAKE_DURATION_MS = 3000
const SHAKE_CYCLE_MS = 60
const SETTLE_DURATION_MS = 650
const FLOAT_DURATION_MS = 600
const FLOAT_DISTANCE_PX = 5
const CATEGORY_AUDIO = '/voice/1.mp3'

type Phase = 'loading' | 'pop' | 'shaking' | 'settling' | 'floating'
const TRANSITIONS = {
  loading: { next: 'pop', duration: 5000 },
  pop: { next: 'shaking', duration: POP_DURATION_MS + 100 },
  shaking: { next: 'settling', duration: SHAKE_DURATION_MS + 100 },
  settling: { next: 'floating', duration: SETTLE_DURATION_MS + 100 },
} as const

export default function CategoryCelebration({ number, audioRef, onReplay }: {
  number: number
  audioRef: RefObject<HTMLMediaElement | null>
  onReplay: () => void
}) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [imageFailed, setImageFailed] = useState(false)
  const audioFinished = useCelebrationAudio(audioRef, CATEGORY_AUDIO, phase !== 'loading', 8000)

  useEffect(() => {
    if (phase === 'floating') return
    const transition = TRANSITIONS[phase]
    const timer = setTimeout(() => setPhase(transition.next), transition.duration)
    return () => clearTimeout(timer)
  }, [phase])

  function showCategory() {
    setPhase((current) => current === 'loading' ? 'pop' : current)
  }

  return (
    <main
      className="startup-playback category-celebration"
      aria-label="カテゴリー結果"
      data-phase={phase}
      style={{
        '--pop-duration': POP_DURATION_MS + 'ms',
        '--shake-cycle': SHAKE_CYCLE_MS + 'ms',
        '--shake-iterations': SHAKE_DURATION_MS / SHAKE_CYCLE_MS,
        '--settle-duration': SETTLE_DURATION_MS + 'ms',
        '--float-duration': FLOAT_DURATION_MS + 'ms',
        '--float-distance': FLOAT_DISTANCE_PX + 'px',
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
            className="category-celebration__image"
            src={'/img/category/' + number + '.png'}
            alt={'カテゴリー' + number}
            onLoad={showCategory}
            onError={() => {
              setImageFailed(true)
              showCategory()
            }}
            hidden={imageFailed}
          />
          {imageFailed && <p className="category-celebration__fallback">カテゴリー{number}</p>}
        </div>
      </div>
      {phase === 'floating' && audioFinished && <WinResult onReplay={onReplay} />}
    </main>
  )
}
