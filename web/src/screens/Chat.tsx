import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, type ChatSessionSummary, type Listed } from '../api'
import { Conversation } from '../components/Conversation'
import { Icon } from '../components/Icon'
import { Sheet } from '../components/Sheet'
import { LoadError, Loading } from '../components/Status'
import { TabBar } from '../components/TabBar'
import { formatDate } from '../format'
import { useLoad } from '../hooks'

const STARTERS = [
  'Vắc xin viêm gan B mũi sơ sinh tiêm khi nào?',
  'Phân biệt tỷ lệ hiện mắc và tỷ lệ mới mắc',
  'Bệnh nào thuộc nhóm A?',
]

// Hỏi đáp (FR-LRN-01–06, 28). The conversation shown is the one in the address (`?s=`), so a
// reload or a link from Home reopens it.
export function Chat() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const sessionId = params.get('s') ? Number(params.get('s')) : null
  const [listOpen, setListOpen] = useState(false)

  return (
    <div className="screen">
      <header className="topbar">
        <h1>Hỏi đáp</h1>
        <button className="icon-btn" onClick={() => setListOpen(true)} aria-label="Cuộc trò chuyện"><Icon name="list" /></button>
        <button className="icon-btn" onClick={() => navigate('/hoi-dap', { replace: true })} aria-label="Cuộc trò chuyện mới">
          <Icon name="plus" />
        </button>
      </header>
      <Conversation sessionId={sessionId} starters={STARTERS}
        onSession={(id) => navigate(`/hoi-dap?s=${id}`, { replace: true })} />
      <TabBar />
      <Sheet open={listOpen} onClose={() => setListOpen(false)} title="Cuộc trò chuyện">
        {listOpen && <SessionList onPick={(id) => { setListOpen(false); navigate(`/hoi-dap?s=${id}`) }} />}
      </Sheet>
    </div>
  )
}

function when(iso: string): string {
  const day = formatDate(iso)
  const today = new Date()
  const yesterday = new Date(today.getTime() - 86400000)
  if (day === formatDate(today.toISOString())) return 'Hôm nay'
  if (day === formatDate(yesterday.toISOString())) return 'Hôm qua'
  return day.slice(0, 5)
}

function SessionList({ onPick }: { onPick: (id: number) => void }) {
  const { data, error, reload } = useLoad(() => api.get<Listed<ChatSessionSummary>>('/chat/sessions?limit=50'), [])
  if (error) return <LoadError message={error} onRetry={reload} />
  if (!data) return <Loading />
  if (data.items.length === 0) return <p className="muted">Chưa có cuộc trò chuyện nào.</p>
  return (
    <div className="list">
      {data.items.map((s) => (
        <button key={s.id} className="list-row" onClick={() => onPick(s.id)}>
          <span className="grow" style={{ fontWeight: 500 }}>{s.title}</span>
          <span className="muted small">{when(s.updated_at)}</span>
        </button>
      ))}
    </div>
  )
}
