// Rehearsal: runs the demo script (README) through the real UI in headless Chrome, from sign-in to sign-out.
//   npm run rehearse                  everything that needs no model
//   npm run rehearse:live             also the model-backed steps: cited answer, "Giải thích thêm", the tutor.
//                                     Needs ANTHROPIC_API_KEY on the backend, or DEMO_REPLAY=1 with a warm replay cache.
//   npm run rehearse -- --until N     stop after section N (the sections are numbered below); or REHEARSE_UNTIL=N
// Requires Google Chrome, the backend on :8000 and `npm run dev` on :5173.
//   REHEARSE_BASE     where the web client is served, when not http://localhost:5173
//   REHEARSE_PYTHON   the Python that runs the backend's CLI, when not backend/.venv
//   REHEARSE_SHOTS    a folder: a picture of each main screen is saved there as the walk passes it
// It EMPTIES THE DATABASE of the backend first (`python -m app.cli reset-dev`). That command refuses
// to run unless the environment says it is a development one: APP_ENV=dev in .env, or in the shell.
//
// The walk depends on the seed: the learner DEMO-0001 has not chosen học phần yet and has g1 as
// focus; the first unit of g1 is u-dt-01, whose first quiz has "5%" (wrong) and "2,5%" (right). The
// day's session is built on the first visit to Home, which comes after that unit, so it holds a card
// and a weak spot.
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
const LIVE = process.argv.includes('--live')
const untilAt = process.argv.indexOf('--until')
const UNTIL = Number(process.env.REHEARSE_UNTIL ?? (untilAt === -1 ? Infinity : process.argv[untilAt + 1])) // the variable: some shells eat "--"
const base = process.env.REHEARSE_BASE ?? 'http://localhost:5173'
const CODE = 'DEMO-0001' // the seed's activation code (backend/config.yaml)
const STORAGE_KEY = 'yhdp.session'
const PREDICTION = /dự đoán|xác suất|khả năng đỗ|khả năng đậu|điểm dự kiến|xu hướng/i

// The seeded state. APP_ENV is passed through untouched: whether this database may be emptied is
// for the environment to say, not for this script.
const backend = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'backend')
const python = process.env.REHEARSE_PYTHON ?? join(backend, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')
try {
  const out = execFileSync(python, ['-m', 'app.cli', 'reset-dev'], {
    cwd: backend, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  })
  console.log(`reset-dev: ${out.trim().split('\n').pop()}`)
} catch (e) {
  console.error(`The database was not reset, so the rehearsal did not run: ${(e.stderr || e.message).trim().split('\n').pop()}`)
  console.error('If this is a development machine, put APP_ENV=dev in .env (see .env.example).')
  process.exit(1)
}
const b = await chromium.launch({ channel: 'chrome', headless: true })
const p = await b.newPage({ viewport: { width: 520, height: 880 } })
p.setDefaultTimeout(LIVE ? 45000 : 8000)
const errors = []
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
// A step that causes a failure on purpose names it here for as long as the step lasts; every other
// failed response or console error fails the rehearsal.
const tolerated = new Set()
const expecting = async (what, step) => {
  what.forEach((w) => tolerated.add(w))
  try {
    return await step()
  } finally {
    await p.waitForTimeout(150) // let the browser log what the step caused
    tolerated.clear()
  }
}
p.on('console', (m) => {
  if (m.type() !== 'error') return
  const status = Number(/status of (\d+)/.exec(m.text())?.[1])
  if (tolerated.has(status) || (tolerated.has('dropped') && /ERR_FAILED/.test(m.text()))) return
  errors.push('console: ' + m.text())
})
p.on('response', (r) => r.status() >= 400 && !tolerated.has(r.status()) && errors.push(`http ${r.status()} ${r.url()}`))
const ok = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  -- ' + extra : ''}`)
  if (!cond) process.exitCode = 1
}
const btn = (name) => p.getByRole('button', { name, exact: true })
const link = (name) => p.getByRole('link', { name, exact: true })
const href = (locator) => locator.getAttribute('href')
const flat = (s) => s.replace(/\s+/g, ' ')
const SHOTS = process.env.REHEARSE_SHOTS
const shot = async (name) => SHOTS && p.screenshot({ path: join(SHOTS, `${name}.png`) })
const token = () => p.evaluate((key) => JSON.parse(localStorage.getItem(key)).access_token, STORAGE_KEY)
const apiGet = async (path) => (await p.request.get(base + '/api/v1' + path, { headers: { Authorization: `Bearer ${await token()}` } })).json()

const finish = async () => {
  ok('No browser errors', errors.length === 0, errors.join(' ; ').slice(0, 300))
  await b.close()
  process.exit(process.exitCode ?? 0)
}
// A section that cannot go on (a screen that never appears) fails the rehearsal there.
const section = async (n, title, run) => {
  try {
    await run()
  } catch (e) {
    ok(`${n}. ${title}: stopped`, false, flat(e.message).slice(0, 220))
    await b.close()
    process.exit(1)
  }
  if (n >= UNTIL) await finish()
}

const giveConsent = async () => {
  await p.getByRole('heading', { name: 'Trước khi bắt đầu' }).waitFor()
  const proceed = btn('Tiếp tục')
  const disabledFirst = await proceed.isDisabled()
  await p.getByRole('checkbox', { name: 'Tôi đồng ý (bắt buộc)' }).check()
  await proceed.click()
  return disabledFirst
}

await section(0, 'Sign in and consent', async () => {
  await p.goto(base + '/')
  await p.getByRole('heading', { name: 'Đăng nhập' }).waitFor()
  ok('0.1 Sign-in screen is shown first', await p.getByLabel('Mã kích hoạt').isVisible())
  await expecting([401], async () => {
    await p.getByLabel('Mã kích hoạt').fill('SAI-0000')
    await btn('Đăng nhập').click()
    await p.getByRole('alert').waitFor()
  })
  ok('0.2 Sign-in: a wrong code is refused with the server\'s message',
    (await p.getByRole('alert').innerText()).includes('Mã kích hoạt không đúng')
    && (await p.getByLabel('Mã kích hoạt').inputValue()) === 'SAI-0000')
  ok('0.3 Sign-in: the field keeps the keyboard focus after a refusal',
    await p.evaluate(() => document.activeElement?.tagName === 'INPUT'))
  await p.getByLabel('Mã kích hoạt').fill(CODE)
  await btn('Đăng nhập').click()
  ok('0.4 Consent: "Tiếp tục" waits for the required consent', await giveConsent())
})

