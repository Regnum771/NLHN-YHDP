// Rehearsal of Quản lý cấp Bộ · Tổng quan toàn quốc, through the real UI in headless Chrome.
//   npm run rehearse:dashboard
// It resets NO database. It needs a backend that serves a database holding the sample cohort
// (`python -m seed.cohort --learners 300 --weeks 12 --seed 42`, see the README), the web client in
// front of it, and a ministry viewer made with `python -m app.cli create-staff --role ministry_viewer`.
//   DASHBOARD_EMAIL, DASHBOARD_PASSWORD   that viewer's sign-in (required)
//   REHEARSE_BASE                         where the web client is served, when not http://localhost:5173
//   DASHBOARD_LEARNER_CODE                an activation code of a learner, when not the seed's DEMO-0001
//   REHEARSE_SHOTS                        a folder: pictures of the page are saved there
// The checks on CSĐT F and "Dữ liệu mẫu" depend on the cohort: school F has 8 learners, under the minimum of 10.
import { join } from 'node:path'
import { chromium } from 'playwright-core'

const base = process.env.REHEARSE_BASE ?? 'http://localhost:5173'
const EMAIL = process.env.DASHBOARD_EMAIL
const PASSWORD = process.env.DASHBOARD_PASSWORD
const LEARNER_CODE = process.env.DASHBOARD_LEARNER_CODE ?? 'DEMO-0001'
const SHOTS = process.env.REHEARSE_SHOTS
const STAFF_KEY = 'yhdp.staff'
const LEARNER_KEY = 'yhdp.session'
const HEADINGS = ['Học viên hoạt động mỗi tuần', 'Cần chú ý', 'Câu đúng theo miền', 'Ngân hàng câu hỏi', 'An toàn câu trả lời AI',
  'Theo cơ sở đào tạo', 'Vận hành và tuân thủ']
const SUPPRESSED = 'Không đủ học viên để hiển thị số liệu cho bộ lọc này.'
// The page's one sentence about prediction denies it; nothing else may mention an outcome (FR-LRN-26).
const DENIAL = 'Điểm là kết quả thi thử thật, không phải dự đoán'
const PREDICTION = /dự đoán|xác suất|khả năng đỗ|khả năng đậu|điểm dự kiến|tỷ lệ đỗ/i

if (!EMAIL || !PASSWORD) {
  console.error('Set DASHBOARD_EMAIL and DASHBOARD_PASSWORD to a ministry viewer of the backend under test.')
  process.exit(1)
}

const b = await chromium.launch({ channel: 'chrome', headless: true })
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
p.setDefaultTimeout(8000)
const errors = []
const tolerated = new Set()
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
p.on('console', (m) => {
  if (m.type() !== 'error') return
  const status = Number(/status of (\d+)/.exec(m.text())?.[1])
  if (!tolerated.has(status)) errors.push('console: ' + m.text())
})
p.on('response', (r) => r.status() >= 400 && !tolerated.has(r.status()) && errors.push(`http ${r.status()} ${r.url()}`))
const expecting = async (status, step) => {
  tolerated.add(status)
  try {
    return await step()
  } finally {
    await p.waitForTimeout(150)
    tolerated.clear()
  }
}
const ok = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  -- ' + extra : ''}`)
  if (!cond) process.exitCode = 1
}
const shot = async (name) => SHOTS && p.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true })
const heading = (name) => p.getByRole('heading', { name, exact: true })
const select = (label) => p.getByRole('group', { name: 'Bộ lọc' }).getByLabel(label)
const dots = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
const oneDecimal = (n) => (Math.round(n * 10) % 10 === 0 ? String(Math.round(n)) : n.toFixed(1).replace('.', ','))
const staffToken = () => p.evaluate((key) => JSON.parse(localStorage.getItem(key)).access_token, STAFF_KEY)
const overview = async (query = '') =>
  (await p.request.get(`${base}/api/v1/admin/dashboard/overview${query}`, { headers: { Authorization: `Bearer ${await staffToken()}` } })).json()
