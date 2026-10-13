import type { CurvePoint } from '../api'
import { CURVE_FLOOR, calendarRows, curveGeometry, heatLevel, share } from '../charts'
import { dayMonth, percent } from '../format'

// Small charts for Tiến độ, drawn with plain HTML and SVG. Each one carries its numbers as text too,
// so nothing is said by colour or shape alone.

/** A horizontal bar for a share, with its name on the left and its numbers on the right. */
export function ShareBar({ label, value, text, color = 'var(--primary)' }: { label: string; value: number; text: string; color?: string }) {
  return (
    <div>
      <div className="row" style={{ marginBottom: 4 }}>
        <span className="grow">{label}</span>
        <span style={{ fontWeight: 600 }}>{text}</span>
      </div>
      <div className="progress" style={{ height: 8, borderRadius: 4 }}><span style={{ width: `${value * 100}%`, background: color }} /></div>
    </div>
  )
}

/** Vertical bars, one per item: the number above, the label under. */
export function Bars({ items, max, label, color = 'var(--primary)' }: {
  items: { key: string; value: number; caption: string; label: string }[]
  max: number
  label: string
  color?: string
}) {
  return (
    <ol role="list" aria-label={label} className="bars">
      {items.map((item) => (
        <li key={item.key}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{item.caption}</span>
          <span className="track"><span style={{ height: `${share(item.value, max) * 100}%`, background: color }} /></span>
          <span className="muted" style={{ fontSize: 11 }}>{item.label}</span>
        </li>
      ))}
    </ol>
  )
}

const HEAT = ['var(--soft)', 'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--primary)']
const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

/** The last eight weeks, one cell per day, darker for longer study. */
export function Heatmap({ days, label }: { days: { date: string; minutes: number }[]; label: string }) {
  return (
    <div className="stack" style={{ gap: 8 }}>
      <table className="heat" aria-label={label}>
        <thead><tr>{WEEKDAYS.map((d) => <th key={d} scope="col">{d}</th>)}</tr></thead>
        <tbody>
          {calendarRows(days).map((row, r) => (
            <tr key={r}>
              {row.map((day, c) => (day
                ? <td key={c} aria-label={`${dayMonth(day.date)}: ${day.minutes} phút`} title={`${dayMonth(day.date)}: ${day.minutes} phút`}>
                    <span style={{ background: HEAT[heatLevel(day.minutes)] }} />
                  </td>
                : <td key={c} />))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row muted" style={{ gap: 6, fontSize: 12 }} aria-hidden="true">
        Không học
        {HEAT.map((color) => <span key={color} style={{ width: 14, height: 14, borderRadius: 4, background: color }} />)}
        Trên 75 phút
      </div>
    </div>
  )
}

const W = 300
const H = 110
const PAD = 8

/** One card's memory through its real reviews, to today, and on without a review (dashed). On a dark panel. */
export function MemoryCurve({ points, label }: { points: CurvePoint[]; label: string }) {
  const g = curveGeometry(points, W, H)
  const guide = share(1 - 0.9, 1 - CURVE_FLOOR) * H   // the 90% line
  const reviews = points.filter((p) => p.kind === 'review').length
  const today = [...points].reverse().find((p) => p.kind === 'decay')
  const later = points.find((p) => p.kind === 'projected')
  return (
    <div className="stack" style={{ gap: 8 }}>
      <svg role="img" aria-label={label} viewBox={`${-PAD} ${-PAD} ${W + 2 * PAD} ${H + 2 * PAD}`} style={{ width: '100%', height: 'auto' }}>
        <line x1={0} x2={W} y1={0} y2={0} stroke="var(--ink-3)" strokeWidth="1" />
        <line x1={0} x2={W} y1={guide} y2={guide} stroke="var(--ink-3)" strokeWidth="1" strokeDasharray="2 4" />
        <line x1={0} x2={W} y1={H} y2={H} stroke="var(--ink-3)" strokeWidth="1" />
        <path d={g.solid} fill="none" stroke="var(--primary-on-dark)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {g.dashed && <path d={g.dashed} fill="none" stroke="var(--forget-on-dark)" strokeWidth="2.5" strokeDasharray="5 5" strokeLinecap="round" />}
        {g.today && <circle cx={g.today.x} cy={g.today.y} r="5" fill="#fff" />}
      </svg>
      <div className="row" style={{ gap: 14, fontSize: 12, flexWrap: 'wrap' }} aria-hidden="true">
        <span className="row" style={{ gap: 6 }}><i className="key" style={{ background: 'var(--primary-on-dark)' }} />độ nhớ qua các lần ôn</span>
        <span className="row" style={{ gap: 6 }}><i className="key" style={{ background: '#fff', width: 8, height: 8, borderRadius: 4 }} />hôm nay</span>
        <span className="row" style={{ gap: 6 }}><i className="key" style={{ background: 'var(--forget-on-dark)' }} />nếu không ôn</span>
      </div>
      <p className="sr">
        {reviews} lần ôn. Hôm nay độ nhớ khoảng {percent(today?.recall ?? null)}
        {later ? `; đến ${dayMonth(later.date)} nếu không ôn còn khoảng ${percent(later.recall)}.` : '.'}
        {' '}Thang đo từ 100% đến {percent(CURVE_FLOOR)}, đường ngang ở 90%.
      </p>
    </div>
  )
}
