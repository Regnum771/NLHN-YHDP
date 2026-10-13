import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { ApiError, api, type Me } from './api'
import { onConsentRequired, onSignedOut, session } from './client'
import { Loading } from './components/Status'
import { CardReview } from './screens/CardReview'
import { Chat } from './screens/Chat'
import { Consent } from './screens/Consent'
import { Decks } from './screens/Decks'
import { Exam } from './screens/Exam'
import { ExamRules, Exams } from './screens/Exams'
import { Focus, type GateContext } from './screens/Focus'
import { Home } from './screens/Home'
import { Login } from './screens/Login'
import { Modules } from './screens/Modules'
import { QuizChat } from './screens/QuizChat'
import { Progress } from './screens/Progress'
import { ProgressRhythm } from './screens/ProgressRhythm'
import { Adapting } from './screens/Adapting'
import { AnswerReview, Results } from './screens/Results'
import { Session } from './screens/Session'
import { SessionCards } from './screens/SessionCards'
import { PracticeSet, SessionPractice } from './screens/SessionPractice'
import { Unit } from './screens/Unit'
import { Overview } from './screens/admin/Overview'
import { StaffLogin } from './screens/admin/StaffLogin'

const CONSENT_PATH = '/dong-y'
const FOCUS_PATH = '/chon-hoc-phan'

// Everything but Đăng nhập needs a session. When the session ends, or the server asks for consent,
// the learner is taken to the screen that settles it; after consent they return to where they were.
//
// A learner who has not yet chosen học phần is taken to Chọn học phần before anything else is
// shown: the server's `diagnostic_prompt_dismissed` says whether they have, so the screen appears
// once per learner, on any device. If the profile cannot be read the learner is let through.
function SignedIn() {
  const navigate = useNavigate()
  const location = useLocation()
  const [signedIn, setSignedIn] = useState(session.signedIn())
  const [gate, setGate] = useState<'unknown' | 'ask' | 'open'>('unknown')
  const onConsent = location.pathname === CONSENT_PATH

  useEffect(() => onSignedOut(() => setSignedIn(false)), [])
  useEffect(
    () => onConsentRequired(() => {
      if (location.pathname === CONSENT_PATH) return
      navigate(`${CONSENT_PATH}?next=${encodeURIComponent(location.pathname + location.search)}`, { replace: true })
    }),
    [navigate, location],
  )
  useEffect(() => {
    if (!signedIn || onConsent || gate !== 'unknown') return
    let alive = true
    api.get<Me>('/me').then(
      (me) => alive && setGate(me.diagnostic_prompt_dismissed ? 'open' : 'ask'),
      // Consent first: the profile is asked for again once it is given.
      (e) => alive && !(e instanceof ApiError && e.code === 'consent_required') && setGate('open'),
    )
    return () => {
      alive = false
    }
  }, [signedIn, onConsent, gate])

  if (!signedIn) return <Navigate to="/dang-nhap" replace />
  if (onConsent) return <Outlet />
  if (gate === 'unknown') return <div className="screen"><div className="body"><Loading /></div></div>
  if (gate === 'ask' && location.pathname !== FOCUS_PATH) return <Navigate to={FOCUS_PATH} replace />
  const context: GateContext = { focusChosen: () => setGate('open') }
  return <Outlet context={context} />
}

// Phone-first: a 390 px frame centred on the page (fills the screen on a real phone).
function PhoneFrame() {
  return (
    <div className="stage">
      <main className="phone">
        <Outlet />
      </main>
    </div>
  )
}

// The learner's app lives in the phone frame. Quản lý cấp Bộ is a desktop page outside it, with its
// own sign-in and its own session.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/quan-ly/dang-nhap" element={<StaffLogin />} />
        <Route path="/quan-ly" element={<Overview />} />
        <Route element={<PhoneFrame />}>
          <Route path="/dang-nhap" element={<Login />} />
          <Route element={<SignedIn />}>
            <Route path={CONSENT_PATH} element={<Consent />} />
            <Route path={FOCUS_PATH} element={<Focus />} />
            <Route path="/" element={<Home />} />
            <Route path="/phien" element={<Session />} />
            <Route path="/phien/the" element={<SessionCards />} />
            <Route path="/phien/luyen" element={<SessionPractice />} />
            <Route path="/phien/dieu-chinh" element={<Adapting />} />
            <Route path="/luyen-tap/bo-cau/:setId" element={<PracticeSet />} />
            <Route path="/luyen-tap/bo-the" element={<Decks />} />
            <Route path="/luyen-tap/on-the" element={<CardReview />} />
            <Route path="/hoi-dap" element={<Chat />} />
            <Route path="/hoi-dap/tu-cau-hoi/:questionId" element={<QuizChat />} />
            <Route path="/luyen-tap" element={<Modules />} />
            <Route path="/luyen-tap/:unitId" element={<Unit />} />
            <Route path="/thi-thu" element={<Exams />} />
            <Route path="/thi-thu/:formId/quy-dinh" element={<ExamRules />} />
            <Route path="/thi-thu/lam-bai/:attemptId" element={<Exam />} />
            <Route path="/thi-thu/ket-qua/:attemptId" element={<Results />} />
            <Route path="/thi-thu/ket-qua/:attemptId/:questionId" element={<AnswerReview />} />
            <Route path="/tien-do" element={<Progress />} />
            <Route path="/tien-do/nhip-hoc" element={<ProgressRhythm />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