await section(1, 'Chọn học phần', async () => {
  await p.getByRole('heading', { name: 'Bạn muốn tập trung ôn chủ đề nào?' }).waitFor()
  ok('1.1 Chọn học phần comes after consent', p.url().endsWith('/chon-hoc-phan'))
  await shot('01-chon-hoc-phan')
  const g1 = p.getByRole('checkbox', { name: /Sức khỏe quần thể và dự phòng/ })
  ok('1.2 The learner\'s focus is pre-selected', (await g1.isChecked()) && (await p.getByText('Đã chọn 1 học phần').isVisible()))
  const skip = btn('Bỏ qua, vào học ngay')
  const diagnostic = btn('Làm bài đánh giá năng lực')
  await g1.uncheck()
  const waited = (await skip.isDisabled()) && (await diagnostic.isDisabled())
  await g1.check()
  ok('1.3 Both buttons wait for a choice', waited && (await skip.isEnabled()) && (await diagnostic.isEnabled()))
  let dropped = 0
  await p.route('**/api/v1/me', (route) => (route.request().method() === 'PATCH' && dropped++ === 0 ? route.abort() : route.continue()))
  await expecting(['dropped'], async () => {
    await skip.click()
    await p.getByRole('alert').waitFor()
  })
  ok('1.4 A failed save keeps the choice', (await g1.isChecked()) && p.url().endsWith('/chon-hoc-phan'))
  await skip.click()
  await p.getByRole('heading', { name: 'Tỷ lệ hiện mắc' }).waitFor()
  await p.unroute('**/api/v1/me')
  const inUnit = p.url().endsWith('/luyen-tap/u-dt-01')
  await p.reload()
  await p.getByRole('heading', { name: 'Tỷ lệ hiện mắc' }).waitFor()
  ok('1.5 "Bỏ qua, vào học ngay" opens the first unit, once', inUnit && p.url().endsWith('/luyen-tap/u-dt-01'))
})

await section(2, 'The first unit', async () => {
  await btn('Tiếp tục').click()
  await p.getByRole('radio', { name: '5%', exact: true }).waitFor()
  // The hint asks the model when the backend has a key, and points to the source when it has none.
  let hintCalls = 0
  const countHint = (r) => r.url().endsWith('/hint') && hintCalls++
  p.on('request', countHint)
  const hintReply = p.waitForResponse((r) => r.url().endsWith('/hint'), { timeout: 20000 })
  await btn('Gợi ý').click()
  const hint = p.getByRole('dialog', { name: 'Gợi ý' })
  await hint.locator('button.chip').first().waitFor({ timeout: 20000 })
  const hintText = await hint.innerText()
  const generated = (await (await hintReply).json()).generated
  ok('2.1b The AI mark is on a hint a model wrote, and only on that', typeof generated === 'boolean'
    && (await hint.getByText('Gợi ý do AI viết').count()) === (generated ? 1 : 0), `generated: ${generated}`)
  if (generated) {
    const colour = await hint.getByText('Gợi ý do AI viết').evaluate((el) => getComputedStyle(el).color)
    ok('2.1c The words beside the AI star are not gold (gold is the star\'s, and too pale for text)',
      colour !== 'rgb(185, 122, 20)', colour)
  }
  ok('2.1 "Gợi ý" is offered before the answer, with its source',
    hintText.length > 30 && /tr\. \d+/.test(await hint.locator('button.chip').first().innerText()), flat(hintText).slice(0, 140))
  ok('2.2 The hint does not give the answer', !hintText.includes('2,5%') && !hintText.includes('2.5'))
  await shot('02-goi-y')
  await btn('Đóng').click()
  await btn('Gợi ý').click()
  await hint.locator('button.chip').first().waitFor()
  await btn('Đóng').click()
  p.off('request', countHint)
  ok('2.3 One hint per item', hintCalls === 1, `${hintCalls} call(s)`)

  await p.getByRole('radio', { name: '5%', exact: true }).click()
  await btn('Kiểm tra').click()
  await p.getByText('Chưa đúng — đáp án là 2,5%').waitFor()
  ok('2.4 After the answer the hint is gone', (await btn('Gợi ý').count()) === 0 && (await btn('Giải thích thêm').isVisible()))
  ok('2.5 Unit: wrong answer shows expert explanation first', await p.getByText('50 ÷ 2.000 = 2,5%. Tử số là').isVisible())
  ok('2.6 Unit: remediation note', await p.getByText('Đã thêm 1 ví dụ vào lộ trình vì bạn chọn 5% — hãy xem lại mẫu số.').isVisible())
  if (LIVE) {
    await btn('Giải thích thêm').click()
    const dlg = p.getByRole('dialog')
    await dlg.locator('button.cite').first().waitFor()
    const t = await dlg.innerText()
    ok('2.7 Tutor: cited explanation', t.length > 80, flat(t).slice(0, 200))
    await btn('Đóng').click()
  }
  await btn('Tiếp tục').click()
  await p.getByText('Được thêm vì bạn chọn 5% ở câu trước').waitFor()
  ok('2.8 Unit: remediation inserted with its reason', true)
  for (let i = 0; i < 12; i++) {
    if (await p.getByText('Xong chủ đề').isVisible()) break
    if (await btn('Kiểm tra').isVisible()) {
      const stem = await p.locator('h2.title').innerText()
      const pick = stem.includes('chỉ đếm các ca bệnh mới') ? 'Tỷ lệ mới mắc' : 'Tăng'
      await p.getByRole('radio', { name: pick, exact: true }).click()
      await btn('Kiểm tra').click()
      await p.getByText('✓ Đúng').waitFor()
    }
    await btn('Tiếp tục').click()
    await p.waitForTimeout(250)
  }
  ok('2.9 The end screen leads to the cards', (await p.getByText('Đã tạo 1 thẻ ôn từ câu sai').isVisible())
    && (await href(link('Ôn ngay'))) === '/luyen-tap/on-the')
})

await section(3, 'Trang chủ', async () => {
  await link('Về Luyện tập').click()
  await link('Trang chủ').click()
  const tile = p.getByRole('link', { name: /Ôn nhanh \d+ câu/ })
  await tile.waitFor()
  const n = Number(/Ôn nhanh (\d+) câu/.exec(await tile.innerText())[1])
  ok('3.1 The green tile starts the session', (await href(tile)) === '/phien' && n >= 7, `${n} câu`)
  ok('3.2 No suggestion card on a first visit', (await p.getByRole('heading', { name: 'Đề xuất từ gia sư' }).count()) === 0)
  ok('3.3 "Tiếp tục" shows where the learner left off',
    /chủ đề \d+\/\d+/.test(await p.getByRole('link', { name: /Đo lường tần suất bệnh/ }).innerText()))
  ok('3.4 Next mock shown', await p.getByText('Đề thi thử số 1').isVisible())
  await shot('03-trang-chu')

  // Suggestions are news of the previous visit, so a first visit has none: the card is checked on a
  // real response with three lines added.
  await p.route('**/api/v1/home', async (route) => {
    const response = await route.fetch()
    const body = await response.json()
    body.tutor_suggestions = [
      { kind: 'cards_created', text_vi: 'Tạo 2 thẻ ôn từ câu bạn trả lời sai', action: { label_vi: 'Xem thẻ', target: 'cards', id: null } },
      { kind: 'example_added', text_vi: 'Thêm 1 ví dụ vào lộ trình vì câu bạn trả lời sai', action: null },
      { kind: 'practice_added', text_vi: 'Bổ sung 6 câu luyện cho hôm nay', action: { label_vi: 'Luyện', target: 'practice_set', id: '31' } },
    ]
    return route.fulfill({ response, json: body })
  })
  const writes = []
  const noteWrite = (r) => r.url().includes('/api/v1/') && r.method() !== 'GET' && writes.push(`${r.method()} ${r.url()}`)
  p.on('request', noteWrite)
  await p.reload()
  const card = p.getByRole('region', { name: 'Đề xuất từ gia sư' })
  await card.waitFor()
  ok('3.5 Suggestions are links, not actions',
    (await href(card.getByRole('link', { name: 'Xem thẻ' }))) === '/luyen-tap/on-the'
    && (await href(card.getByRole('link', { name: 'Luyện' }))) === '/luyen-tap/bo-cau/31'
    && (await card.getByText('Thêm 1 ví dụ vào lộ trình vì câu bạn trả lời sai').isVisible())
    && (await card.getByRole('link').count()) === 2 && writes.length === 0, writes.join(' ; '))
  p.off('request', noteWrite)
  await p.unroute('**/api/v1/home')

  await btn('Tài khoản').click()
  const account = p.getByRole('dialog', { name: 'Tài khoản' })
  ok('3.6 The avatar opens the account sheet',
    (await account.getByRole('link', { name: 'Đổi học phần' }).isVisible()) && (await account.getByRole('button', { name: 'Đăng xuất' }).isVisible()))
  await btn('Đóng').click()
  await p.reload()
  await tile.waitFor()
  ok('3.7 Home: the session survives a reload', true)
})

