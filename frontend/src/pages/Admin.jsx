import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/index.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { getCountryCode, getFlagUrl } from '../utils/flags.js'
import MenuBtn from '../components/MenuBtn.jsx'

// ── Small helpers ────────────────────────────────────────────────
function SmallFlag({ team, code }) {
  if (!team || team === 'Por definir') return null
  const rc  = code || getCountryCode(team)
  const url = getFlagUrl(rc, '32x24')
  if (!url) return null
  return <img src={url} alt={team} style={{ borderRadius: 2, width: 24, height: 18, objectFit: 'cover', verticalAlign: 'middle', flexShrink: 0 }} />
}

function StatusBadge({ status }) {
  const map = {
    upcoming: { label: 'Próximo',    bg: 'rgba(0,200,83,0.08)',   color: '#00c853', border: 'rgba(0,200,83,0.3)'   },
    live:     { label: 'En vivo',    bg: 'rgba(239,68,68,0.08)',  color: '#ef4444', border: 'rgba(239,68,68,0.3)'  },
    finished: { label: 'Finalizado', bg: 'rgba(107,114,128,0.08)', color: '#6b7280', border: 'rgba(107,114,128,0.3)' },
  }
  const s = map[status] ?? map.upcoming
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 12, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap',
    }}>
      {status === 'live' && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'dot-pulse 1.4s ease-in-out infinite', flexShrink: 0 }} />
      )}
      {s.label}
    </span>
  )
}

// ── Toast ────────────────────────────────────────────────────────
function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 4000); return () => clearTimeout(t) }, [])
  return (
    <div className="animate-fade-in" style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '11px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500,
      background: '#fff', whiteSpace: 'nowrap',
      border: `1px solid ${type === 'error' ? 'rgba(220,38,38,0.3)' : 'rgba(0,200,83,0.3)'}`,
      color: type === 'error' ? '#dc2626' : '#00c853',
      boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
    }}>
      <span className="material-icons" style={{ fontSize: 17 }}>
        {type === 'error' ? 'error_outline' : 'check_circle'}
      </span>
      {msg}
    </div>
  )
}

