import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ApiError, staffApi, type AdminOverview } from '../../api'
import { onStaffSignedOut, staffSession } from '../../client'
import { LoadError, Loading } from '../../components/Status'
import { periodLabel, type FilterOption } from '../../dashboard'
import { formatDate, formatTime } from '../../format'
import { Accuracy, Alerts, Bank, Cost, KpiTiles, Operations, Safety, Schools, WeeklyActive } from './OverviewBlocks'
import './admin.css'

// '' means "not chosen": every school, both audiences, every region; for the period, the server's default.
type Filters = { period: string; school: string; audience: string; region: string }
const NO_FILTERS: Filters = { period: '', school: '', audience: '', region: '' }

const query = (filters: Filters) =>
  new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '')).toString()

// An option the view was asked for but the server does not offer (a school under the minimum) stays selectable.
const withSelected = (options: FilterOption[], value: string) =>
  value === '' || options.some((option) => option.value === value) ? options : [...options, { value, label_vi: value }]

async function signOut() {
  try {
    await staffApi.post('/auth/logout')
  } catch {
    // the tokens are forgotten below in any case
  }
  staffSession.signOut()
}

// Quản lý cấp Bộ · Tổng quan toàn quốc (mock/AdminOverview.dc.html), outside the phone frame. Read-only:
// aggregates the server computed for the chosen filters, groups under the minimum withheld. Left out
// until there is data behind them: uptime, incidents and backups, "Chỉ tiêu theo thuyết minh", the
// PDF report, the release filter, "Chi tiết" and the mock's hand-written commentary. "Chi phí vận hành"
// and "Hiệu quả trên đầu học viên" are not in the mock: their amounts are illustrative, set in the client.
export function Overview() {
  const [signedIn, setSignedIn] = useState(staffSession.signedIn())
  const [filters, setFilters] = useState(NO_FILTERS)
  const [view, setView] = useState<AdminOverview>()
  const [error, setError] = useState<ApiError>()
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string>()

  useEffect(() => onStaffSignedOut(() => setSignedIn(false)), [])
  useEffect(() => {
    if (!signedIn) return
    let alive = true
    setLoading(true)
    setError(undefined)
    staffApi.get<AdminOverview>(`/admin/dashboard/overview?${query(filters)}`).then(
      (loaded) => alive && (setView(loaded), setLoading(false)),
      (e) => alive && (setError(e as ApiError), setLoading(false)),
    )
    return () => {
      alive = false
    }
  }, [signedIn, filters, attempt])

  if (!signedIn) return <Navigate to="/quan-ly/dang-nhap" replace />

  const choose = (key: keyof Filters) => (value: string) => setFilters((current) => ({ ...current, [key]: value }))
  const download = async () => {
    setExporting(true)
    setExportError(undefined)
    try {
      const { blob, fileName } = await staffApi.download(`/admin/dashboard/export?${query(filters)}`)
      const url = URL.createObjectURL(blob)
      const link = Object.assign(document.createElement('a'), { href: url, download: fileName ?? `tong-quan-${view?.period ?? 'ky'}.xlsx` })
      document.body.append(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setExportError((e as Error).message)
    }
    setExporting(false)
  }

  const scope = view === undefined ? ''
    : view.filters.schools.find((s) => s.value === view.selected.school)?.label_vi ?? view.selected.school ?? view.selected.region ?? 'tất cả cơ sở'
  return (
    <div className="admin">
      <nav className="admin-nav" aria-label="Khu vực báo cáo">
        <div className="admin-brand">
          <strong>Ôn thi năng lực<br />Y học dự phòng</strong>
          <span>Quản lý cấp Bộ · chỉ xem</span>
        </div>
        <a href="#top" aria-current="page">Tổng quan</a>
        {view && !view.suppressed && (
          <>
            <a href="#reach">Tiếp cận và sử dụng</a>
            <a href="#learning">Kết quả học tập</a>
            <a href="#content">Nội dung và thẩm định</a>
            <a href="#ai">An toàn câu trả lời AI</a>
            <a href="#cost">Chi phí và hiệu quả</a>
            <a href="#ops">Vận hành và tuân thủ</a>
          </>
        )}
        <span className="spacer" />
        <button type="button" className="signout" onClick={signOut}>Đăng xuất</button>
      </nav>
      <div className="admin-main">
        <main id="top">
          <header className="admin-head">
            <div>
              <div className="admin-title">
                <h1>Tổng quan toàn quốc</h1>
                {view?.sample_data && <span className="sample-badge">Dữ liệu mẫu</span>}
              </div>
              {view && (
                <span className="admin-sub">
                  {periodLabel(view.period)} · số liệu tính lúc {formatTime(view.computed_at)} ngày {formatDate(view.computed_at)} · nhóm
                  dưới {view.suppression_min} học viên được ẩn
                </span>
              )}
            </div>
            <button type="button" className="admin-btn" onClick={download} disabled={exporting || view === undefined}>
              {exporting ? 'Đang xuất…' : 'Xuất Excel'}
            </button>
          </header>
          {exportError && <p className="warn" role="alert">{exportError}</p>}

          {view && (
            <div role="group" aria-label="Bộ lọc" className="admin-filters">
              <Select label="Kỳ" value={view.selected.period} options={withSelected(view.filters.periods, view.selected.period)} onChange={choose('period')} />
              <Select label="Cơ sở đào tạo" all="Tất cả" value={filters.school} options={withSelected(view.filters.schools, filters.school)}
                onChange={choose('school')} />
              <Select label="Đối tượng" all="Tất cả" value={filters.audience} options={view.filters.audiences} onChange={choose('audience')} />
              <Select label="Vùng" all="Toàn quốc" value={filters.region} options={view.filters.regions} onChange={choose('region')} />
            </div>
          )}

          {loading && !view && <Loading />}
          {error && <LoadError message={error.message} onRetry={error.status === 403 ? undefined : () => setAttempt((n) => n + 1)} />}
          {view && !error && (view.suppressed || view.kpis === null ? (
            <p className="admin-notice" role="status">Không đủ học viên để hiển thị số liệu cho bộ lọc này.</p>
          ) : (
            <div className="admin-blocks" aria-busy={loading}>
              <KpiTiles kpis={view.kpis} period={view.period} />
              <div className="admin-grid">
                {view.weekly_active && <WeeklyActive weekly={view.weekly_active} scope={scope} />}
                <Alerts alerts={view.alerts} />
              </div>
              <div className="admin-grid">
                {view.accuracy_by_module && <Accuracy accuracy={view.accuracy_by_module} period={view.period} />}
                {view.question_bank && <Bank bank={view.question_bank} period={view.period} />}
                {view.ai_safety && <Safety ai={view.ai_safety} period={view.period} />}
              </div>
              {view.schools && <Schools schools={view.schools} minimum={view.suppression_min} />}
              <div className="admin-grid">
                <Cost kpis={view.kpis} ai={view.ai_safety} period={view.period}
                  filtered={view.selected.school !== null || view.selected.audience !== null || view.selected.region !== null} />
              </div>
              <div className="admin-grid">
                {view.compliance && <Operations compliance={view.compliance} />}
              </div>
            </div>
          ))}
        </main>
      </div>
    </div>
  )
}

function Select({ label, value, options, all, onChange }:
  { label: string; value: string; options: FilterOption[]; all?: string; onChange: (value: string) => void }) {
  return (
    <label>
      {label}:
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {all !== undefined && <option value="">{all}</option>}
        {options.map((option) => <option key={option.value} value={option.value}>{option.label_vi}</option>)}
      </select>
    </label>
  )
}