await section(4, 'Phiên hôm nay, step 1: thẻ ôn', async () => {
  await p.getByRole('link', { name: /Ôn nhanh \d+ câu/ }).click()
  await p.waitForURL('**/phien/the')
  await p.getByText('Thẻ 1/1').waitFor()
  ok('4.1 "Ôn nhanh" opens step 1', (await p.getByText('Phiên hôm nay').isVisible()) && !(await p.getByRole('navigation').isVisible()))
  const steps = await p.getByRole('list', { name: 'Các bước của phiên' }).getByRole('listitem').allInnerTexts()
  await btn('Vì sao thứ tự này?').click()
  ok('4.2 The bar names the three steps and the order is explained',
    ['Thẻ ôn', 'Luyện điểm yếu', 'Học tiếp'].every((label, i) => steps[i]?.includes(label))
    && (await p.getByText(/thẻ đến hạn hôm nay/).first().isVisible()), steps.map(flat).join(' | '))
  await btn('Lật thẻ').click()
  const why = btn('Vì sao ôn câu này?')
  const collapsed = (await btn('Nguồn').getAttribute('aria-expanded')) === 'false' && (await why.getAttribute('aria-expanded')) === 'false'
  await why.click()
  ok('4.3 Reasons and source are collapsed on the back', collapsed
    && (await p.getByText('Bạn đã trả lời sai câu này.').isVisible()) && (await p.getByText('Từ quiz học phần').isVisible()))
  const ratings = (await p.locator('footer.footer button').allInnerTexts()).map(flat)
  await shot('04-phien-the')
  ok('4.4 Four ratings with their intervals',
    ratings.length === 4 && ['Học lại', 'Khó', 'Tốt', 'Dễ'].every((label, i) => ratings[i].includes(label) && /\d|</.test(ratings[i])),
    ratings.join(' | '))
  await p.getByRole('button', { name: /Tốt/ }).click()
  await p.getByText('Xong 1 thẻ').waitFor()
  await shot('05-phien-the-xong')
  const done = await p.locator('.body').innerText()
  ok('4.5 The finished screen is counted from this pass',
    done.includes('Nhớ đúng 1/1') && done.includes('Luyện điểm yếu') && done.includes('6 câu')
    && (await link('Dừng ở đây, về trang chủ').isVisible()), flat(done).slice(0, 200))
  await p.goto(base + '/phien/the')
  await p.getByText('Không còn thẻ nào đến hạn').waitFor()
  const offersNext = await link('Tiếp tục').isVisible()
  await p.goto(base + '/phien')
  await p.waitForURL('**/phien/luyen')
  ok('4.6 A step with nothing left moves on', offersNext)
})

await section(5, 'Phiên hôm nay, step 2 and the adapting screen', async () => {
  await p.getByText('Câu 1/6').waitFor()
  ok('5.1 Step 2 follows the cards', p.url().endsWith('/phien/luyen'))
  await btn('Vì sao câu này?').click()
  const reason = await p.locator('#item-reason').innerText()
  ok('5.2 Each item says why it was chosen', reason.trim().length > 10, flat(reason))
  const answer = async () => {
    await p.getByRole('radio').first().click()
    await btn('Kiểm tra').click()
    await p.locator('.dark-panel').waitFor()
  }
  await answer()
  const after = await p.locator('.body').innerText()
  ok('5.3 The expert explanation comes first, then what happens next',
    /✓ Đúng|✕ Chưa đúng/.test(after) && (await p.getByText('Giải thích của chuyên gia').isVisible()) // a label: shown in capitals
    && (await p.locator('.dark-panel').innerText()).includes('Câu tiếp theo') && !/khó hơn|dễ hơn/i.test(after))
  await shot('06-phien-luyen')
  const stem = (await p.locator('h2.title').innerText()).trim()
  await btn('Hỏi gia sư về câu này').click()
  await p.waitForURL('**/hoi-dap/tu-cau-hoi/**')
  const context = p.getByRole('region', { name: 'Đang hỏi về' })
  await context.waitFor()
  const starter = p.getByRole('button', { name: /^(Sao mình sai câu này\?|Giải thích thêm về câu này)$/ })
  ok('5.4 "Hỏi gia sư về câu này" opens the quiz chat',
    !(await p.getByRole('navigation').isVisible()) && (await context.innerText()).includes('Đang hỏi về: Câu 1')
    && (await context.innerText()).includes(stem.slice(0, 30)) && (await starter.count()) === 1, flat(await context.innerText()))
  if (LIVE) {
    await starter.click()
    const quizChip = p.getByRole('button', { name: /^Đã tra \d+ nguồn/ }).last()
    await quizChip.waitFor({ timeout: 45000 })
    await quizChip.click()
    const quizSteps = await p.locator(`#${await quizChip.getAttribute('aria-controls')} li`).allInnerTexts()
    ok('5.4b The first answer is about the item', quizSteps.includes('Xem câu hỏi bạn vừa làm')
      && (await p.locator('.card').last().locator('button.cite').count()) > 0, quizSteps.join(' | '))
    await btn('Quay lại bài luyện').click()
    await p.waitForURL('**/phien/luyen**')
    await p.getByText('Câu 1/6').waitFor()
    ok('5.4b "Quay lại bài luyện" returns to the same item', true)
  }
  await p.goto(base + '/hoi-dap/tu-cau-hoi/q-dt-02')
  await p.getByLabel('Câu hỏi của bạn').waitFor()
  ok('5.4c Opened without its context it is an ordinary chat',
    (await p.getByRole('region', { name: 'Đang hỏi về' }).count()) === 0 && (await p.getByLabel('Câu hỏi của bạn').isEnabled())
    && (await p.getByText('Hỏi về nội dung ôn thi. Mỗi câu trả lời đều kèm nguồn và số trang.').isVisible()))
  await p.goto(base + '/phien/luyen')
  let resent = 0
  const countAnswer = (r) => r.method() === 'POST' && r.url().endsWith('/responses') && resent++
  p.on('request', countAnswer)
  await p.reload()
  await p.getByText('Câu 2/6').waitFor()
  p.off('request', countAnswer)
  const firstDot = await p.getByRole('list', { name: 'Kết quả từng câu' }).getByRole('listitem').first().innerText()
  ok('5.5 A reload resumes in place', /đúng|sai/.test(firstDot) && resent === 0, flat(firstDot))

  await p.goto(base + '/phien/dieu-chinh')
  await p.waitForURL('**/phien/luyen')
  const open = await apiGet('/session/today/practice')
  ok('5.6 The adapting screen never closes an unfinished set', open.completed === false && open.answered === 1)

  await p.getByText('Câu 2/6').waitFor()
  // the reply to the answer of item 2 is lost on the way back: the choice is locked, and the retry sends it again
  let lost = 0
  await p.route('**/api/v1/session/today/practice/responses', async (route) => {
    const response = await route.fetch() // the server records the answer either way
    return lost++ === 0 ? route.abort() : route.fulfill({ response })
  })
  await p.getByRole('radio').first().click()
  await expecting(['dropped'], async () => {
    await btn('Kiểm tra').click()
    await p.getByRole('alert').waitFor()
  })
  const choiceLocked = await p.getByRole('radio').nth(1).isDisabled()
  await btn('Kiểm tra').click()
  await p.locator('.dark-panel').waitFor()
  await p.unroute('**/api/v1/session/today/practice/responses')
  ok('5.6b An answer whose reply was lost cannot be changed, and is sent again', choiceLocked && lost === 2, `${lost} request(s)`)
  await btn('Câu tiếp').click()
  await p.getByText('Câu 3/6').waitFor()
  for (let n = 3; n <= 6; n++) {
    await answer()
    if (n < 6) {
      await btn('Câu tiếp').click()
      await p.getByText(`Câu ${n + 1}/6`).waitFor()
    }
  }
  ok('5.7 The last item completes the set', await btn('Hoàn thành bài luyện').isVisible())
  await btn('Hoàn thành bài luyện').click()
  await p.waitForURL('**/phien/dieu-chinh')
  await p.getByText('Gia sư đang điều chỉnh lộ trình của bạn').waitFor()
  const skippable = await btn('Bỏ qua').isVisible()
  await btn('Bỏ qua').click()
  const adapted = await p.locator('.body').innerText()
  await shot('07-dieu-chinh')
  ok('5.8 The adapting screen shows the real result and can be skipped',
    skippable && adapted.includes('Chấm bài') && /\d\/6 câu đúng/.test(adapted)
    && (await link('Bước 3: Học tiếp').isVisible()) && (await link('Dừng ở đây, về trang chủ').isVisible()), flat(adapted).slice(0, 220))
  await p.emulateMedia({ reducedMotion: 'reduce' })
  await p.reload()
  await p.getByText('Gia sư đang điều chỉnh lộ trình của bạn').waitFor()
  ok('5.9 Reduced motion shows everything at once',
    (await p.getByText('Chấm bài').isVisible()) && (await link('Bước 3: Học tiếp').isVisible()) && (await btn('Bỏ qua').count()) === 0)
  await p.emulateMedia({ reducedMotion: null })
  await p.goto(`${base}/luyen-tap/bo-cau/${open.id}`)
  await p.getByText('Chấm bài').waitFor()
  ok('5.10 A set opened by id shows its result', await link('Về trang chủ').isVisible())
})