// ── CSS bar chart ────────────────────────────────────────────────
function PointsBar({ rows }) {
  const top10  = rows.slice(0, 10)
  const max    = top10[0]?.total_points || 1
  const COLORS = ['#f59e0b', '#94a3b8', '#d97706', '#6366f1', '#00c853', '#00c853', '#00c853', '#00c853', '#00c853', '#00c853']
  if (top10.length === 0) return <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', margin: '16px 0' }}>Sin datos de puntuación aún</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {top10.map((u, i) => (
        <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 22, fontSize: 11, color: '#9ca3af', textAlign: 'right', flexShrink: 0 }}>#{i + 1}</span>
          <span style={{ width: 130, fontSize: 13, fontWeight: 600, color: '#1a2332', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{u.name}</span>
          <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 6, height: 26, overflow: 'hidden' }}>
            <div style={{
              width: `${Math.max((u.total_points / max) * 100, u.total_points > 0 ? 5 : 0)}%`,
              height: '100%', background: COLORS[i], borderRadius: 6,
              display: 'flex', alignItems: 'center', paddingLeft: 10,
              transition: 'width 0.7s ease',
            }}>
              {u.total_points > 0 && <span style={{ fontSize: 11, color: '#fff', fontWeight: 700, whiteSpace: 'nowrap' }}>{u.total_points} pts</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

const ROUND_OPTS = [
  { value: 'GROUP',        label: 'Fase de grupos'   },
  { value: 'ROUND_OF_32',  label: 'Ronda de 32'      },
  { value: 'ROUND_OF_16',  label: 'Octavos de final' },
  { value: 'QUARTER_FINAL',label: 'Cuartos de final' },
  { value: 'SEMI_FINAL',   label: 'Semifinales'       },
  { value: 'THIRD_PLACE',  label: 'Tercer puesto'    },
  { value: 'FINAL',        label: 'Final'            },
]

const scoreInput = {
  width: 44, background: '#f8fafc', border: '1.5px solid #e5e7eb', borderRadius: 6,
  padding: '5px 4px', color: '#1a2332', fontSize: 16, fontWeight: 700,
  textAlign: 'center', outline: 'none', fontFamily: 'inherit',
  transition: 'border-color 0.15s',
}

// ── Page ─────────────────────────────────────────────────────────
export default function Admin() {
  const { user }   = useAuth()
  const navigate   = useNavigate()

  const [matches,    setMatches]    = useState([])
  const [users,      setUsers]      = useState([])
  const [adminStats, setAdminStats] = useState(null)
  const [globalRows, setGlobalRows] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [toast,      setToast]      = useState(null)
  const [tab,        setTab]        = useState('results')

  // Results tab
  const [filterGroup,  setFilterGroup]  = useState('all')
  const [filterStatus, setFilterStatus] = useState('finished')
  const [scores,       setScores]       = useState({})   // { [matchId]: { home, away } }
  const [saving,       setSaving]       = useState(new Set())

  // Users tab
  const [userSearch, setUserSearch] = useState('')

  // New match form
  const emptyNm = { homeTeam: '', awayTeam: '', homeCountryCode: '', awayCountryCode: '', matchTime: '', stage: '', round: 'GROUP' }
  const [nm, setNm] = useState(emptyNm)

  useEffect(() => {
    if (!user?.isAdmin) { navigate('/'); return }
    Promise.all([
      api.get('/admin/matches'),
      api.get('/admin/users'),
      api.get('/admin/stats').catch(() => ({ data: null })),
      api.get('/leaderboard/global').catch(() => ({ data: [] })),
    ]).then(([mR, uR, sR, lbR]) => {
      setMatches(mR.data)
      setUsers(uR.data)
      setAdminStats(sR.data)
      setGlobalRows(lbR.data)
      // Pre-fill score inputs with already-saved scores
      const init = {}
      mR.data.forEach(m => {
        if (m.home_score != null) init[m.id] = { home: String(m.home_score), away: String(m.away_score) }
      })
      setScores(init)
    }).finally(() => setLoading(false))
  }, [user])

  const flash = (msg, type = 'success') => setToast({ msg, type })

  // ── Save result (triggers automatic point calculation) ──────────
  async function submitResult(matchId) {
    const s = scores[matchId]
    if (s?.home === '' || s?.away === '' || s?.home == null || s?.away == null) {
      return flash('Ingresa ambos marcadores antes de guardar', 'error')
    }
    setSaving(prev => new Set(prev).add(matchId))
    try {
      await api.put(`/admin/matches/${matchId}/result`, {
        homeScore: Number(s.home),
        awayScore: Number(s.away),
      })
      setMatches(prev => prev.map(m =>
        m.id === matchId
          ? { ...m, home_score: Number(s.home), away_score: Number(s.away) }
          : m
      ))
      flash('Resultado guardado · puntos calculados automáticamente')
    } catch (err) {
      flash(err.response?.data?.error || 'Error al guardar', 'error')
    } finally {
      setSaving(prev => { const n = new Set(prev); n.delete(matchId); return n })
    }
  }

  // ── User management ─────────────────────────────────────────────
  async function promoteUser(userId) {
    try {
      const { data } = await api.post(`/admin/users/${userId}/promote`)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...data } : u))
      flash('Usuario promovido a Admin')
    } catch (err) { flash(err.response?.data?.error || 'Error', 'error') }
  }

  async function demoteUser(userId) {
    try {
      const { data } = await api.post(`/admin/users/${userId}/demote`)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...data } : u))
      flash('Admin degradado a Usuario')
    } catch (err) { flash(err.response?.data?.error || 'Error', 'error') }
  }

  // ── Create match ────────────────────────────────────────────────
  async function createMatch(e) {
    e.preventDefault()
    try {
      const { data } = await api.post('/admin/matches', nm)
      setMatches(prev => [...prev, data])
      setNm(emptyNm)
      flash('Partido creado')
    } catch (err) { flash(err.response?.data?.error || 'Error', 'error') }
  }

  // ── Derived ──────────────────────────────────────────────────────
  const groups = useMemo(() =>
    ['all', ...[...new Set(matches.filter(m => m.stage).map(m => m.stage))].sort()],
  [matches])

  const filteredMatches = useMemo(() =>
    matches.filter(m => {
      if (filterGroup  !== 'all' && m.stage  !== filterGroup)  return false
      if (filterStatus !== 'all' && m.status !== filterStatus) return false
      return true
    }).sort((a, b) => new Date(a.match_time) - new Date(b.match_time)),
  [matches, filterGroup, filterStatus])

  const filteredUsers = useMemo(() =>
    users.filter(u => {
      if (!userSearch.trim()) return true
      const q = userSearch.toLowerCase()
      return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
    }),
  [users, userSearch])

  if (loading) return <LoadingSpinner label="Cargando panel…" />

  const pendingResults = matches.filter(m => m.status === 'finished' && m.home_score == null).length
  const finishedCount  = matches.filter(m => m.status === 'finished').length

  return (
    <div className="animate-fade-in">
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {/* ── Header ──────────────────────────────────── */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MenuBtn />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ color: '#1a2332', fontSize: 22, fontWeight: 700, margin: 0 }}>Administración</h1>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(0,200,83,0.1)', color: '#00c853', border: '1px solid rgba(0,200,83,0.2)' }}>
                Admin
              </span>
            </div>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '2px 0 0' }}>
              Los puntos se calculan automáticamente al guardar un resultado
            </p>
          </div>
        </div>
        {pendingResults > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8 }}>
            <span className="material-icons" style={{ fontSize: 16, color: '#f59e0b' }}>pending_actions</span>
            <span style={{ fontSize: 13, color: '#d97706', fontWeight: 600 }}>
              {pendingResults} partido{pendingResults !== 1 ? 's' : ''} sin resultado
            </span>
          </div>
        )}
      </div>

      {/* ── Stats row ───────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { icon: 'sports_soccer', label: 'Total partidos',    value: matches.length,                      color: '#00c853' },
          { icon: 'people',        label: 'Usuarios',          value: users.length,                        color: '#6366f1' },
          { icon: 'sports_score',  label: 'Predicciones',      value: adminStats?.totalPredictions ?? '—', color: '#f59e0b' },
          { icon: 'check_circle',  label: 'Finalizados',       value: finishedCount,                       color: '#1a2332' },
        ].map(({ icon, label, value, color }) => (
          <div key={label} style={{
            flex: '1 1 140px', background: '#fff', border: '1px solid #e5e7eb',
            borderLeft: `4px solid ${color}`, borderRadius: 10, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <span className="material-icons" style={{ fontSize: 26, color }}>{icon}</span>
            <div>
              <p style={{ color: '#1a2332', fontWeight: 800, fontSize: 24, margin: 0, lineHeight: 1 }}>{value}</p>
              <p style={{ color: '#6b7280', fontSize: 11, margin: '3px 0 0' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ────────────────────────────────────── */}
      <div className="tab-bar" style={{ marginBottom: 20 }}>
        {[
          { id: 'results',     icon: 'sports_score',    label: 'Resultados'    },
          { id: 'new-match',   icon: 'add_circle',      label: 'Nuevo partido' },
          { id: 'users',       icon: 'manage_accounts', label: 'Usuarios'      },
          { id: 'globalstats', icon: 'bar_chart',       label: 'Estadísticas'  },
        ].map(t => (
          <button key={t.id} className={`tab-item ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <span className="material-icons" style={{ fontSize: 15 }}>{t.icon}</span>
            {t.label}
            {t.id === 'results' && pendingResults > 0 && (
              <span style={{ marginLeft: 4, background: '#f59e0b', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>
                {pendingResults}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════ TAB: RESULTADOS ════════════════ */}
      {tab === 'results' && (
        <div>
          {/* Info banner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(0,200,83,0.04)', border: '1px solid rgba(0,200,83,0.15)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#6b7280' }}>
            <span className="material-icons" style={{ fontSize: 16, color: '#00c853', flexShrink: 0 }}>auto_awesome</span>
            Al guardar un resultado se calculan automáticamente los puntos de todos los usuarios que predijeron ese partido y se actualiza el ranking en tiempo real.
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {groups.slice(0, 14).map(g => (
                <button key={g} onClick={() => setFilterGroup(g)} style={{
                  padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: filterGroup === g ? '1.5px solid #00c853' : '1.5px solid #e5e7eb',
                  background: filterGroup === g ? 'rgba(0,200,83,0.08)' : '#fff',
                  color: filterGroup === g ? '#00c853' : '#6b7280',
                }}>
                  {g === 'all' ? 'Todos' : g}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 5, marginLeft: 'auto' }}>
              {[
                { v: 'all',      l: 'Todos'      },
                { v: 'upcoming', l: 'Próximo'     },
                { v: 'live',     l: 'En vivo'     },
                { v: 'finished', l: 'Finalizados' },
              ].map(({ v, l }) => (
                <button key={v} onClick={() => setFilterStatus(v)} style={{
                  padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: filterStatus === v ? '1.5px solid #1a2332' : '1.5px solid #e5e7eb',
                  background: filterStatus === v ? '#1a2332' : '#fff',
                  color: filterStatus === v ? '#fff' : '#6b7280',
                }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {filteredMatches.length === 0
              ? <div style={{ textAlign: 'center', padding: '48px 20px', color: '#9ca3af', fontSize: 13 }}>
                  <span className="material-icons" style={{ fontSize: 32, display: 'block', marginBottom: 8, color: '#e5e7eb' }}>sports_soccer</span>
                  Sin partidos con estos filtros
                </div>
              : <table className="data-table">
                  <thead>
                    <tr>
                      <th>Partido</th>
                      <th style={{ width: 90 }}>Grupo</th>
                      <th style={{ width: 110 }}>Fecha</th>
                      <th style={{ width: 100 }}>Estado</th>
                      <th style={{ width: 180 }}>Resultado final</th>
                      <th style={{ width: 140 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMatches.map(match => {
                      const isSaving    = saving.has(match.id)
                      const canEdit     = match.status === 'finished'
                      const hasScore    = match.home_score != null
                      const draft       = scores[match.id]
                      const isDirty     = canEdit && draft && (
                        String(draft.home) !== String(match.home_score ?? '') ||
                        String(draft.away) !== String(match.away_score ?? '')
                      )

                      return (
                        <tr key={match.id} style={{ background: canEdit && !hasScore ? 'rgba(245,158,11,0.03)' : undefined }}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <SmallFlag team={match.home_team} code={match.home_country_code} />
                              <span style={{ fontWeight: 600, fontSize: 13, color: '#1a2332' }}>{match.home_team}</span>
                              <span style={{ color: '#d1d5db', fontSize: 11 }}>vs</span>
                              <span style={{ fontWeight: 600, fontSize: 13, color: '#1a2332' }}>{match.away_team}</span>
                              <SmallFlag team={match.away_team} code={match.away_country_code} />
                            </div>
                          </td>
                          <td style={{ color: '#6b7280', fontSize: 12 }}>{match.stage || '—'}</td>
                          <td style={{ color: '#6b7280', fontSize: 12, whiteSpace: 'nowrap' }}>
                            {new Date(match.match_time).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                            {' '}
                            {new Date(match.match_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td><StatusBadge status={match.status} /></td>
                          <td>
                            {canEdit ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <input
                                  type="number" min="0" max="30"
                                  placeholder="0"
                                  value={draft?.home ?? ''}
                                  onChange={e => setScores(p => ({ ...p, [match.id]: { ...p[match.id], home: e.target.value } }))}
                                  style={{ ...scoreInput, borderColor: isDirty ? '#f59e0b' : '#e5e7eb' }}
                                />
                                <span style={{ color: '#9ca3af', fontWeight: 700, fontSize: 14 }}>–</span>
                                <input
                                  type="number" min="0" max="30"
                                  placeholder="0"
                                  value={draft?.away ?? ''}
                                  onChange={e => setScores(p => ({ ...p, [match.id]: { ...p[match.id], away: e.target.value } }))}
                                  style={{ ...scoreInput, borderColor: isDirty ? '#f59e0b' : '#e5e7eb' }}
                                />
                                {hasScore && !isDirty && (
                                  <span className="material-icons" style={{ fontSize: 15, color: '#00c853' }} title="Resultado guardado">check_circle</span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: '#d1d5db', fontSize: 13 }}>
                                {match.status === 'live' ? 'En juego…' : '—'}
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {canEdit && (
                              <button
                                onClick={() => submitResult(match.id)}
                                disabled={isSaving}
                                className="btn-primary"
                                style={{ padding: '5px 12px', fontSize: 12, opacity: isSaving ? 0.7 : 1 }}
                              >
                                {isSaving ? (
                                  <>
                                    <span className="material-icons" style={{ fontSize: 14, animation: 'spin 1s linear infinite' }}>sync</span>
                                    Guardando…
                                  </>
                                ) : (
                                  <>
                                    <span className="material-icons" style={{ fontSize: 14 }}>save</span>
                                    {hasScore ? 'Actualizar' : 'Guardar'}
                                  </>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
            }
          </div>
        </div>
      )}

      {/* ══════════════ TAB: NUEVO PARTIDO ════════════ */}
      {tab === 'new-match' && (
        <form onSubmit={createMatch} className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <span className="material-icons" style={{ fontSize: 20, color: '#00c853' }}>add_circle</span>
            <h2 style={{ color: '#1a2332', fontWeight: 700, fontSize: 15, margin: 0 }}>Crear partido manualmente</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {[
              { field: 'homeTeam',        label: 'Equipo local',     placeholder: 'Ej: Argentina', required: true  },
              { field: 'awayTeam',        label: 'Equipo visitante', placeholder: 'Ej: Brasil',    required: true  },
              { field: 'homeCountryCode', label: 'Código bandera local',     placeholder: 'Ej: ar'                },
              { field: 'awayCountryCode', label: 'Código bandera visitante', placeholder: 'Ej: br'                },
            ].map(({ field, label, placeholder, required }) => (
              <div key={field}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{label}</label>
                <input value={nm[field]} onChange={e => setNm(p => ({ ...p, [field]: e.target.value }))} className="input" placeholder={placeholder} required={required} />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Fecha y hora</label>
              <input type="datetime-local" value={nm.matchTime} onChange={e => setNm(p => ({ ...p, matchTime: e.target.value }))} className="input" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Grupo / Fase</label>
              <input value={nm.stage} onChange={e => setNm(p => ({ ...p, stage: e.target.value }))} className="input" placeholder="Ej: Group A" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Ronda</label>
              <select value={nm.round} onChange={e => setNm(p => ({ ...p, round: e.target.value }))} className="input" style={{ cursor: 'pointer' }}>
                {ROUND_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
            <button type="submit" className="btn-primary">
              <span className="material-icons" style={{ fontSize: 16 }}>add</span>
              Crear partido
            </button>
            <button type="button" onClick={() => setNm(emptyNm)} className="btn-secondary">
              Limpiar
            </button>
          </div>
        </form>
      )}

      {/* ══════════════ TAB: USUARIOS ═════════════════ */}
      {tab === 'users' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px', position: 'relative' }}>
              <span className="material-icons" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: '#9ca3af' }}>search</span>
              <input
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="input"
                placeholder="Buscar por nombre o email…"
                style={{ paddingLeft: 36 }}
              />
            </div>
            <span style={{ fontSize: 13, color: '#6b7280', flexShrink: 0 }}>
              {filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th style={{ width: 180 }}>Email</th>
                  <th style={{ width: 70, textAlign: 'right' }}>Pts</th>
                  <th style={{ width: 80, textAlign: 'right' }}>Preds</th>
                  <th style={{ width: 80, textAlign: 'right' }}>Aciertos</th>
                  <th style={{ width: 80 }}>Rol</th>
                  <th style={{ width: 110 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {u.avatar
                          ? <img src={u.avatar} style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} alt="" referrerPolicy="no-referrer" />
                          : <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1a2332', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{u.name?.[0]}</div>
                        }
                        <span style={{ fontWeight: 600, fontSize: 13, color: '#1a2332' }}>{u.name}</span>
                      </div>
                    </td>
                    <td><span style={{ color: '#6b7280', fontSize: 12 }}>{u.email}</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>{u.total_points ?? 0}</td>
                    <td style={{ textAlign: 'right', color: '#6b7280', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{u.prediction_count ?? 0}</td>
                    <td style={{ textAlign: 'right', color: '#00c853', fontWeight: 600, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{u.correct_predictions ?? 0}</td>
                    <td>
                      {u.is_admin
                        ? <span className="badge" style={{ background: 'rgba(245,168,0,0.1)', color: '#d97706', border: '1px solid rgba(245,168,0,0.25)' }}>Admin</span>
                        : <span style={{ color: '#9ca3af', fontSize: 12 }}>Usuario</span>
                      }
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {u.id !== user?.id && (
                        u.is_admin
                          ? <button onClick={() => demoteUser(u.id)} className="btn-ghost" style={{ color: '#ef4444', fontSize: 12 }}>
                              <span className="material-icons" style={{ fontSize: 14 }}>person_remove</span>
                              Degradar
                            </button>
                          : <button onClick={() => promoteUser(u.id)} className="btn-ghost" style={{ color: '#00c853', fontSize: 12 }}>
                              <span className="material-icons" style={{ fontSize: 14 }}>manage_accounts</span>
                              Promover
                            </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════ TAB: ESTADÍSTICAS ═════════════ */}
      {tab === 'globalstats' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            {[
              { icon: 'sports_score', color: '#f59e0b', label: 'Total predicciones',          value: adminStats?.totalPredictions ?? '—'                                          },
              { icon: 'percent',      color: '#00c853', label: '% de aciertos global',         value: adminStats?.accuracy != null ? `${adminStats.accuracy}%` : '—'              },
              { icon: 'emoji_events', color: '#6366f1', label: 'Equipo favorito a ganar',      value: adminStats?.topTeam?.team_name ?? '—'                                        },
              { icon: 'trending_up',  color: '#ef4444', label: 'Partido más predicho',         value: adminStats?.topMatch ? `${adminStats.topMatch.home_team} vs ${adminStats.topMatch.away_team}` : '—' },
            ].map(({ icon, color, label, value }) => (
              <div key={label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderTop: `4px solid ${color}`, borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span className="material-icons" style={{ fontSize: 20, color }}>{icon}</span>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{label}</span>
                </div>
                <p style={{ color: '#1a2332', fontWeight: 700, fontSize: 20, margin: 0, wordBreak: 'break-word' }}>{value}</p>
              </div>
            ))}
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <span className="material-icons" style={{ fontSize: 20, color: '#f59e0b' }}>bar_chart</span>
              <h2 style={{ color: '#1a2332', fontWeight: 700, fontSize: 15, margin: 0 }}>Top 10 jugadores por puntos</h2>
            </div>
            <PointsBar rows={globalRows} />
          </div>

          {adminStats?.topMatch && (
            <div className="card" style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span className="material-icons" style={{ fontSize: 18, color: '#6366f1' }}>leaderboard</span>
                <h2 style={{ color: '#1a2332', fontWeight: 700, fontSize: 14, margin: 0 }}>Partido con más predicciones</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <SmallFlag team={adminStats.topMatch.home_team} />
                <span style={{ fontWeight: 700, fontSize: 14, color: '#1a2332' }}>{adminStats.topMatch.home_team}</span>
                <span style={{ padding: '3px 10px', background: 'rgba(0,200,83,0.08)', color: '#00c853', fontWeight: 700, fontSize: 12, borderRadius: 4 }}>vs</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#1a2332' }}>{adminStats.topMatch.away_team}</span>
                <SmallFlag team={adminStats.topMatch.away_team} />
                <span style={{ marginLeft: 'auto', fontSize: 13, color: '#6b7280' }}>
                  <strong style={{ color: '#f59e0b', fontSize: 16 }}>{adminStats.topMatch.pred_count}</strong> predicciones
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
