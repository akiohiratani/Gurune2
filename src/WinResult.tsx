import { useState } from 'react'
import './WinResult.css'

const LETTER_INTERVAL_MS = 250

export default function WinResult({ onReplay }: { onReplay: () => void }) {
  const [readyToReplay, setReadyToReplay] = useState(false)

  return (
    <section className="win-result" aria-label="大当たり結果">
      <h1 className="win-result__title" aria-label="Win">
        {Array.from('Win').map((letter, index) => (
          <span
            key={`${letter}-${index}`}
            aria-hidden="true"
            style={{ animationDelay: `${index * LETTER_INTERVAL_MS}ms` }}
            onAnimationEnd={(event) => {
              if (index === 2 && event.target === event.currentTarget
                && event.animationName === 'win-letter-appear') setReadyToReplay(true)
            }}
          >
            {letter}
          </span>
        ))}
      </h1>
      <div className="win-result__replay-slot">
        {readyToReplay && (
          <button type="button" className="win-result__replay" onClick={onReplay}>
            もう一度遊ぶ
          </button>
        )}
      </div>
    </section>
  )
}
