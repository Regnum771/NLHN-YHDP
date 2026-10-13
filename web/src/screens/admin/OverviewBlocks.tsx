// The blocks of Tổng quan toàn quốc (mock/AdminOverview.dc.html). Every figure is the server's; a
// figure it withheld is a dash. The one exception is Cost, whose amounts are illustrative and say so.
import {
  CHART, DASH, change, chart, chartLabel, count, days, delta, dong, periodLabel, score, seconds, sharePct,
  type AdminOverview, type AiSafety, type Compliance, type Kpis, type QuestionBank,
} from '../../dashboard'
import { COST_PARTS, costView } from '../../dashboardCost'

type Present<K extends keyof AdminOverview> = NonNullable<AdminOverview[K]>
const month = (period: string) => periodLabel(period).toLowerCase()   // "tháng 9/2026"
const width = (share: number | null) => ({ width: `${Math.round(Math.min(1, Math.max(0, share ?? 0)) * 100)}%` })

export function KpiTiles({ kpis, period }: { kpis: Kpis; period: string }) {
  const previous = Number(period.slice(5, 7)) === 1 ? 12 : Number(period.slice(5, 7)) - 1
  const moved = delta(kpis.active_learners, kpis.active_learners_previous)
  const ofIssued = (n: number) => (kpis.accounts_issued > 0 ? sharePct(n / kpis.accounts_issued) : DASH)
  const median = kpis.mock_median
  const tiles = [
    { label: 'Học viên hoạt động trong tháng', value: count(kpis.active_learners),
      note: `${moved === null ? '' : `${moved} so với tháng ${previous} · `}${ofIssued(kpis.active_learners)} số tài khoản đã cấp` },
    { label: 'Tài khoản đã kích hoạt', value: count(kpis.accounts_activated),
      note: `${ofIssued(kpis.accounts_activated)} của ${count(kpis.accounts_issued)} tài khoản đã cấp` },
    { label: 'Câu luyện tập đã làm', value: count(kpis.practice_items),
      note: kpis.active_learners > 0
        ? `Trung bình ${count(kpis.practice_items / kpis.active_learners)} câu mỗi học viên hoạt động` : 'Chưa có học viên hoạt động' },
    { label: 'Lượt thi thử', value: count(kpis.mock_attempts),
      note: median ? `Trung vị ${score(median)} câu đúng · ${count(median.learners)} học viên đồng ý`
        : 'Trung vị được ẩn: chưa đủ học viên đồng ý' },
    { label: 'Câu trả lời AI có trích dẫn', value: sharePct(kpis.cited_claims_share, 1),
      note: `Mục tiêu ≥ ${sharePct(kpis.cited_claims_target)} (NFR-07)` },
  ]
  return (
    <section aria-label="Chỉ số chính" className="kpis">
      {tiles.map((tile) => (
        <div className="kpi" key={tile.label}>
          <span className="kpi-label">{tile.label}</span>
          <span className="kpi-value">{tile.value}</span>
          <span className="kpi-note">{tile.note}</span>
        </div>
      ))}
    </section>
  )
}

