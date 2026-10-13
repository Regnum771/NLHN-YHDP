import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, signOut, type Home as HomeData, type SessionToday } from '../api'
import { AiStar } from '../components/AiStar'
import { Icon } from '../components/Icon'
import { Sheet } from '../components/Sheet'
import { LoadError, Loading } from '../components/Status'
import { TabBar } from '../components/TabBar'
import { homeTile, suggestionPath } from '../flow'
import { useLoad } from '../hooks'

function greeting(): string {
  const h = new Date().getHours()
  return h < 11 ? 'Chào buổi sáng,' : h < 18 ? 'Chào buổi chiều,' : 'Chào buổi tối,'
}

// Trang chủ (FR-LRN-30, 31, 36): what to do now, the next mock exam, what the rules did since the
// last visit, and where the learner left off. Everything shown comes from GET /home.
export function Home() {
  const { data, error, reload } = useLoad(() => api.get<HomeData>('/home'), [])
  // With nothing to review, the tile says what is left of today's session: that needs the session.
  const nothingDue = data?.quick_review_count === 0
  const { data: session } = useLoad(async () => (nothingDue ? api.get<SessionToday>('/session/today') : undefined), [nothingDue])
  const tile = data && homeTile(data.quick_review_count, data.quick_review_note_vi, session)
  const [accountOpen, setAccountOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const leave = async () => {
    setLeaving(true)
    await signOut() // the guard shows Đăng nhập as soon as the session ends
  }

  return (
    <div className="screen">
      <div className="body" style={{ padding: 20 }}>
        {error && <LoadError message={error} onRetry={reload} />}
        {!data && !error && <Loading />}
        {data && (
          <div className="stack" style={{ gap: 20 }}>
            <div className="row" style={{ marginTop: 12 }}>
              <div className="grow">
                <p className="muted">{greeting()}</p>
                <h1 className="title" style={{ fontSize: 26 }}>{data.name}</h1>
              </div>
              <button className="icon-box" onClick={() => setAccountOpen(true)} aria-label="Tài khoản"
                style={{ width: 44, height: 44, borderRadius: 22, fontWeight: 600, border: 0 }}>
                {data.name.slice(0, 2).toUpperCase()}
              </button>
            </div>

            <Link to="/luyen-tap" className="row" style={{ minHeight: 54, padding: '0 18px', borderRadius: 999,
              border: '1px solid var(--border-input)', background: 'var(--surface)', color: 'var(--text-3)' }}>
              <Icon name="search" />
              Tìm học phần, chủ đề…
            </Link>

            <div className="row" style={{ alignItems: 'stretch' }}>
              <Link to="/phien" className="grow" style={{ background: 'var(--primary)', color: '#fff',
                borderRadius: 'var(--r-card)', padding: 16 }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{tile?.title}</div>
                <div style={{ fontSize: 14 }}>{tile?.sub}</div>
              </Link>
              {data.next_mock && (data.next_mock.open_attempt_id !== null ? (
                <Link to={`/thi-thu/lam-bai/${data.next_mock.open_attempt_id}`} className="card grow"
                  style={{ borderColor: 'var(--learning)' }}>
                  <div className="h2">{data.next_mock.title}</div>
                  <div className="small" style={{ color: 'var(--learning-dark)', fontWeight: 600 }}>Đang làm dở · Làm tiếp</div>
                </Link>
              ) : (
                <Link to={`/thi-thu/${data.next_mock.form_id}/quy-dinh`} className="card grow">
                  <div className="h2">{data.next_mock.title}</div>
                  <div className="muted small">{data.next_mock.n_questions} câu · {data.next_mock.minutes} phút</div>
                </Link>
              ))}
            </div>

            {data.tutor_suggestions.length > 0 && (
              <section className="card stack" aria-labelledby="suggestions-title"
                style={{ background: 'var(--ai-gold-bg)', borderColor: 'transparent', gap: 4 }}>
                <h2 id="suggestions-title" className="h2 row" style={{ gap: 8 }}><AiStar />Đề xuất từ gia sư</h2>
                {data.tutor_suggestions.map((s) => (
                  <div key={s.kind} className="row" style={{ minHeight: 44 }}>
                    <span className="grow">{s.text_vi}</span>
                    {s.action && (
                      <Link to={suggestionPath(s.action)} className="textlink" style={{ color: 'var(--primary-dark)', fontWeight: 600 }}>
                        {s.action.label_vi}
                      </Link>
                    )}
                  </div>
                ))}
              </section>
            )}

            <section className="stack" style={{ gap: 8 }}>
              <h2 className="label">Tiếp tục</h2>
              {data.recent.length === 0 ? (
                <p className="muted">Chưa có hoạt động nào. Hãy bắt đầu với Luyện tập hoặc Hỏi đáp.</p>
              ) : (
                <div className="list">
                  {data.recent.map((r) => (
                    <Link key={`${r.kind}-${r.id}`} className="list-row"
                      to={r.kind === 'unit' ? `/luyen-tap/${r.id}` : `/hoi-dap?s=${r.id}`}>
                      <span className={`icon-box ${r.kind === 'chat' ? 'grey' : ''}`}>
                        <Icon name={r.kind === 'unit' ? 'book' : 'chat'} />
                      </span>
                      <span className="grow">
                        <span className="h2" style={{ display: 'block' }}>{r.title}</span>
                        <span className="muted small" style={{ display: 'block' }}>{r.subtitle_vi ?? (r.kind === 'unit' ? 'Luyện tập' : 'Hỏi đáp')}</span>
                        {r.progress !== null && (
                          <span className="progress" style={{ display: 'block', marginTop: 6 }}>
                            <span style={{ width: `${Math.round(r.progress * 100)}%` }} />
                          </span>
                        )}
                      </span>
                      <Icon name="right" size={18} />
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <p className="muted small center">Bản demo · nội dung chưa thẩm định</p>
          </div>
        )}
      </div>
      <TabBar />
      <Sheet open={accountOpen} onClose={() => setAccountOpen(false)} title="Tài khoản">
        <div className="stack">
          <Link to="/chon-hoc-phan?doi=1" className="btn block">Đổi học phần</Link>
          <button className="btn block" onClick={leave} disabled={leaving}>Đăng xuất</button>
        </div>
      </Sheet>
    </div>
  )
}
