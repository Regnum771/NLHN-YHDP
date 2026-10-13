import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, type Deck, type Listed, type Module, type ModuleDetail } from '../api'
import { Icon } from '../components/Icon'
import { LoadError, Loading } from '../components/Status'
import { TabBar } from '../components/TabBar'
import { useLoad } from '../hooks'

type Filter = 'all' | 'started' | 'new'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'started', label: 'Đang học' },
  { id: 'new', label: 'Chưa học' },
]

export function Modules() {
  const [params] = useSearchParams()
  const { data, error, reload } = useLoad(() => api.get<Listed<Module>>('/modules'), [])
  // The cards shortcut: the list does not wait for it, and shows nothing of it if it cannot be read.
  const { data: decks } = useLoad(() => api.get<Listed<Deck>>('/decks'), [])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [openId, setOpenId] = useState<string | null>(params.get('hp'))   // "?hp=": a học phần opened from Tiến độ

  const needle = query.trim().toLowerCase()
  const visible = (data?.items ?? []).filter((m) => {
    if (!m.short_name.toLowerCase().includes(needle) && !m.name.toLowerCase().includes(needle)) return false
    if (filter === 'started') return m.units_done > 0
    if (filter === 'new') return m.units_done === 0
    return true
  })

  return (
    <div className="screen">
      <div className="body stack" style={{ padding: 20 }}>
        <h1 className="title" style={{ fontSize: 26, marginTop: 12 }}>Luyện tập</h1>
        <label className="row" style={{ minHeight: 50, padding: '0 16px', borderRadius: 999, border: '1px solid var(--border-input)',
          background: 'var(--surface)', color: 'var(--text-3)' }}>
          <Icon name="search" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm học phần, chủ đề…"
            aria-label="Tìm học phần" className="grow" style={{ border: 0, outline: 0, background: 'transparent', minHeight: 44 }} />
        </label>
        <div className="row" style={{ gap: 8, overflowX: 'auto' }} role="group" aria-label="Lọc theo trạng thái">
          {FILTERS.map((f) => (
            <button key={f.id} className="pill" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>
          ))}
        </div>

        {decks && (
          <Link to="/luyen-tap/bo-the" className="dark-panel row">
            <span className="grow">
              <span className="h2" style={{ display: 'block' }}>Thẻ ôn</span>
              <span className="muted small">
                {decks.items.length === 0
                  ? 'Chưa có thẻ ôn'
                  : `${decks.items.reduce((n, d) => n + d.due, 0)} thẻ đến hạn hôm nay · ${decks.items.length} bộ thẻ`}
              </span>
            </span>
            <Icon name="right" size={18} />
          </Link>
        )}

        {error && <LoadError message={error} onRetry={reload} />}
        {!data && !error && <Loading />}
        {data && visible.length === 0 && <p className="empty">Không có học phần phù hợp.</p>}
        {visible.map((m) => (
          <ModuleCard key={m.id} module={m} open={openId === m.id} onToggle={() => setOpenId(openId === m.id ? null : m.id)} />
        ))}
      </div>
      <TabBar />
    </div>
  )
}

function ModuleCard({ module: m, open, onToggle }: { module: Module; open: boolean; onToggle: () => void }) {
  const available = !m.coming_soon && m.units_total > 0
  const progress = m.units_total ? (m.units_done / m.units_total) * 100 : 0
  const action = m.units_done > 0 ? 'Tiếp tục' : 'Bắt đầu'

  const summary = (
    <>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <span className="h2 grow" style={{ fontSize: 17 }}>{m.short_name}</span>
        <span className="muted small" style={{ flexShrink: 0, lineHeight: '25px' }}>
          {available ? `${m.units_total} chủ đề` : m.coming_soon ? 'Sắp có' : 'Chưa có chủ đề'}
        </span>
      </div>
      {/* the official name of the blueprint group, in full: long Vietnamese labels wrap, never truncate */}
      <div className="muted small" style={{ marginTop: 2 }}>{m.name}</div>
      <div className="row" style={{ marginTop: 10 }}>
        <div className="progress grow"><span style={{ width: `${progress}%` }} /></div>
        {available && (
          <span style={{ fontWeight: 600, color: m.units_done > 0 ? 'var(--primary-dark)' : 'var(--ink)' }}>{action}</span>
        )}
      </div>
    </>
  )

  if (!available) {
    return <div className="card" style={{ opacity: 0.6 }}>{summary}</div>
  }
  return (
    <div className="card" style={{ padding: 0 }}>
      <button onClick={onToggle} aria-expanded={open}
        style={{ display: 'block', width: '100%', textAlign: 'left', border: 0, background: 'transparent', padding: 16, borderRadius: 16 }}>
        {summary}
      </button>
      {open && <UnitList moduleId={m.id} />}
    </div>
  )
}

function UnitList({ moduleId }: { moduleId: string }) {
  const { data, error, reload } = useLoad(() => api.get<ModuleDetail>(`/modules/${moduleId}`), [moduleId])
  if (error) return <LoadError message={error} onRetry={reload} />
  if (!data) return <Loading />
  return (
    <div style={{ borderTop: '1px solid var(--divider)' }}>
      {data.units.map((u, i) => (
        <Link key={u.id} to={`/luyen-tap/${u.id}`} className="list-row" style={{ borderTop: i ? '1px solid var(--divider)' : 0 }}>
          <span className={`icon-box ${u.done ? '' : 'grey'}`}><Icon name={u.done ? 'check' : 'book'} /></span>
          <span className="grow">
            <span style={{ display: 'block', fontWeight: 500 }}>Chủ đề {i + 1} · {u.topic}</span>
            <span className="muted small">{u.done ? 'Đã học xong' : 'Chưa học xong'}</span>
          </span>
          <Icon name="right" size={18} />
        </Link>
      ))}
    </div>
  )
}