export function WeeklyActive({ weekly, scope }: { weekly: Present<'weekly_active'>; scope: string }) {
  const g = chart(weekly.weeks)
  const font = { fontFamily: 'Be Vietnam Pro, sans-serif', fill: '#58635F', fontSize: 11 }
  return (
    <section id="reach" aria-labelledby="wau-title" className="admin-card wide">
      <div className="head">
        <h2 id="wau-title">Học viên hoạt động mỗi tuần</h2>
        <span className="admin-sub">{weekly.weeks.length} tuần gần nhất · {scope}</span>
      </div>
      <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label={chartLabel(weekly.weeks)}>
        {g.ticks.map((tick) => (
          <g key={tick.y}>
            <path d={`M${CHART.gridLeft} ${tick.y}H${CHART.gridRight}`} stroke="#E6EAE7" strokeWidth="1" />
            <text x={CHART.gridLeft - 8} y={tick.y + 4} textAnchor="end" {...font}>{tick.label}</text>
          </g>
        ))}
        {g.area && <path d={g.area} fill="#1E7A4F" fillOpacity="0.1" />}
        {g.line && <polyline points={g.line} fill="none" stroke="#1E7A4F" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        {g.end && (
          <>
            <circle cx={g.end.x} cy={g.end.y} r="5" fill="#1E7A4F" stroke="#FFFFFF" strokeWidth="2" />
            <text x={g.end.x - 10} y={g.end.y - 12} textAnchor="end" fontSize="13" fontWeight="700" fill="#15201C"
              fontFamily={font.fontFamily}>{g.end.label}</text>
          </>
        )}
        {g.labels.map((label) => <text key={label.x} x={label.x} y="214" textAnchor="middle" {...font}>{label.text}</text>)}
      </svg>
      <div className="retention">
        {weekly.retention.map((item) => (
          <div key={item.weeks}>
            <span className="ret-label">Quay lại sau {item.weeks} tuần</span>
            <span className="ret-value">{sharePct(item.share)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export function Alerts({ alerts }: { alerts: AdminOverview['alerts'] }) {
  return (
    <section aria-labelledby="alert-title" className="admin-card" style={{ gap: 4 }}>
      <h2 id="alert-title" style={{ marginBottom: 8 }}>Cần chú ý</h2>
      {alerts.length === 0 && <p className="admin-sub">Không có mục nào cần chú ý</p>}
      {alerts.map((alert) => (
        <div className="alert-line" key={alert.title_vi}>
          <span className="mark" aria-hidden="true">!</span>
          <span>
            <span className="alert-title">{alert.title_vi}</span>
            <br />
            <span className="admin-note">{alert.detail_vi}</span>
          </span>
        </div>
      ))}
    </section>
  )
}

export function Accuracy({ accuracy, period }: { accuracy: Present<'accuracy_by_module'>; period: string }) {
  return (
    <section id="learning" aria-labelledby="learn-title" className="admin-card">
      <h2 id="learn-title">Câu đúng theo miền</h2>
      <span className="admin-note" style={{ marginTop: -8 }}>Đề thi thử {month(period)} · {count(accuracy.learners)} học viên đồng ý</span>
      {accuracy.items.map((item) => (
        <div className="bar-row" key={item.module_id}>
          <span>{item.short_name}</span>
          <span className="bar"><span className={item.low ? 'low' : undefined} style={width(item.share)} /></span>
          <span className="pct">{sharePct(item.share)}</span>
        </div>
      ))}
      <span className="admin-note legend-low"><i aria-hidden="true" />Dưới 60% câu đúng</span>
    </section>
  )
}

const BANK_PARTS: { key: 'approved' | 'in_review' | 'draft' | 'rejected'; label: string; colour: string }[] = [
  { key: 'approved', label: 'Đã duyệt', colour: '#1E7A4F' }, { key: 'in_review', label: 'Đang duyệt', colour: '#7FC8A0' },
  { key: 'draft', label: 'Nháp', colour: '#D4EDDF' }, { key: 'rejected', label: 'Loại', colour: '#C9D0CC' },
]

export function Bank({ bank, period }: { bank: QuestionBank; period: string }) {
  const slow = bank.round2_median_days !== null && bank.round2_median_days > bank.round2_target_days
  return (
    <section id="content" aria-labelledby="bank-title" className="admin-card">
      <h2 id="bank-title">Ngân hàng câu hỏi</h2>
      <span className="admin-note" style={{ marginTop: -8 }}>Toàn bộ ngân hàng: không theo bộ lọc cơ sở, đối tượng, vùng</span>
      <div className="bank-total"><strong>{count(bank.approved)}</strong><span>câu đã duyệt qua 2 vòng</span></div>
      <span aria-hidden="true" className="bank-split">
        {BANK_PARTS.map((part) => <span key={part.key} style={{ flex: `${bank[part.key]} 1 0`, background: part.colour }} />)}
      </span>
      <div className="bank-legend">
        {BANK_PARTS.map((part) => (
          <span key={part.key}><i aria-hidden="true" style={{ background: part.colour }} />{part.label} · <strong>{count(bank[part.key])}</strong></span>
        ))}
      </div>
      <div className="facts">
        <div><span>Vấn đề cốt lõi có ≥ {bank.min_approved_per_issue} câu đã duyệt</span><strong>{bank.issues_covered} / {bank.issues_total}</strong></div>
        <div><span>Duyệt vòng 1 (trung vị)</span><strong>{bank.round1_median_days === null ? DASH : `${days(bank.round1_median_days)} ngày`}</strong></div>
        <div>
          <span>Duyệt vòng 2 (trung vị)</span>
          <strong className={slow ? 'over' : undefined}>
            {bank.round2_median_days === null ? DASH : `${days(bank.round2_median_days)} ngày`} · mục tiêu {bank.round2_target_days}
          </strong>
        </div>
        <div><span>Hai vòng cùng kết luận</span><strong>{sharePct(bank.rounds_agree_share)}</strong></div>
        <div><span>Báo lỗi từ học viên {month(period)}</span><strong>{count(bank.reports_received)} · đã xử lý {count(bank.reports_resolved)}</strong></div>
      </div>
    </section>
  )
}

export function Safety({ ai, period }: { ai: AiSafety; period: string }) {
  const versions = [ai.model_versions.length > 0 && `mô hình ${ai.model_versions.join(', ')}`,
    ai.corpus_versions.length > 0 && `kho học liệu ${ai.corpus_versions.join(', ')}`].filter(Boolean)
  return (
    <section id="ai" aria-labelledby="ai-title" className="admin-card">
      <h2 id="ai-title">An toàn câu trả lời AI</h2>
      <span className="admin-note" style={{ marginTop: -8 }}>{[`${count(ai.answers)} câu trả lời ${month(period)}`, ...versions].join(' · ')}</span>
      <div className="facts">
        <div><span>Khẳng định có trích dẫn đến trang</span><strong>{sharePct(ai.cited_claims_share, 1)}</strong></div>
        <span className="target-line">
          <span className="bar thin"><span style={width(ai.cited_claims_share)} /></span>mục tiêu ≥ {sharePct(ai.cited_claims_target)}
        </span>
        <div><span>Từ chối vì thiếu bằng chứng</span><strong>{sharePct(ai.insufficient_share, 1)}</strong></div>
        <div><span>Từ chối tư vấn ca bệnh cụ thể</span><strong>{sharePct(ai.declined_share, 1)}</strong></div>
        <div><span>Bị hậu kiểm trích dẫn gắn cờ</span><strong>{sharePct(ai.flagged_share, 1)}</strong></div>
        <div><span>Báo lỗi trên 1.000 câu trả lời</span><strong>{days(ai.reports_per_1000)}</strong></div>
      </div>
    </section>
  )
}

export function Schools({ schools, minimum }: { schools: Present<'schools'>; minimum: number }) {
  return (
    <section aria-labelledby="inst-title" className="admin-card">
      <div className="head">
        <h2 id="inst-title">Theo cơ sở đào tạo</h2>
        <span className="admin-sub">Điểm là kết quả thi thử thật, không phải dự đoán</span>
      </div>
      {schools.rows.length === 0 ? <p className="admin-sub">Không có cơ sở nào đủ {minimum} học viên để hiển thị.</p> : (
        <div className="table-scroll">
          <table className="schools" aria-label="Chỉ số theo cơ sở đào tạo">
            <thead>
              <tr>
                <th scope="col">Cơ sở</th><th scope="col">Vùng</th><th scope="col" className="num">Tài khoản cấp</th>
                <th scope="col">Đã kích hoạt</th><th scope="col" className="num">Hoạt động / tuần</th>
                <th scope="col" className="num">Lượt thi thử</th><th scope="col" className="num">Trung vị điểm</th>
                <th scope="col" className="num">Đề đầu → gần nhất</th>
              </tr>
            </thead>
            <tbody>
              {schools.rows.map((row) => {
                const rate = row.accounts_issued > 0 ? row.accounts_activated / row.accounts_issued : null
                return (
                  <tr key={row.code}>
                    <th scope="row">{row.name}</th>
                    <td data-label="Vùng">{row.region ?? DASH}</td>
                    <td data-label="Tài khoản cấp" className="num">{count(row.accounts_issued)}</td>
                    <td data-label="Đã kích hoạt">
                      <span className="activation">
                        <span className="bar thin" aria-hidden="true"><span className={row.activation_low ? 'low' : undefined} style={width(rate)} /></span>
                        <span className={row.activation_low ? 'low-text' : undefined}>{count(row.accounts_activated)} · {sharePct(rate)}</span>
                      </span>
                    </td>
                    <td data-label="Hoạt động / tuần" className="num">{days(row.weekly_active)}</td>
                    <td data-label="Lượt thi thử" className="num">{count(row.mock_attempts)}</td>
                    <td data-label="Trung vị điểm" className="num">{score(row.mock_median)}</td>
                    <td data-label="Đề đầu → gần nhất" className="num">{change(row.first_to_latest)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {schools.hidden.map((school) => (
        <span className="admin-note" key={school.name}>
          {school.name} ({[school.region, `${school.learners} học viên`].filter(Boolean).join(', ')}) được ẩn vì dưới {minimum} học viên; vẫn được tính trong số liệu toàn quốc.
        </span>
      ))}
      <span className="admin-note">“–”: số liệu được ẩn vì dưới {minimum} học viên đồng ý dùng dữ liệu cho nghiên cứu.</span>
    </section>
  )
}

const COST_COLOURS = ['#1E7A4F', '#7FC8A0', '#D4EDDF', '#C9D0CC']

// MOCK: the amounts are illustrative (dashboardCost.ts), not in the handover mock and not in the Excel
// file. They are nationwide, so a view narrowed to a school, an audience or a region shows none.
export function Cost({ kpis, ai, period, filtered }: { kpis: Kpis; ai: AiSafety | null; period: string; filtered: boolean }) {
  const cost = filtered ? null : costView(period, kpis, ai)
  const badge = <span className="sample-badge">Số liệu minh hoạ</span>
  if (cost === null) {
    return (
      <section id="cost" aria-labelledby="cost-title" className="admin-card">
        <div className="head"><h2 id="cost-title">Chi phí vận hành</h2>{badge}</div>
        <p className="admin-sub">
          {filtered ? 'Chi phí chỉ có ở cấp toàn quốc. Bỏ bộ lọc cơ sở, đối tượng và vùng để xem.' : `Chưa có số liệu chi phí cho ${month(period)}.`}
        </p>
      </section>
    )
  }
  const before = month(cost.previousPeriod)
  const moved = (now: number | null, then: number | null) => {
    const d = now === null || then === null ? null : delta(now, then)
    return d === null ? '' : ` · ${d} so với ${before}`
  }
  return (
    <>
      <section id="cost" aria-labelledby="cost-title" className="admin-card">
        <div className="head"><h2 id="cost-title">Chi phí vận hành</h2>{badge}</div>
        <span className="admin-note" style={{ marginTop: -8 }}>Toàn quốc · {month(period)}{moved(cost.total, cost.totalPrevious)}</span>
        <div className="bank-total"><strong>{dong(cost.total)}</strong><span>trong tháng</span></div>
        <span aria-hidden="true" className="bank-split">
          {COST_PARTS.map((part, i) => <span key={part.key} style={{ flex: `${cost.parts[part.key]} 1 0`, background: COST_COLOURS[i] }} />)}
        </span>
        <div className="facts">
          {COST_PARTS.map((part, i) => (
            <div key={part.key}>
              <span className="cost-part"><i aria-hidden="true" style={{ background: COST_COLOURS[i] }} />{part.label}</span>
              <strong>{dong(cost.parts[part.key])} · {sharePct(cost.parts[part.key] / cost.total)}</strong>
            </div>
          ))}
        </div>
      </section>
      <section aria-labelledby="unit-title" className="admin-card">
        <div className="head"><h2 id="unit-title">Hiệu quả trên đầu học viên</h2>{badge}</div>
        <span className="admin-note" style={{ marginTop: -8 }}>
          Chi phí minh hoạ chia cho số học viên, câu luyện tập và câu trả lời thật của {month(period)}
        </span>
        <div className="facts">
          <div><span>Chi phí mỗi học viên hoạt động</span><strong>{dong(cost.perActive)}{moved(cost.perActive, cost.perActivePrevious)}</strong></div>
          <div><span>Chi phí mỗi tài khoản đã kích hoạt</span><strong>{dong(cost.perActivated)}</strong></div>
          <div><span>Chi phí mỗi câu luyện tập đã làm</span><strong>{dong(cost.perPracticeItem)}</strong></div>
          <div><span>Chi phí AI mỗi câu trả lời</span><strong>{dong(cost.aiPerAnswer)}</strong></div>
          <div><span>Chi phí AI mỗi học viên hoạt động</span><strong>{dong(cost.aiPerActive)}</strong></div>
          <div><span>Câu luyện tập mỗi học viên hoạt động</span><strong>{days(cost.practicePerActive)}</strong></div>
          <div><span>Lượt thi thử mỗi học viên hoạt động</span><strong>{days(cost.mocksPerActive)}</strong></div>
        </div>
      </section>
    </>
  )
}

export function Operations({ compliance }: { compliance: Compliance }) {
  const target = seconds(compliance.chat_target_ms)
  const met = compliance.chat_p95_ms !== null && compliance.chat_p95_ms < compliance.chat_target_ms
  return (
    <section id="ops" aria-labelledby="ops-title" className="admin-card" style={{ gap: 4 }}>
      <h2 id="ops-title" style={{ marginBottom: 8 }}>Vận hành và tuân thủ</h2>
      <div className="facts">
        <div>
          <span>Độ trễ một lượt hỏi đáp (P95)</span>
          <strong>
            {seconds(compliance.chat_p95_ms)}
            {compliance.chat_p95_ms !== null && <span className={met ? 'ops-tag' : 'ops-tag att'}>{met ? 'Đạt' : 'Chưa đạt'} &lt; {target}</span>}
          </strong>
        </div>
        <div>
          <span>Đồng ý dùng dữ liệu cho nghiên cứu</span>
          <strong>{count(compliance.research_consent_learners)} học viên · {sharePct(compliance.research_consent_share)}</strong>
        </div>
        <div>
          <span>Rút đồng ý / yêu cầu xóa dữ liệu</span>
          <strong>
            {count(compliance.consent_withdrawals)} / {count(compliance.deletion_requests)}
            {compliance.deletion_median_days !== null && ` · xử lý trung vị ${days(compliance.deletion_median_days)} ngày`}
          </strong>
        </div>
      </div>
    </section>
  )
}
