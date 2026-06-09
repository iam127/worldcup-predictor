import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth }    from '../contexts/AuthContext.jsx'
import { useSidebar } from '../contexts/SidebarContext.jsx'
import api from '../api/index.js'

// ── Nav link ────────────────────────────────────────────────────
function NavItem({ to, icon, label, exact = false, onClick, badge }) {
  const { pathname } = useLocation()
  const active = exact ? pathname === to : pathname === to || (to !== '/' && pathname.startsWith(to))
  return (
    <Link to={to} className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="material-icons" style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
          background: 'rgba(0,200,83,0.18)', color: '#00c853', letterSpacing: '0.03em',
        }}>{badge}</span>
      )}
    </Link>
  )
}

// ── Non-clickable info row ───────────────────────────────────────
function InfoRow({ icon, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '7px 10px 7px 16px',
      color: 'rgba(255,255,255,0.35)', fontSize: 12,
    }}>
      <span className="material-icons" style={{ fontSize: 16, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{icon}</span>
      {children}
    </div>
  )
}

// ── Section label ────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.28)',
      textTransform: 'uppercase', letterSpacing: '0.12em',
      padding: '4px 13px 6px', margin: 0,
    }}>{children}</p>
  )
}

// ── Divider ──────────────────────────────────────────────────────
function Divider() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '6px 0' }} />
}

// ── Sidebar ──────────────────────────────────────────────────────
export default function Sidebar() {
  const { user, logout }   = useAuth()
  const { isOpen, close }  = useSidebar()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (!user) return
    api.get('/leaderboard/global')
      .then(r => setStats(r.data.find(u => u.id === user.id) || { total_points: 0, correct_predictions: 0, best_streak: 0 }))
      .catch(() => {})
  }, [user])

  const initial = (user?.name || user?.email || '?')[0].toUpperCase()

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={close} aria-hidden="true" />}

      <aside className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>

        {/* ── Top accent line ─────────────────────────── */}
        <div style={{ height: 3, background: '#00c853', flexShrink: 0 }} />

        {/* ── Header ─────────────────────────────────── */}
        <div style={{ padding: '16px 14px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(0,200,83,0.15)', border: '1px solid rgba(0,200,83,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <span className="material-icons" style={{ fontSize: 20, color: '#00c853' }}>sports_soccer</span>
            </div>
            <div>
              <p style={{ color: '#ffffff', fontWeight: 700, fontSize: 14, margin: 0, lineHeight: 1.3 }}>Mundial 2026</p>
              <p style={{ color: '#00c853', fontSize: 11, margin: 0, fontWeight: 600, letterSpacing: '0.03em' }}>Predictor Oficial</p>
            </div>
          </div>
          <button onClick={close} className="sidebar-close-btn" aria-label="Cerrar menú">
            <span className="material-icons" style={{ fontSize: 18, color: '#94a3b8' }}>close</span>
          </button>
        </div>

        {/* ── Scrollable body ─────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

          {/* ── Menú principal ──────────────────────── */}
          <nav style={{ padding: '10px 8px 4px' }}>
            <SectionLabel>Menú principal</SectionLabel>
            <NavItem to="/"            icon="home"                 label="Inicio"         exact onClick={close} />
            <NavItem to="/leaderboard" icon="leaderboard"          label="Ranking global"       onClick={close} />
            {user?.isAdmin && (
              <NavItem to="/admin"     icon="admin_panel_settings" label="Administración" badge="Admin" onClick={close} />
            )}
          </nav>

          <Divider />

          {/* ── Mundial 2026 info ───────────────────── */}
          <div style={{ padding: '4px 8px' }}>
            <SectionLabel>Mundial 2026</SectionLabel>
            <InfoRow icon="grid_view">Fase de grupos</InfoRow>
            <InfoRow icon="emoji_events">Eliminatorias</InfoRow>
            <Divider />
            <InfoRow icon="public">
              <span>Sede</span>
              <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>USA · CAN · MEX</span>
            </InfoRow>
            <InfoRow icon="calendar_today">
              <span>11 Jun – 19 Jul 2026</span>
            </InfoRow>
          </div>

          <Divider />

          {/* ── Stats rápidas ───────────────────────── */}
          {stats && (
            <div style={{ padding: '4px 12px 8px' }}>
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10, padding: '12px 10px',
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px', textAlign: 'center' }}>
                  Tus stats
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, textAlign: 'center' }}>
                  {[
                    { label: 'Puntos',   value: stats.total_points         ?? 0 },
                    { label: 'Aciertos', value: stats.correct_predictions  ?? 0 },
                    { label: 'Racha',    value: stats.best_streak          ?? 0 },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p style={{ color: '#ffffff', fontSize: 20, fontWeight: 800, margin: 0, lineHeight: 1 }}>{value}</p>
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, margin: '3px 0 0', fontWeight: 500 }}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Spacer */}
          <div style={{ flex: 1 }} />
        </div>

        {/* ── Footer: user + logout ───────────────────── */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '12px 8px 8px', flexShrink: 0 }}>

          {/* Avatar + name + email */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 10px 10px' }}>
            {user?.avatar
              ? <img src={user.avatar} style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, border: '2px solid rgba(0,200,83,0.3)' }} alt="" referrerPolicy="no-referrer" />
              : (
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  background: '#6366f1', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, border: '2px solid rgba(99,102,241,0.4)',
                }}>
                  {initial}
                </div>
              )
            }
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ color: '#ffffff', fontSize: 13, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name || user?.email?.split('@')[0]}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </p>
            </div>
          </div>

          {/* Logout */}
          <button onClick={logout} className="nav-item" style={{ width: '100%' }}>
            <span className="material-icons" style={{ fontSize: 18 }}>logout</span>
            Cerrar sesión
          </button>

          {/* Version */}
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center', margin: '8px 0 0', letterSpacing: '0.05em' }}>
            Mundial 2026 · v1.0
          </p>
        </div>

      </aside>
    </>
  )
}