await section(6, 'Phiên hôm nay, step 3: học tiếp', async () => {
  await p.goto(base + '/phien/dieu-chinh')
  await p.getByText('Gia sư đang điều chỉnh lộ trình của bạn').waitFor()
  if (await btn('Bỏ qua').isVisible()) await btn('Bỏ qua').click()
  await link('Bước 3: Học tiếp').click()
  await p.waitForURL(/\/luyen-tap\/[^/]+\?phien=1$/)
  await p.getByText('Phiên hôm nay').waitFor()
  ok('6.1 "Bước 3: Học tiếp" opens the unit inside the session', !(await p.getByRole('navigation').isVisible()))
  for (let i = 0; i < 24; i++) {
    if (await p.getByText('Xong phiên hôm nay').isVisible()) break
    if (await btn('Kiểm tra').isVisible()) {
      await p.getByRole('radio').first().click()
      await btn('Kiểm tra').click()
      await p.getByText(/✓ Đúng|✕ Chưa đúng/).waitFor()
    }
    await btn('Tiếp tục').click()
    await p.waitForTimeout(250)
  }
  ok('6.2 The session ends on its own screen', (await p.getByText('Xong phiên hôm nay').isVisible())
    && (await link('Về trang chủ').isVisible()) && (await link('Về Luyện tập').count()) === 0)
  await p.goto(base + '/phien')
  await p.getByText('Xong phiên hôm nay').waitFor()
  ok('6.3 The day\'s session is done', true)
  await p.goto(base + '/luyen-tap/u-dt-01?phien=1')    // not today's step: an address kept from another day
  await p.getByRole('heading', { name: 'Tỷ lệ hiện mắc' }).waitFor()
  await link('Đóng chủ đề').waitFor()
  ok('6.4 A unit that is not today\'s step is an ordinary unit, whatever its address says', (await p.getByText('Phiên hôm nay').count()) === 0)
  await p.route('**/api/v1/home', async (route) => {
    const response = await route.fetch()
    return route.fulfill({ response, json: { ...(await response.json()), quick_review_count: 0, quick_review_note_vi: null } })
  })
  await p.goto(base + '/')
  await p.getByText('Đã xong phiên hôm nay').waitFor()
  ok('6.5 With nothing left, the Home tile says the session is done',
    !(await p.getByRole('link', { name: /Phiên hôm nay/ }).innerText()).includes('đang dở'))
  await p.unroute('**/api/v1/home')
  await shot('08-phien-xong')
})

