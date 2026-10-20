import './MissResult.css'

const LETTER_INTERVAL_MS = 250

export default function MissResult({ onReplay }: { onReplay: () => void }) {
  return (
    <main className="startup-playback miss-result" aria-label="抽選結果">
      <div className="miss-result__content">
        <h1 className="miss-result__title" aria-label="Miss">
          {Array.from('Miss').map((letter, index) => (
            <span
              key={`${letter}-${index}`}
              aria-hidden="true"
              style={{ animationDelay: `${index * LETTER_INTERVAL_MS}ms` }}
            >
              {letter}
            </span>
          ))}
        </h1>
        <button type="button" className="miss-result__replay" onClick={onReplay}>
          もう一度遊ぶ
        </button>
      </div>
    </main>
  )
}
