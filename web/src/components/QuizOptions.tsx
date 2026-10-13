import type { Option } from '../api'

// The options of a multiple-choice question, in a unit and in a practice set. Before the answer the
// learner picks one; after it the correct one is green and a wrong pick orange (never red).
export function QuizOptions({ options, picked, correctKey, disabled, onPick }: {
  options: Option[]
  picked: string | null
  correctKey: string | null    // null until the answer has been checked
  disabled: boolean
  onPick: (key: string) => void
}) {
  const short = options.every((o) => o.text.length <= 12)
  return (
    <div role="radiogroup" aria-label="Các phương án"
      style={{ display: 'grid', gridTemplateColumns: short ? '1fr 1fr' : '1fr', gap: 10 }}>
      {options.map((o) => {
        const chosen = picked === o.key
        const isCorrect = correctKey === o.key
        const isWrongPick = correctKey !== null && chosen && !isCorrect
        const style = isCorrect
          ? { background: 'var(--primary-tint)', border: '2px solid var(--primary)' }
          : isWrongPick
            ? { background: 'var(--learning-tint)', border: '2px solid var(--learning)' }
            : chosen
              ? { background: 'var(--surface)', border: '2px solid var(--ink)' }
              : { background: 'var(--surface)', border: '1px solid var(--border-input)' }
        return (
          <button key={o.key} role="radio" aria-checked={chosen} disabled={disabled || correctKey !== null}
            onClick={() => onPick(o.key)}
            style={{ ...style, minHeight: 56, borderRadius: 14, padding: '10px 14px', fontSize: short ? 17 : 15,
              fontWeight: short ? 600 : 500, color: 'var(--ink)', opacity: 1, textAlign: short ? 'center' : 'left' }}>
            {o.text}
            {isCorrect && <span style={{ color: 'var(--primary-dark)', fontWeight: 700 }}> ✓<span className="sr">đáp án đúng</span></span>}
            {isWrongPick && <span style={{ color: 'var(--learning-dark)', fontWeight: 700 }}> ✕<span className="sr">bạn chọn, chưa đúng</span></span>}
          </button>
        )
      })}
    </div>
  )
}