await section(7, 'Hỏi đáp', async () => {
  await p.goto(base + '/hoi-dap')
  const ask = async (q) => {
    await p.getByLabel('Câu hỏi của bạn').fill(q)
    await btn('Gửi').click()
  }
  await ask('Con tôi sốt 39 độ nên uống thuốc gì?')
  await p.getByText('Mình không tư vấn cho một ca bệnh cụ thể').waitFor()
  ok('7.1 Chat: patient-specific question declined', true)
  await ask('Phác đồ hoá trị ung thư phổi giai đoạn III?')
  await p.getByText('Tài liệu hiện có chưa đủ nội dung').waitFor()
  ok('7.2 Chat: out-of-corpus question gives insufficient evidence', true)
  const searchChip = p.getByRole('button', { name: /^Đã tìm trong \d+ tài liệu/ }).last()
  const collapsed = (await searchChip.getAttribute('aria-expanded')) === 'false'
  await searchChip.click()
  const traceLines = await p.locator(`#${await searchChip.getAttribute('aria-controls')} li`).allInnerTexts()
  const searchedIn = await p.getByRole('list', { name: 'Đã tìm ở' }).last().getByRole('listitem').allInnerTexts()
  ok('7.4 Chat: nothing found shows what ran and where it looked',
    collapsed && traceLines.length === 1 && /Đã tìm trong \d+ tài liệu/.test(traceLines[0])
    && searchedIn.length >= 1 && searchedIn.every((line) => /tr\. \d+|toàn văn/.test(line))
    && (await btn('Gửi chuyên gia · R2').last().isDisabled()), `${traceLines.join(' | ')} || ${searchedIn.join(' | ')}`)
  await ask('Tỷ lệ mắc tính thế nào?')
  await p.getByText('Bạn muốn hỏi về nghĩa nào của "tỷ lệ mắc"?').waitFor()
  ok('7.2b Chat: an ambiguous term is asked back, with its senses to tap',
    (await btn('Tỷ lệ hiện mắc').isEnabled()) && (await btn('Tỷ lệ mới mắc').isEnabled()))
  if (LIVE) {
    const clarified = p.waitForRequest((r) => r.method() === 'POST' && /\/chat\/sessions\/\d+\/messages$/.test(r.url()))
    await btn('Tỷ lệ hiện mắc').click()
    const sent = (await clarified).postDataJSON()
    await p.locator('.card').last().locator('button.cite').first().waitFor()
    ok('7.2c Chat: tapping a sense sends the clarified question and is answered',
      sent.text === 'Tỷ lệ hiện mắc tính thế nào?' && Number.isInteger(sent.clarifies_message_id))
  }
  if (LIVE) {
    await ask('Vắc xin viêm gan B mũi sơ sinh tiêm khi nào?')
    const chip = p.locator('.card').last().locator('button.cite').first()   // of this answer: an earlier one has chips too
    await chip.waitFor()
    const answer = await p.locator('.card').last().innerText()
    ok('7.3 Chat: cited answer mentions 24 giờ', answer.includes('24 giờ'), flat(answer).slice(0, 160))
    await chip.click()
    await p.getByRole('dialog').getByText('Lịch tiêm chủng mở rộng').first().waitFor()
    const sheet = await p.getByRole('dialog').innerText()
    ok('7.3 Source sheet: page 8 and demo label', sheet.includes('trang 8') && sheet.includes('Tài liệu demo – chưa thẩm định'))
    await btn('Đóng').click()
    const answerChip = p.getByRole('button', { name: /^Đã tra \d+ nguồn · kiểm tra \d+ nhận định/ }).last()
    await answerChip.click()
    const lines = await p.locator(`#${await answerChip.getAttribute('aria-controls')} li`).allInnerTexts()
    ok('7.6 Chat: an answer shows its chip and the steps behind it',
      lines.length === 4 && lines[2].startsWith('Đã đọc:') && /Đã kiểm tra \d+ nhận định/.test(lines[3]), lines.join(' | '))
    const helpful = btn('Hữu ích').last()
    await helpful.click()
    await p.waitForFunction(() => [...document.querySelectorAll('button[aria-label="Hữu ích"]')].pop()?.getAttribute('aria-pressed') === 'true')
    await p.reload()
    await btn('Hữu ích').last().waitFor()   // the conversation's own answers, not the starter buttons of an empty screen
    ok('7.7 Chat: "Hữu ích" is kept with the answer', (await btn('Hữu ích').last().getAttribute('aria-pressed')) === 'true')
    await btn('Giải thích thêm').click()
    await p.locator('.card').last().locator('button.cite').first().waitFor()
    ok('7.3 Chat: follow-up "Giải thích thêm" answered with citation', true)
  }

  // the stream breaks after its first steps: nothing is left spinning and the learner can try again
  await p.route('**/api/v1/chat/sessions/*/messages', (route) => (route.request().method() !== 'POST' ? route.continue() : route.fulfill({
    status: 200, contentType: 'text/event-stream',
    body: 'event: step\ndata: {"id":"s1","kind":"search","label_vi":"Đang tìm trong 9 tài liệu","status":"running"}\n\n',
  })))
  await ask('Bệnh nào thuộc nhóm A?')
  const broken = p.getByRole('alert').last()
  await broken.waitFor()
  await p.unroute('**/api/v1/chat/sessions/*/messages')
  ok('7.9 Chat: a stream that breaks leaves nothing spinning',
    (await broken.locator('.spinner').count()) === 0 && (await p.locator('.body .spinner').count()) === 0
    && (await btn('Thử lại').last().isEnabled()) && (await p.getByLabel('Câu hỏi của bạn').isEnabled()))

  // the list of conversations: an earlier one reopens as it was
  await btn('Cuộc trò chuyện').click()
  await p.getByRole('dialog', { name: 'Cuộc trò chuyện' }).getByRole('button', { name: /Con tôi sốt 39 độ/ }).click()   // the conversation's title is its first question
  await p.getByRole('list', { name: 'Đã tìm ở' }).waitFor()
  ok('7.10 Chat: a conversation reopened from the list looks the same',
    /[?&]s=\d+/.test(p.url()) && (await p.getByRole('button', { name: /^Đã tìm trong \d+ tài liệu/ }).count()) >= 1
    && (await p.getByText('Tài liệu hiện có chưa đủ nội dung').first().isVisible())
    && (await btn('Tỷ lệ hiện mắc').isVisible()))

  // two more conversations, C and D, each with one answer of the same shape
  const fresh = async (question) => {
    await btn('Cuộc trò chuyện mới').click()
    await ask(question)
    await p.getByRole('button', { name: /^(Đã tìm trong \d+ tài liệu|Đã tra \d+ nguồn)/ }).waitFor({ timeout: 45000 })
  }
  await fresh('Phác đồ hoá trị ung thư phổi giai đoạn III?')                       // C
  await fresh('Cách nấu phở bò?')                                                   // D
  const dUrl = p.url()
  await p.getByRole('button', { name: /^(Đã tìm trong \d+ tài liệu|Đã tra \d+ nguồn)/ }).click()   // D's chip, opened
  const pick = async (title) => {
    await btn('Cuộc trò chuyện').click()
    await p.getByRole('dialog', { name: 'Cuộc trò chuyện' }).getByRole('button', { name: title }).click()
  }
  await pick(/Phác đồ hoá trị/)
  await p.getByText('Phác đồ hoá trị ung thư phổi giai đoạn III?').waitFor()
  ok('7.11 Chat: another conversation does not inherit what was open in this one',
    (await p.getByRole('button', { name: /^(Đã tìm trong \d+ tài liệu|Đã tra \d+ nguồn)/ }).getAttribute('aria-expanded')) === 'false')
  await p.goBack()
  await p.waitForURL(dUrl)
  await p.getByText('Cách nấu phở bò?').waitFor()
  ok('7.12 Chat: browser Back shows the conversation of the address',
    (await p.getByText('Phác đồ hoá trị ung thư phổi giai đoạn III?').count()) === 0)

  // an answer still on its way when the learner opens another conversation stays in its own
  await p.route('**/api/v1/chat/sessions/*/messages', async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    await new Promise((resolve) => setTimeout(resolve, 2500))
    return route.continue()
  })
  await ask('Con tôi bị ho nên uống thuốc gì?')                                     // declined, in D, held for 2.5 s
  await pick(/Phác đồ hoá trị/)                                                     // C, while D's answer is on its way
  await p.getByText('Phác đồ hoá trị ung thư phổi giai đoạn III?').waitFor()
  const usable = await p.getByLabel('Câu hỏi của bạn').isEnabled()
  await p.waitForTimeout(4000)
  await p.unroute('**/api/v1/chat/sessions/*/messages')
  ok('7.13 Chat: an answer on its way stays in its own conversation',
    usable && (await p.getByText('Mình không tư vấn cho một ca bệnh cụ thể').count()) === 0
    && (await p.getByText('Tài liệu hiện có chưa đủ nội dung').count()) >= 1)
})

