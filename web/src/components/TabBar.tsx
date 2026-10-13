import { NavLink } from 'react-router-dom'
import { Icon } from './Icon'

// The five learner destinations never change order or name (handover/06-screens.md).
const TABS = [
  { to: '/', label: 'Trang chủ', icon: 'home', end: true },
  { to: '/hoi-dap', label: 'Hỏi đáp', icon: 'chat', end: false },
  { to: '/luyen-tap', label: 'Luyện tập', icon: 'pencil', end: false },
  { to: '/thi-thu', label: 'Thi thử', icon: 'timer', end: false },
  { to: '/tien-do', label: 'Tiến độ', icon: 'chart', end: false },
]

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Điều hướng chính">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? 'active' : '')}>
          <Icon name={t.icon} size={24} />
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
