import { useEffect, useRef, useState } from 'react'
import MissResult from './MissResult.tsx'
import WinCelebration from './WinCelebration.tsx'
import VideoProgress from './VideoProgress.tsx'
import './StartupPlayback.css'

const MIN_WIN_START_SECONDS = 5
const MAX_WIN_START_SECONDS = 30

export default function StartupPlayback() {
  const [phase, setPhase] = useState<'idle' | 'playing' | 'won' | 'complete'>('idle')
  const [winProbability, setWinProbability] = useState(50)
  const [error, setError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const attemptRef = useRef<AbortController | null>(null)
  const hasWonRef = useRef(false)
  const winStartSecondRef = useRef<number | null>(null)
  const winStartedRef = useRef(false)

  useEffect(() => {
    const video = videoRef.current

    return () => {
      attemptRef.current?.abort()
      video?.pause()
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
    setError('再生できませんでした。もう一度「再生」を押してください。')
    setPhase('idle')
  }

  async function startPlayback() {
    const video = videoRef.current
    // Guard synchronously so rapid clicks cannot start a second run.
    if (attemptRef.current || !video) return

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
      video.load()
      // Each MP4 already contains the matching soundtrack. One media clock keeps
      // picture and sound together during initial loading, seeking, and buffering.
      // Call play() before any await so iOS retains the tap's playback permission.
      await video.play()
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
    const video = videoRef.current
    video?.pause()
    // Release the movie decoder before allocating the celebration image layers.
    video?.removeAttribute('src')
    video?.load()
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
    if (videoRef.current?.ended) {
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

  return (
    <div className="startup-playback">
      {/* Keep the tap-authorized player mounted for the movie and both voices. */}
      <video
        ref={videoRef}
        className="startup-playback__video"
        hidden={phase !== 'playing'}
        playsInline
        preload="auto"
        onPlaying={() => { if (phase === 'playing') checkWinStartTime() }}
        onTimeUpdate={() => { if (phase === 'playing') checkWinStartTime() }}
        onEnded={() => { if (phase === 'playing') finishPlayback() }}
        onError={() => { if (phase === 'playing') resetPlayback() }}
      />
      {phase === 'complete' ? (
        <MissResult onReplay={returnHome} />
      ) : phase === 'won' ? (
        <WinCelebration audioRef={videoRef} onReplay={returnHome} />
      ) : (
        <main className="startup-playback__content" aria-label="起動時の動画再生">
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
          <VideoProgress videoRef={videoRef} />
        </main>
      )}
    </div>
  )
}