await section(8, 'Thi thử, then Bộ thẻ and Ôn thẻ', async () => {
  await link('Thi thử').click()
  const fixedForm = p.getByRole('region', { name: 'Đề thi thử số 1' })
  await fixedForm.waitFor() // the list has loaded
  ok('8.1 Exam list: the diagnostic is listed, tagged as such',
    await p.getByRole('region', { name: 'Bài đánh giá năng lực' }).getByText('Đánh giá năng lực', { exact: true }).isVisible())
  const autoForm = p.getByRole('region', { name: 'Đề tự ráp' })
  // the wrong answers of the unit and of the practice set already count for the assembled exam
  const firstMix = await autoForm.getByText(/lần tới:/).innerText()
  ok('8.2 Assembled exam: earlier results count', /\d+ câu từng sai/.test(firstMix), firstMix)
  await fixedForm.getByRole('link', { name: 'Bắt đầu làm bài' }).click()
  await p.getByText('Không tạm dừng được').waitFor()
  await btn('Bắt đầu').click()
  await p.getByText('Câu 1 / 10').waitFor()
  // "Làm bài mới" while a test is running: the running one is handed in, a new one opens
  await p.getByRole('radio').first().click()
  await p.getByText('✓ Đã lưu').waitFor()
  await p.goto(base + '/thi-thu')
  await fixedForm.getByRole('button', { name: 'Làm bài mới', exact: true }).click()
  await p.getByRole('dialog').getByText('Bài đang làm dở sẽ được nộp').waitFor()
  await btn('Nộp và làm bài mới').click()
  await p.getByText('Câu 1 / 10').waitFor()
  const checkedInNew = await p.getByRole('radio', { checked: true }).count()
  ok('8.3 Exam: "Làm bài mới" opens a clean test', checkedInNew === 0)
  ok('8.4 Exam: navigation hidden while taking the exam', !(await p.getByRole('navigation').isVisible()))
  for (let n = 1; n <= 10; n++) {
    if (n === 2) await btn('Đánh dấu').click()
    if (n !== 5) await p.getByRole('radio').first().click()
    await p.getByText('✓ Đã lưu').waitFor()
    if (n < 10) await btn('Câu sau').click()
  }
  // leave the running exam (as after closing the tab) and come back through the app
  await p.goto(base + '/')
  await p.getByText('Đang làm dở · Làm tiếp').waitFor()
  ok('8.5 Home: running exam is offered as "Làm tiếp"', true)
  await p.goto(base + '/thi-thu')
  await p.getByText(/Bạn đang làm dở đề này · còn \d\d:\d\d/).waitFor()
  ok('8.6 Exam list: running attempt shows time left', true)
  await p.getByRole('link', { name: 'Làm tiếp', exact: true }).click()
  await p.getByText('Câu 1 / 10').waitFor()
  ok('8.7 Exam: reload keeps the saved answer', (await p.getByRole('radio').first().getAttribute('aria-checked')) === 'true')
  await btn('Danh sách').click()
  ok('8.8 Exam: navigator lists the flagged question', await p.getByRole('button', { name: 'Câu 2, đã trả lời, đã đánh dấu' }).isVisible())
  await p.keyboard.press('Tab')
  await p.waitForTimeout(1600) // the timer re-renders the screen every second; focus must stay put
  const focused = await p.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '')
  ok('8.9 Exam: sheet keeps keyboard focus while the timer runs', focused.startsWith('Câu 1'), focused)
  await btn('Đóng').click()
  await btn('Nộp bài').click()
  ok('8.10 Exam: submit sheet counts', await p.getByText('1 câu chưa trả lời · 1 câu đánh dấu').isVisible())
  await p.getByRole('dialog').getByRole('button', { name: 'Nộp bài', exact: true }).click()
  await p.getByText('Đã cập nhật ôn tập').waitFor()
  const res = await p.locator('.body').innerText()
  ok('8.11 Results: score, new cards, priority', /\/ 10 câu đúng/.test(res) && /thẻ/.test(res) && /Ưu tiên ôn:/.test(res), flat(res).slice(0, 170))
  ok('8.12 Results: no score prediction wording', !PREDICTION.test(res))
  await btn('Sai').click()
  const wrongRows = await p.locator('.list a').count()
  if (wrongRows > 0) {
    await p.locator('.list a').first().click()
    await p.getByText('✓ Đáp án').waitFor()
    ok('8.13 Answer review: learner choice and correct answer marked', (await p.getByText('✓ Đáp án').isVisible()) && (await p.getByText('✕ Bạn chọn').isVisible()))
    await p.locator('button.chip').first().click()
    await p.getByRole('dialog').getByText('Tài liệu demo – chưa thẩm định').waitFor()
    ok('8.14 Answer review: source sheet opens', true)
    await btn('Đóng').click()
  }

  // history: date, time and duration of the finished attempt
  await p.goto(base + '/thi-thu')
  await p.getByText('Lịch sử làm bài').waitFor()
  const historyRow = await p.locator('.list a').first().innerText()
  ok('8.15 Exam history: the test that was handed in early is listed too', (await p.locator('.list a').count()) === 2)
  ok('8.16 Exam list: "Làm bài mới" offered after finishing', await p.getByRole('link', { name: 'Làm bài mới', exact: true }).isVisible())
  const today = new Date()
  const ddmmyyyy = [today.getDate(), today.getMonth() + 1].map((n) => String(n).padStart(2, '0')).join('/') + '/' + today.getFullYear()
  ok('8.17 Exam history: date, time, duration and score', historyRow.includes(ddmmyyyy) && /\d\d:\d\d/.test(historyRow)
    && /Làm trong \d+ (giây|phút)/.test(historyRow) && /\d+\/10\s+câu đúng/.test(historyRow), flat(historyRow))
  await p.locator('.list a').first().click()
  await p.getByText(/Nộp lúc \d\d:\d\d ngày/).waitFor()
  ok('8.18 Results: submission time shown', true)

  // assembled exam: put together from what just happened
  await p.goto(base + '/thi-thu')
  const nextMix = await autoForm.getByText(/lần tới:/).innerText()
  ok('8.19 Assembled exam: next test mixes new, wrong and review questions',
    /câu mới/.test(nextMix) && /câu từng sai/.test(nextMix) && /câu ôn lại/.test(nextMix), nextMix)
  await autoForm.getByRole('link', { name: 'Bắt đầu làm bài' }).click()
  await p.getByRole('region', { name: 'Đề lần này' }).waitFor()
  const planText = await p.getByRole('region', { name: 'Đề lần này' }).innerText()
  ok('8.20 Assembled exam: rules page says what the test contains', /câu từng sai/.test(planText) && /Tiêm phòng\/Tiêm chủng trẻ em và người lớn \d/.test(planText),
    flat(planText).slice(0, 150))
  await btn('Bắt đầu').click()
  await p.getByText('Câu 1 / 10').waitFor()
  await btn('Nộp bài').click()
  await p.getByRole('dialog').getByRole('button', { name: 'Nộp bài', exact: true }).click()
  await p.getByText('/ 10 câu đúng').waitFor()
  ok('8.21 Assembled exam: can be taken and scored', true)

  // the cards the wrong answers made
  await p.goto(base + '/luyen-tap')
  const shortcut = p.getByRole('link', { name: /\d+ thẻ đến hạn hôm nay/ })
  await shortcut.waitFor()
  ok('8.22 Luyện tập shows the cards shortcut', (await href(shortcut)) === '/luyen-tap/bo-the', flat(await shortcut.innerText()))
  await p.route('**/api/v1/decks', (route) => route.fulfill({ json: { items: [] } }))
  await p.reload()
  await p.getByText('Chưa có thẻ ôn').waitFor()
  await p.goto(base + '/luyen-tap/bo-the')
  await p.getByText('Chưa có thẻ nào.').waitFor()
  ok('8.23 No cards, no broken screen', (await p.getByRole('link', { name: /Ôn \d+ thẻ/ }).count()) === 0)
  await p.unroute('**/api/v1/decks')
  await p.reload()
  const review = p.getByRole('link', { name: /^Ôn \d+ thẻ$/ })
  await review.waitFor()
  const dueCells = await p.getByRole('table', { name: 'Bộ thẻ theo học phần' }).locator('tbody td:last-child').allInnerTexts()
  const dueSum = dueCells.reduce((sum, text) => sum + Number(text), 0)
  await shot('09-bo-the')
  ok('8.24 Bộ thẻ counts by học phần',
    (await p.getByText('Hôm nay').isVisible()) && (await p.getByRole('rowheader', { name: /Sức khỏe quần thể và dự phòng/ }).isVisible())
    && dueSum > 0 && (await review.innerText()).trim() === `Ôn ${dueSum} thẻ`, `due ${dueCells.join('+')}`)
  await review.click()
  await btn('Hiện đáp án').click()
  ok('8.25 Ôn thẻ uses the same card',
    (await btn('Nguồn').getAttribute('aria-expanded')) === 'false' && (await btn('Vì sao ôn câu này?').getAttribute('aria-expanded')) === 'false'
    && (await p.locator('footer.footer button').count()) === 4)
  const before = await p.locator('.tag').first().innerText()
  await p.getByRole('button', { name: /Tốt/ }).click()
  await p.waitForFunction((prev) => document.querySelector('.tag')?.textContent !== prev, before)
  ok('8.26 Card review: rating reschedules the card', true, `${before} -> ${await p.locator('.tag').first().innerText()}`)

  const dueBeforeHide = await apiGet('/cards/due')
  const tagBeforeHide = await p.locator('.tag').first().innerText()
  await btn('Tuỳ chọn thẻ').click()
  await btn('Tạm ẩn thẻ này').click()
  await p.waitForFunction((prev) => document.querySelector('.tag')?.textContent !== prev, tagBeforeHide)
  const dueAfterHide = await apiGet('/cards/due')
  ok('8.27 "Tạm ẩn thẻ này" removes the card from the queue',
    dueAfterHide.total_due === dueBeforeHide.total_due - 1 && !dueAfterHide.items.some((c) => c.id === dueBeforeHide.items[0].id),
    `${dueBeforeHide.total_due} -> ${dueAfterHide.total_due}`)

  // the answer to a rating is lost on the way back: tapping again must not rate the card twice
  const ratings = []
  await p.route('**/api/v1/cards/*/reviews', async (route) => {
    const key = route.request().headers()['idempotency-key']
    const response = await route.fetch() // the server applies the rating either way
    ratings.push({ key, due_at: (await response.json()).due_at })
    return ratings.length === 1 ? route.abort() : route.fulfill({ response })
  })
  const dueBefore = await p.locator('.tag').first().innerText()
  await btn('Hiện đáp án').click()
  await expecting(['dropped'], async () => {
    await p.getByRole('button', { name: /Tốt/ }).click()
    await p.getByRole('alert').waitFor()
  })
  const othersLocked = (await Promise.all(['Học lại', 'Khó', 'Dễ'].map((label) => p.getByRole('button', { name: new RegExp(label) }).isDisabled())))
    .every(Boolean)
  await p.getByRole('button', { name: /Tốt/ }).click()
  await p.waitForFunction((prev) => document.querySelector('.tag')?.textContent !== prev, dueBefore)
  await p.unroute('**/api/v1/cards/*/reviews')
  ok('8.28 Card review: a rating whose answer was lost is applied once, and cannot be changed',
    othersLocked && ratings.length === 2 && ratings[0].key === ratings[1].key && ratings[0].due_at === ratings[1].due_at,
    ratings.map((r) => r.due_at).join(' / '))
  await p.goto(base + '/luyen-tap?hp=g1')
  await p.getByRole('link', { name: /Đo lường tần suất bệnh/ }).waitFor()
  ok('8.29 "?hp=" opens the học phần', true)

  if (LIVE) {
    // the exam left wrong answers on tiêm chủng: an answer on it comes with suggestions, applied only on a tap
    const accepts = []
    const noteAccept = (r) => r.url().includes('/accept') && accepts.push(r.url())
    p.on('request', noteAccept)
    await p.goto(base + '/hoi-dap')
    await p.getByLabel('Câu hỏi của bạn').fill('Vắc xin viêm gan B mũi sơ sinh tiêm khi nào?')
    await btn('Gửi').click()
    const box = p.getByRole('region', { name: 'Đề xuất từ gia sư' }).last()
    await box.waitFor({ timeout: 45000 })
    const untouched = accepts.length === 0
    const tomorrow = box.getByRole('button', { name: 'Thêm vào phiên ngày mai' })
    await tomorrow.click()
    await box.getByText(/Đã thêm vào phiên ngày \d\d\/\d\d/).waitFor()
    const done = box.getByRole('button', { name: /Đã thêm vào phiên ngày/ })
    ok('8.30 Chat: a suggestion acts only on a tap, once', untouched && accepts.length === 1 && (await done.isDisabled()))
    p.off('request', noteAccept)
  }
})

