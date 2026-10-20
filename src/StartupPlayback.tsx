import { useEffect, useRef, useState } from 'react'
import MissResult from './MissResult.tsx'
import WinCelebration from './WinCelebration.tsx'
import VideoProgress from './VideoProgress.tsx'
import './StartupPlayback.css'

const MIN_WIN_START_SECONDS = 5
const MAX_WIN_START_SECONDS = 30

function waitUntilReady(media: HTMLMediaElement, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      media.removeEventListener('canplay', ready)
      media.removeEventListener('error', failed)
      signal.removeEventListener('abort', aborted)
    }
    const ready = () => {
      cleanup()
      resolve()
    }
    const failed = () => {
      cleanup()
      reject(new Error('Media could not be loaded'))
    }
    const aborted = () => {
      cleanup()
      reject(new DOMException('Playback cancelled', 'AbortError'))
    }

    if (signal.aborted) return aborted()
    if (media.error) return failed()
    if (media.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return ready()

    media.addEventListener('canplay', ready)
    media.addEventListener('error', failed)
    signal.addEventListener('abort', aborted, { once: true })
  })
}

export default function StartupPlayback() {
  const [phase, setPhase] = useState<'idle' | 'playing' | 'won' | 'complete'>('idle')
  const [winProbability, setWinProbability] = useState(50)
  const [error, setError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const attemptRef = useRef<AbortController | null>(null)
  const hasWonRef = useRef(false)
  const winStartSecondRef = useRef<number | null>(null)
  const winStartedRef = useRef(false)

  useEffect(() => {
    const video = videoRef.current
    const audio = audioRef.current

    return () => {
      attemptRef.current?.abort()
      video?.pause()
      audio?.pause()
    }
  }, [])

  function resetPlayback() {
    if (!attemptRef.current) return
    attemptRef.current.abort()
    attemptRef.current = null
    hasWonRef.current = false
    winStartSecondRef.current = null
    winStartedRef.current = false
    videoRef.current?.pause()
    audioRef.current?.pause()
    setError('再生できませんでした。もう一度「再生」を押してください。')
    setPhase('idle')
  }

  async function startPlayback() {
    const video = videoRef.current
    const audio = audioRef.current
    // Guard synchronously so rapid clicks cannot start a second pair.
    if (attemptRef.current || !video || !audio) return

    const attempt = new AbortController()
    attemptRef.current = attempt
    const draw = Math.floor(Math.random() * 100) + 1
    hasWonRef.current = draw <= winProbability
    const number = Math.floor(Math.random() * 4) + 1
    winStartSecondRef.current = hasWonRef.current
      ? Math.floor(Math.random() * (MAX_WIN_START_SECONDS - MIN_WIN_START_SECONDS + 1))
        + MIN_WIN_START_SECONDS
      : null
    winStartedRef.current = false
    setError('')
    setPhase('playing')

    try {
      video.src = `/movie/${number}.mp4`
      audio.src = `/movie/${number}.mp3`
      video.load()
      audio.load()
      await Promise.all([
        waitUntilReady(video, attempt.signal),
        waitUntilReady(audio, attempt.signal),
      ])
      if (attempt.signal.aborted) return

      // Both are buffered before issuing play() in the same turn.
      // The video is muted so only the separate MP3 supplies sound.
      await Promise.all([video.play(), audio.play()])
    } catch {
      if (!attempt.signal.aborted) resetPlayback()
    }
  }

  function startWinCelebration() {
    if (!attemptRef.current || !hasWonRef.current || winStartedRef.current) return
    // Claim the transition before pause/ended events can try to start it again.
    winStartedRef.current = true
    attemptRef.current.abort()
    attemptRef.current = null
    videoRef.current?.pause()
    audioRef.current?.pause()
    setPhase('won')
  }

  function checkWinStartTime() {
    const video = videoRef.current
    const startSecond = winStartSecondRef.current
    if (video && !video.paused && startSecond !== null && video.currentTime >= startSecond) {
      startWinCelebration()
    }
  }

  function finishPlayback() {
    if (winStartedRef.current) return
    // An ended event also covers 30 seconds and clips slightly shorter than 30s.
    if (hasWonRef.current && videoRef.current?.ended) {
      startWinCelebration()
      return
    }
    if (videoRef.current?.ended && audioRef.current?.ended) {
      attemptRef.current?.abort()
      attemptRef.current = null
      setPhase('complete')
    }
  }

  function returnHome() {
    attemptRef.current?.abort()
    attemptRef.current = null
    hasWonRef.current = false
    winStartSecondRef.current = null
    winStartedRef.current = false
    setError('')
    setPhase('idle')
  }

  if (phase === 'complete') return <MissResult onReplay={returnHome} />

  if (phase === 'won') return <WinCelebration onReplay={returnHome} />

  return (
    <main className="startup-playback" aria-label="起動時の動画再生">
      {phase === 'idle' && (
        <div className="startup-playback__prompt">
          <h1 className="startup-playback__headline">
            <span>動画の再生中に</span>
            <strong>山岸が降臨したら</strong>
            <span>大当たり!?</span>
          </h1>
          <button type="button" onClick={startPlayback}>
            再生
          </button>
          <div className="startup-playback__probability">
            <label htmlFor="win-probability">当選確率</label>
            <select
              id="win-probability"
              value={winProbability}
              onChange={(event) => setWinProbability(Number(event.target.value))}
            >
              {[1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 99].map((probability) => (
                <option key={probability} value={probability}>
                  {probability}%
                </option>
              ))}
            </select>
          </div>
          {error && <p role="alert">{error}</p>}
        </div>
      )}
      <video
        ref={videoRef}
        className="startup-playback__video"
        hidden={phase === 'idle'}
        muted
        playsInline
        preload="auto"
        onPlaying={checkWinStartTime}
        onTimeUpdate={checkWinStartTime}
        onEnded={finishPlayback}
        onError={resetPlayback}
      />
      <audio
        ref={audioRef}
        preload="auto"
        onEnded={finishPlayback}
        onError={resetPlayback}
      />
      <VideoProgress videoRef={videoRef} />
    </main>
  )
}