// Choosing a filter reloads the view: the request carries it, and the page has the answer when this returns.
const choose = async (label, option, param) => {
  const [request] = await Promise.all([
    p.waitForRequest((r) => r.url().includes('/admin/dashboard/overview')),
    select(label).selectOption({ label: option }),
  ])
  await (await request.response())?.finished()
  await p.waitForTimeout(100)
  return new URL(request.url()).searchParams.get(param)
}

try {
  // 1. Sign-in: the page is closed without a staff session; a wrong password says so; the right one opens it.
  await p.goto(base + '/quan-ly')
  await p.waitForURL('**/quan-ly/dang-nhap')
  ok('without a staff session the page leads to the staff sign-in', true)
  await p.getByLabel('Email').fill(EMAIL)
  await p.getByLabel('Mật khẩu').fill(PASSWORD + '-sai')
  await expecting(401, () => p.getByRole('button', { name: 'Đăng nhập' }).click().then(() => p.getByRole('alert').waitFor()))
  ok('a wrong password shows the server\'s message', (await p.getByRole('alert').innerText()).trim().length > 0)
  await p.getByLabel('Mật khẩu').fill(PASSWORD)
  await p.getByRole('button', { name: 'Đăng nhập' }).click()
  await heading('Tổng quan toàn quốc').waitFor()
  await heading(HEADINGS[0]).waitFor()
  ok('signing in opens Tổng quan toàn quốc', new URL(p.url()).pathname === '/quan-ly')
  ok('no learner session was made', (await p.evaluate((key) => localStorage.getItem(key), LEARNER_KEY)) === null)

  // 2. The blocks, on the server's figures.
  const view = await overview()
  for (const name of HEADINGS) ok(`block "${name}"`, await heading(name).isVisible())
  ok('"Dữ liệu mẫu" is shown on a view of sample learners', view.sample_data && (await p.getByText('Dữ liệu mẫu', { exact: true }).isVisible()))
  const header = await p.locator('.admin-head').innerText()
  ok('the header says the period, when the figures were computed and the small-group rule',
    /Tháng \d+\/\d{4} · số liệu tính lúc \d\d:\d\d ngày \d\d\/\d\d\/\d{4} · nhóm\s+dưới 10 học viên được ẩn/.test(header), header.replace(/\s+/g, ' '))
  const tile = p.locator('.kpi', { hasText: 'Học viên hoạt động trong tháng' }).locator('.kpi-value')
  ok('the first tile is the server\'s count of active learners', (await tile.innerText()) === dots(view.kpis.active_learners),
    `${await tile.innerText()} / ${view.kpis.active_learners}`)
  const chartLabel = await p.getByRole('img', { name: /Học viên hoạt động mỗi tuần: từ/ }).getAttribute('aria-label')
  const weeks = view.weekly_active.weeks
  ok('the chart\'s label carries the real first and last values',
    chartLabel.includes(`từ ${dots(weeks[0].active_learners)} `) && chartLabel.includes(`đến ${dots(weeks.at(-1).active_learners)} `), chartLabel)
  const rows = await p.locator('table.schools tbody tr th').allInnerTexts()
  ok('the table has the visible schools, in the server\'s order', rows.join('|') === view.schools.rows.map((r) => r.name).join('|'), rows.join(', '))
  ok('CSĐT F is not in the table', !rows.includes('CSĐT F'))
  const weekly = await p.locator('table.schools tbody tr').first().locator('td[data-label="Hoạt động / tuần"]').innerText()
  ok('the weekly figure of a school is the one in the file, to one decimal', weekly === oneDecimal(view.schools.rows[0].weekly_active),
    `${weekly} / ${view.schools.rows[0].weekly_active}`)
  const cardText = await p.locator('section', { has: heading('Theo cơ sở đào tạo') }).innerText()
  ok('CSĐT F is named in the footnote with its region and size', /CSĐT F \(Tây Nguyên, 8 học viên\) được ẩn vì dưới 10 học viên/.test(cardText))
  ok('CSĐT F is not offered as a filter', !(await select('Cơ sở đào tạo').locator('option').allInnerTexts()).includes('CSĐT F'))
  const body = (await p.locator('body').innerText()).replace(DENIAL, '')
  ok('nothing on the page predicts an outcome', !PREDICTION.test(body))
  ok('no learner is named: no pseudonym on the page', !/HV-/.test(body))
  await shot('dashboard-1-overview')

  // 3. Filters reload the view.
  // The answer is held back for a moment: until it comes, the figures on screen belong to the old filters and say so.
  const SLOW = '**/admin/dashboard/overview**'
  await p.route(SLOW, async (route) => {
    await new Promise((done) => setTimeout(done, 700))
    await route.continue()
  })
  const choosing = choose('Cơ sở đào tạo', 'CSĐT A', 'school')
  await p.waitForTimeout(250)
  const dimmed = await p.locator('.admin-main [aria-busy="true"]').evaluate((el) => Number(getComputedStyle(el).opacity) < 1).catch(() => false)
  ok('while a filter reloads, the old figures are dimmed', dimmed)
  const sent = await choosing
  await p.unroute(SLOW)
  await p.waitForFunction(() => document.querySelectorAll('table.schools tbody tr').length === 1)
  ok('choosing CSĐT A reloads with the school in the request', sent === 'CSDT-A', String(sent))
  const filtered = await overview('?school=CSDT-A')
  ok('the tile follows the filter', (await tile.innerText()) === dots(filtered.kpis.active_learners))
  await choose('Cơ sở đào tạo', 'Tất cả', 'school')
  await choose('Vùng', 'Tây Nguyên', 'region')
  await p.getByText(SUPPRESSED).waitFor()
  ok('a filter under 10 learners shows only the notice', (await heading(HEADINGS[0]).count()) === 0)
  ok('the filters stay usable on a suppressed view', await select('Vùng').isVisible())
  await shot('dashboard-2-suppressed')
  await choose('Vùng', 'Toàn quốc', 'region')
  await heading(HEADINGS[0]).waitFor()

  // 4. The export, with the signed-in session.
  const [download] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Xuất Excel' }).click()])
  ok('"Xuất Excel" downloads the period\'s file', download.suggestedFilename() === `tong-quan-${view.period}.xlsx`, download.suggestedFilename())

  // 5. A learner is refused.
  const activated = await p.request.post(`${base}/api/v1/auth/activate`, { data: { code: LEARNER_CODE, device: { platform: 'web' } } })
  if (activated.ok()) {
    const learner = await activated.json()
    const refused = await p.request.get(`${base}/api/v1/admin/dashboard/overview`, { headers: { Authorization: `Bearer ${learner.access_token}` } })
    ok('a learner\'s token is refused on the overview', refused.status() === 403, String(refused.status()))
  } else {
    ok('a learner\'s token is refused on the overview', false, `could not sign a learner in with ${LEARNER_CODE}: ${activated.status()}`)
  }

  // 6. A phone: the sidebar is a top bar, the table a list of cards, nothing scrolls sideways.
  await p.setViewportSize({ width: 390, height: 844 })
  await p.waitForTimeout(150)
  const nav = await p.getByRole('navigation', { name: 'Khu vực báo cáo' }).boundingBox()
  ok('under 600 px the sidebar is a bar across the top', nav.width >= 380 && nav.y === 0 && nav.height < 400, JSON.stringify(nav))
  ok('under 600 px the table is a list of cards', !(await p.locator('table.schools thead').isVisible()))
  ok('the page does not scroll sideways', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
  await shot('dashboard-3-phone')
  await p.setViewportSize({ width: 1440, height: 900 })

  // 7. Sign-out.
  await p.getByRole('button', { name: 'Đăng xuất' }).click()
  await p.waitForURL('**/quan-ly/dang-nhap')
  ok('signing out forgets the staff session', (await p.evaluate((key) => localStorage.getItem(key), STAFF_KEY)) === null)
} catch (e) {
  ok('the walk ran to the end', false, e.message.split('\n')[0])
  await shot('dashboard-failure')
}
ok('no browser errors', errors.length === 0, errors.join(' | '))
await b.close()