await section(9, 'Tiến độ', async () => {
  // A learner with nothing yet: the two responses are replaced by a new learner's payloads.
  const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10)
  const emptySkills = { days_to_exam: 140, scope: 'latest3', coverage: { assessed_topics: 0, total_topics: 54, modules: [] },
    priorities: [], mock_scores: [], group_grid: null, levels: [1, 2, 3].map((level) => ({ level, label_vi: `Mức ${level}`, correct: 0, total: 0 })) }
  const emptyRhythm = { days_to_exam: 140, week: { minutes: 0, previous_minutes: 0, study_days: 0, days_elapsed: 1 },
    heatmap: Array.from({ length: 56 }, (_, i) => ({ date: day(i - 55), minutes: 0 })),
    memory: { recall_rate: null, window_days: 30, reviews: 0, new: 0, learning: 0, mastered: 0, due_today: 0 },
    curve: [], recall_by_module: [], due_forecast: Array.from({ length: 7 }, (_, i) => ({ date: day(i), count: 0 })), activity: [] }
  await p.route('**/api/v1/progress/skills*', (route) => route.fulfill({ json: emptySkills }))
  await p.route('**/api/v1/progress/rhythm', (route) => route.fulfill({ json: emptyRhythm }))
  await p.goto(base + '/tien-do')
  await p.getByText('Chưa có đề thi thử nào được nộp.').waitFor()
  const emptyA = await p.locator('.body').innerText()
  await link('Nhịp học Bạn học thế nào').click()
  await p.getByText('Chưa có thẻ nào được ôn.').waitFor()
  const emptyB = await p.locator('.body').innerText()
  ok('9.1 A learner with nothing yet sees empty blocks, not broken ones',
    !/NaN|undefined|null/.test(emptyA + emptyB) && emptyB.includes('—') && emptyA.includes('Chưa đủ dữ liệu'))
  await p.unroute('**/api/v1/progress/skills*')
  await p.unroute('**/api/v1/progress/rhythm')

  await p.goto(base + '/tien-do')
  await p.getByText('vấn đề cốt lõi đã luyện').waitFor()
  const skills = await p.locator('.body').innerText()
  await shot('10-tien-do-nang-luc')
  const priorities = p.getByRole('region', { name: 'Cần ưu tiên' })
  const firstPractice = priorities.getByRole('link', { name: 'Luyện' }).first()
  ok('9.2 Năng lực shows real counts',
    /Còn \d+ ngày đến kỳ thi/.test(flat(skills)) && /\d+ \/ 54 vấn đề cốt lõi đã luyện/.test(flat(skills))
    && /câu đúng/.test(await priorities.innerText()) && /^\/luyen-tap\?hp=/.test(await href(firstPractice))
    && /\d+\/10/.test(await p.getByRole('region', { name: 'Điểm cả đề' }).innerText()), flat(skills).slice(0, 200))
  const scoped = p.waitForRequest((r) => r.url().includes('/progress/skills?scope=all'))
  await btn('Tất cả').click()
  await scoped
  ok('9.3 The scope pills ask the server again', (await btn('Tất cả').getAttribute('aria-pressed')) === 'true')
  const tabA = await p.locator('.body').innerText()

  const rhythmTab = link('Nhịp học Bạn học thế nào')
  ok('9.4 The two tabs are links', (await href(rhythmTab)) === '/tien-do/nhip-hoc')
  await rhythmTab.click()
  await p.getByText('Thời gian tuần này').waitFor()
  await p.getByRole('img', { name: 'Đường ghi nhớ' }).waitFor()
  const tabB = await p.locator('.body').innerText()
  await shot('11-tien-do-nhip-hoc')
  ok('9.5 Nhịp học shows real study time and memory',
    /Thời gian tuần này\s*\d+ (g|ph)/.test(flat(tabB)) && /Ngày có học\s*1 \/ \d/.test(flat(tabB))
    && (await p.getByRole('table', { name: '8 tuần gần nhất' }).locator('td[aria-label]').count()) === 56
    && /\d+%/.test(await p.getByRole('region', { name: 'Trí nhớ' }).innerText())
    && (await p.getByRole('list', { name: 'Thẻ đến hạn 7 ngày tới' }).getByRole('listitem').count()) === 7
    && (await p.getByRole('region', { name: 'Hoạt động tuần này' }).innerText()).includes('Đề thi thử số 1'), flat(tabB).slice(0, 200))
  ok('9.6 The memory curve is drawn from reviews',
    (await p.locator('svg[aria-label="Đường ghi nhớ"] path[stroke-dasharray]').count()) === 1 && tabB.includes('nếu không ôn'))
  ok('9.7 Nothing predicts the exam', !PREDICTION.test(tabA + tabB))
  ok('9.8 The tab bar stays, on Tiến độ',
    (await rhythmTab.getAttribute('aria-current')) === 'page'
    && (await p.getByRole('navigation').getByRole('link', { name: 'Tiến độ' }).getAttribute('class'))?.includes('active'))
  // cards due later today are not in the queue yet: the button must not offer them
  await p.route('**/api/v1/progress/rhythm', async (route) => {
    const response = await route.fetch()
    const body = await response.json()
    body.memory.due_today = 0
    body.due_forecast[0].count = 3
    return route.fulfill({ response, json: body })
  })
  await p.reload()
  await p.getByRole('list', { name: 'Thẻ đến hạn 7 ngày tới' }).waitFor()
  ok('9.9 "Ôn N thẻ hôm nay" is offered only for cards due now', (await p.getByRole('link', { name: /Ôn \d+ thẻ hôm nay/ }).count()) === 0)
  await p.unroute('**/api/v1/progress/rhythm')
})

