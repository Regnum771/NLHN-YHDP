import { useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { publicPost, type TokenPair } from '../api'
import { session } from '../client'

const MIN_CODE_LENGTH = 6

// Đăng nhập (mock/Login.dc.html): the activation code the school gave the learner. The logo, the
// managing unit and the acknowledgement line are placeholders until open issue 19 is settled, and
// "Điều khoản" and "Chính sách quyền riêng tư" are not links until those texts exist (open issue 17).
export function Login() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const input = useRef<HTMLInputElement>(null)

  if (session.signedIn() && !busy) return <Navigate to="/" replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(undefined)
    try {
      const pair = await publicPost<TokenPair>('/auth/activate', { code: code.trim(), device: { platform: 'web' } })
      session.signIn(pair)
      navigate(pair.consent_required ? '/dong-y' : '/', { replace: true })
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
      input.current?.focus() // back to the code, which is kept for correcting
    }
  }

  return (
    <form className="screen" onSubmit={submit}>
      <header className="moh-header">
        <div className="unit-row">
          <div className="logo" aria-hidden="true">Logo<br />đơn vị</div>
          <div>
            <div className="ministry">BỘ Y TẾ</div>
            <div className="unit">[Đơn vị chủ trì]</div>
          </div>
        </div>
        <div>
          <h1>Ôn thi năng lực hành nghề</h1>
          <div className="sub">Bác sĩ Y học dự phòng</div>
        </div>
      </header>
      <div className="body stack" style={{ padding: '28px 24px 16px', gap: 18 }}>
        <div>
          <h2 className="title" style={{ fontSize: 20 }}>Đăng nhập</h2>
          <p style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 6 }}>Nhập mã kích hoạt do nhà trường cấp cho bạn.</p>
        </div>
        <label className="field">
          Mã kích hoạt
          {/* read-only, not disabled, while the request runs: a disabled field would drop the keyboard focus */}
          <input ref={input} value={code} onChange={(e) => setCode(e.target.value)} placeholder="VD: YHDP-7K2M-Q9"
            autoCapitalize="characters" autoComplete="one-time-code" autoCorrect="off" spellCheck={false} readOnly={busy} />
        </label>
        {error && <p className="warn" role="alert">{error}</p>}
        <button className="btn primary block" type="submit" style={{ minHeight: 54, borderRadius: 14, fontSize: 16 }}
          disabled={busy || code.trim().length < MIN_CODE_LENGTH}>
          {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
        <p className="center" style={{ fontSize: 14, fontWeight: 500, color: 'var(--primary-dark)', minHeight: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Chưa có mã? Liên hệ phòng đào tạo của trường
        </p>
      </div>
      <footer className="login-foot">
        <p>
          Ứng dụng hỗ trợ ôn thi, không thay thế tư vấn y khoa. Tiếp tục nghĩa là bạn đồng ý với <u>Điều khoản</u> và{' '}
          <u>Chính sách quyền riêng tư</u>.
        </p>
        <p className="ack">[Dòng ghi nhận đơn vị chủ quản và nguồn kinh phí]</p>
      </footer>
    </form>
  )
}
