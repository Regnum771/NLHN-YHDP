import { useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { api, type ProgressSkills } from '../api'
import { share } from '../charts'
import { Bars, ShareBar } from '../components/Charts'
import { LoadError, Loading } from '../components/Status'
import { TabBar } from '../components/TabBar'
import { formatDate } from '../format'
import { useLoad } from '../hooks'

// The frame of both Tiến độ tabs: the title, the days left, and the switch between the two.
export function ProgressShell({ daysToExam, children }: { daysToExam: number | undefined; children: ReactNode }) {
  const tab = ({ isActive }: { isActive: boolean }) => `grow seg${isActive ? ' active' : ''}`
  return (
    <div className="screen">
      <div className="body stack" style={{ padding: 20, gap: 16 }}>
        <div className="row" style={{ marginTop: 12 }}>
          <h1 className="title grow" style={{ fontSize: 26 }}>Tiến độ</h1>
          {daysToExam !== undefined && <p className="muted small">Còn <b style={{ color: 'var(--ink)' }}>{daysToExam} ngày</b> đến kỳ thi</p>}
        </div>
        <nav className="row" style={{ gap: 8 }} aria-label="Hai góc nhìn của Tiến độ">
          <NavLink to="/tien-do" end className={tab}><span className="h2">Năng lực</span>{' '}<span className="small">Bạn biết gì</span></NavLink>
          <NavLink to="/tien-do/nhip-hoc" className={tab}><span className="h2">Nhịp học</span>{' '}<span className="small">Bạn học thế nào</span></NavLink>
        </nav>
        {children}
      </div>
      <TabBar />
    </div>
  )
}

export function Block({ id, title, hint, children }: { id: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="card stack" aria-labelledby={id}>
      <div>
        <h2 id={id} className="h2">{title}</h2>
        {hint && <p className="muted small">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

const SCOPES: { id: ProgressSkills['scope']; label: string }[] = [
  { id: 'latest3', label: '3 đề gần nhất' },
  { id: 'all', label: 'Tất cả' },
]

// Tiến độ · Năng lực (FR-LRN-13, 14): what the learner knows, counted from their own answers.
// Nothing here predicts the exam: no predicted score, pass line or trend (FR-LRN-26).
export function Progress() {
  const [scope, setScope] = useState<ProgressSkills['scope']>('latest3')
  const { data, error, reload } = useLoad(() => api.get<ProgressSkills>(`/progress/skills?scope=${scope}`), [scope])
  const [allModules, setAllModules] = useState(false)
  const modules = data ? (allModules ? data.coverage.modules : data.coverage.modules.slice(0, 3)) : []

  return (
    <ProgressShell daysToExam={data?.days_to_exam}>
      {error && <LoadError message={error} onRetry={reload} />}
      {!data && !error && <Loading />}
      {data && (
        <>
          <div className="row" style={{ gap: 8 }} role="group" aria-label="Tính trên">
            <span className="muted small">Tính trên</span>
            {SCOPES.map((s) => (
              <button key={s.id} className="pill" aria-pressed={scope === s.id} onClick={() => setScope(s.id)}>{s.label}</button>
            ))}
          </div>

          <Block id="coverage" title="Độ phủ chương trình">
            <p><b style={{ fontSize: 24 }}>{data.coverage.assessed_topics}</b> / {data.coverage.total_topics} vấn đề cốt lõi đã luyện</p>
            <div className="progress" style={{ height: 8, borderRadius: 4 }}>
              <span style={{ width: `${share(data.coverage.assessed_topics, data.coverage.total_topics) * 100}%` }} />
            </div>
            {modules.map((m) => (
              <ShareBar key={m.module_id} label={m.short_name} value={share(m.topics_assessed, m.topics_total)}
                text={`${m.topics_assessed}/${m.topics_total} chủ đề`} />
            ))}
            {data.coverage.modules.length > 3 && !allModules && (
              <div><button className="link-btn" onClick={() => setAllModules(true)}>Xem tất cả {data.coverage.modules.length} học phần</button></div>
            )}
          </Block>

          <Block id="priorities" title="Cần ưu tiên">
            {data.priorities.length === 0 && <p className="muted">Chưa đủ dữ liệu. Hãy làm một bài luyện hoặc một đề thi thử.</p>}
            {data.priorities.map((p) => (
              <div key={p.competency_code} className="row" style={{ alignItems: 'flex-start' }}>
                <span className="icon-box grey" style={{ width: 32, height: 32, fontWeight: 600 }}>{p.rank}</span>
                <div className="grow">
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div className="muted small">
                    {p.correct}/{p.total} câu đúng{p.weakest_vi ? ` · yếu nhất: ${p.weakest_vi}` : ''}
                  </div>
                </div>
                <Link to={`/luyen-tap?hp=${p.module_id}`} className="btn" style={{ minHeight: 44 }}>Luyện</Link>
              </div>
            ))}
          </Block>

          <Block id="scores" title="Điểm cả đề" hint="Số câu đúng ở từng đề thi thử đã nộp.">
            {data.mock_scores.length === 0
              ? <p className="muted">Chưa có đề thi thử nào được nộp.</p>
              : <Bars label="Điểm từng đề thi thử" max={1}
                  items={data.mock_scores.map((s) => ({ key: String(s.attempt_id), value: share(s.score, s.total),
                    caption: `${s.score}/${s.total}`, label: formatDate(s.submitted_at).slice(0, 5) }))} />}
          </Block>

          <Block id="levels" title="Theo mức nhận thức" hint="Số câu đúng trong các đề thi thử, theo mức của câu hỏi.">
            {data.levels.map((l) => (
              <ShareBar key={l.level} label={l.label_vi} value={share(l.correct, l.total)} text={`${l.correct}/${l.total}`} />
            ))}
          </Block>
        </>
      )}
    </ProgressShell>
  )
}