await section(10, 'Consent asked again, an expired token', async () => {
  // the service consent is withdrawn, as a new consent version would do
  const withdrawn = await p.request.delete(base + '/api/v1/consent?kind=service', { headers: { Authorization: `Bearer ${await token()}` } })
  ok('10.1 Consent withdrawn through the API', withdrawn.ok())
  await expecting([403], async () => {
    await p.getByRole('link', { name: 'Luyện tập', exact: true }).click()
    await p.getByRole('heading', { name: 'Trước khi bắt đầu' }).waitFor()
  })
  await giveConsent()
  await p.getByRole('heading', { name: 'Luyện tập' }).waitFor()
  ok('10.2 Consent asked again, then back to where the learner was', p.url().endsWith('/luyen-tap'))

  // the access token has expired (rotated out, as after 30 minutes): one refresh, unseen by the learner
  const stored = await p.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORAGE_KEY)
  const rotated = await (await p.request.post(base + '/api/v1/auth/refresh', { data: { refresh_token: stored.refresh_token } })).json()
  await p.evaluate(([key, value]) => localStorage.setItem(key, value),
    [STORAGE_KEY, JSON.stringify({ access_token: stored.access_token, refresh_token: rotated.refresh_token })])
  let refreshes = 0
  const countRefresh = (r) => r.url().endsWith('/api/v1/auth/refresh') && refreshes++
  p.on('request', countRefresh)
  await expecting([401], async () => {
    await p.getByRole('link', { name: 'Thi thử', exact: true }).click()
    await p.getByRole('region', { name: 'Đề thi thử số 1' }).waitFor()
  })
  p.off('request', countRefresh)
  ok('10.3 An expired access token is refreshed once and the screen loads', refreshes === 1, `${refreshes} refresh call(s)`)
})

await section(11, 'Sign out', async () => {
  const lastToken = await token()
  await p.getByRole('link', { name: 'Trang chủ', exact: true }).click()
  await btn('Tài khoản').click()
  await btn('Đăng xuất').click()
  await p.getByRole('heading', { name: 'Đăng nhập' }).waitFor()
  ok('11.1 Sign-out: tokens are gone', (await p.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)) === null)
  const afterSignOut = await p.request.get(base + '/api/v1/me', { headers: { Authorization: `Bearer ${lastToken}` } })
  ok('11.2 Sign-out: the server no longer accepts the token', afterSignOut.status() === 401)
  await p.goto(base + '/thi-thu')
  await p.getByRole('heading', { name: 'Đăng nhập' }).waitFor()
  ok('11.3 Sign-out: a screen opened directly shows the sign-in', true)
})

await finish()
