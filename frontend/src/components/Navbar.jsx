import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { pathname }     = useLocation()

  const isActive = (to) => pathname === to

  return (
    <nav
      className="sticky top-0 z-30 border-b border-white/[0.07]"
      style={{
        background: 'linear-gradient(90deg, #0f172a 0%, #1a2744 50%, #0f172a 100%)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 4px 30px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-16">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <span className="text-2xl animate-float select-none">⚽</span>
          <div className="leading-tight">
            <span
              className="font-display text-xl tracking-widest gradient-text block"
              style={{ lineHeight: 1 }}
            >
              MUNDIAL
            </span>
            <span
              className="font-display text-xs tracking-[0.35em] text-night-600 block"
              style={{ lineHeight: 1 }}
            >
              2026 PREDICTOR
            </span>
          </div>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          <NavLink to="/"            active={isActive('/')}>
            <span className="material-icons-round text-[16px]">home</span>
            <span className="hidden sm:inline">Inicio</span>
          </NavLink>
          <NavLink to="/leaderboard" active={isActive('/leaderboard')}>
            <span className="material-icons-round text-[16px]">leaderboard</span>
            <span className="hidden sm:inline">Global</span>
          </NavLink>
          {user?.isAdmin && (
            <NavLink to="/admin" active={isActive('/admin')}>
              <span className="material-icons-round text-[16px]">admin_panel_settings</span>
              <span className="hidden sm:inline">Admin</span>
            </NavLink>
          )}
        </div>

        {/* User */}
        <div className="flex items-center gap-3">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full ring-2 ring-fifa-500/30"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-fifa-700 flex items-center justify-center text-xs font-bold text-white ring-2 ring-fifa-500/30">
              {user?.email?.[0]?.toUpperCase()}
            </div>
          )}
          <div className="hidden md:block leading-tight max-w-[160px]">
            <p className="text-sm text-white font-medium truncate">{user?.name || user?.email?.split('@')[0]}</p>
            <p className="text-[11px] text-night-600 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1 text-xs text-night-600 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-950/30"
          >
            <span className="material-icons-round text-[14px]">logout</span>
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </nav>
  )
}

function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
        active
          ? 'bg-fifa-500/15 text-fifa-400 shadow-[0_0_12px_rgba(34,197,94,0.2)]'
          : 'text-night-600 hover:text-white hover:bg-white/[0.06]'
      }`}
    >
      {children}
    </Link>
  )
}
