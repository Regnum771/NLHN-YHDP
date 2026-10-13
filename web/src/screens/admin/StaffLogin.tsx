import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { publicPost, type TokenPair } from '../../api'
import { staffSession } from '../../client'
import './admin.css'

// Đăng nhập cho cán bộ (Quản lý cấp Bộ): email and password on /auth/staff/login. Functional, not a
// designed screen. The staff session is kept apart from a learner's: neither is reused for the other.
export function StaffLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  if (staffSession.signedIn() && !busy) return <Navigate to="/quan-ly" replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(undefined)
    try {
      staffSession.signIn(await publicPost<TokenPair>('/auth/staff/login', { email: email.trim(), password }))
      navigate('/quan-ly', { replace: true })
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="staff-login">
      <form onSubmit={submit}>
        <div>
          <h1>Quản lý cấp Bộ</h1>
          <p className="admin-sub" style={{ marginTop: 4 }}>Ôn thi năng lực Y học dự phòng · đăng nhập cho cán bộ</p>
        </div>
        <label className="field">
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required readOnly={busy} />
        </label>
        <label className="field">
          Mật khẩu
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
            required readOnly={busy} />
        </label>
        {error && <p className="warn" role="alert">{error}</p>}
        <button className="btn primary block" type="submit" disabled={busy || !email.trim() || !password}>
          {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  )
}
