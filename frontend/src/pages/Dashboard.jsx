import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/index.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import MenuBtn from '../components/MenuBtn.jsx'
import { getCountryCode, getFlagUrl } from '../utils/flags.js'

const MEDALS = ['🥇', '🥈', '🥉']

// ── Small flag ──────────────────────────────────────────────────
function FlagSmall({ team, code }) {
  const rc  = code || getCountryCode(team)
  const url = getFlagUrl(rc, '32x24')
  if (!url) return <span style={{ fontSize: 16, lineHeight: 1 }}>🏳</span>
  return <img src={url} alt={team} style={{ width: 28, height: 21, borderRadius: 2, objectFit: 'cover', flexShrink: 0 }} />
}

// ── Stat card ───────────────────────────────────────────────────
function StatCard({ icon, label, value, color, subtext, subtextColor = '#6b7280' }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderTop: `4px solid ${color}`,
      borderRadius: 12, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span className="material-icons" style={{ fontSize: 24, color }}>{icon}</span>
        <span style={{ color: '#6b7280', fontSize: 13 }}>{label}</span>
      </div>
      <p className="stat-card-number" style={{ color: '#1a2332', fontSize: 40, fontWeight: 700, margin: 0, lineHeight: 1 }}>{value}</p>
      {subtext && (
        <p style={{ color: subtextColor, fontSize: 11, margin: '6px 0 0', fontWeight: 500 }}>{subtext}</p>
      )}
    </div>
  )
}

// ── Room card ───────────────────────────────────────────────────
function RoomCard({ room }) {
  return (
    <Link to={`/room/${room.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{
          background: '#fff', border: '1px solid #e5e7eb', borderTop: '3px solid #e5e7eb',
          borderRadius: 12, padding: 18, cursor: 'pointer',
          transition: 'box-shadow 0.15s, border-top-color 0.15s',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; e.currentTarget.style.borderTopColor = '#00c853' }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; e.currentTarget.style.borderTopColor = '#e5e7eb' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span className="material-icons" style={{ fontSize: 20, color: '#6b7280' }}>groups</span>
          <span className="invite-chip">{room.invite_code}</span>
        </div>
        <p style={{ color: '#1a2332', fontWeight: 600, fontSize: 14, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {room.name}
        </p>
        <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>
          {room.member_count} miembro{room.member_count !== '1' ? 's' : ''} · {room.owner_name}
        </p>
      </div>
    </Link>
  )
}

// ── Upcoming match row ──────────────────────────────────────────
function UpcomingRow({ match, firstRoomId }) {
  const kickoff = new Date(match.match_time)
  const diffH   = (kickoff - new Date()) / 3_600_000

  let timeLabel
  if (diffH < 1) {
    timeLabel = `En ${Math.max(1, Math.floor(diffH * 60))}m`
  } else if (diffH < 24) {
    timeLabel = `En ${Math.floor(diffH)}h`
  } else {
    timeLabel = kickoff.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
  }
  const timeStr = kickoff.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
      {/* Teams */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <FlagSmall team={match.home_team} code={match.home_country_code} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1a2332', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}>
          {match.home_team}
        </span>
        <span style={{ fontSize: 11, color: '#d1d5db', fontWeight: 700, flexShrink: 0 }}>vs</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1a2332', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}>
          {match.away_team}
        </span>
        <FlagSmall team={match.away_team} code={match.away_country_code} />
      </div>
      {/* Group badge + time */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#1a2332' }}>{timeLabel}</div>
        <div style={{ fontSize: 11, color: '#9ca3af' }}>
          {timeStr}
          {match.stage && <> · <span style={{ color: '#6b7280' }}>{match.stage}</span></>}
        </div>
      </div>
      {/* Predecir */}
      <div style={{ flexShrink: 0 }}>
        {firstRoomId
          ? <Link to={`/room/${firstRoomId}`} className="btn-primary" style={{ padding: '5px 12px', fontSize: 12, textDecoration: 'none' }}>
              Predecir
            </Link>
          : <span style={{ fontSize: 12, color: '#d1d5db', padding: '5px 0' }}>—</span>
        }
      </div>
    </div>
  )
}

// ── Recent prediction row ───────────────────────────────────────
function RecentRow({ pred }) {
  const ms = pred.match_status
  let statusEl
  if (ms === 'live') {
    statusEl = <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 700 }}>🔴 En vivo</span>
  } else if (ms === 'finished') {
    statusEl = pred.points_earned > 0
      ? <span style={{ fontSize: 11, color: '#00c853', fontWeight: 700 }}>✓ +{pred.points_earned} pts</span>
      : <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>✗ 0 pts</span>
  } else {
    statusEl = <span style={{ fontSize: 11, color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: 4, fontWeight: 500 }}>Pendiente</span>
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid #f3f4f6' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: 13, margin: 0, color: '#1a2332', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {pred.home_team} vs {pred.away_team}
        </p>
        <p style={{ color: '#9ca3af', fontSize: 11, margin: '2px 0 0' }}>
          {pred.stage}{pred.room_name ? ` · ${pred.room_name}` : ''}
        </p>
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#1a2332', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
        {pred.home_score_pred} – {pred.away_score_pred}
      </div>
      <div style={{ flexShrink: 0 }}>{statusEl}</div>
    </div>
  )
}

// ── Dashboard ───────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth()

  const [rooms,         setRooms]         = useState([])
  const [stats,         setStats]         = useState(null)
  const [globalRows,    setGlobalRows]    = useState([])
  const [upcoming,      setUpcoming]      = useState([])
  const [recentPreds,   setRecentPreds]   = useState([])
  const [pendingCount,  setPendingCount]  = useState(0)
  const [loading,       setLoading]       = useState(true)
  const [creating,      setCreating]      = useState(false)
  const [joining,       setJoining]       = useState(false)
  const [newName,       setNewName]       = useState('')
  const [inviteInput,   setInviteInput]   = useState('')
  const [error,         setError]         = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/rooms'),
      api.get('/leaderboard/global'),
      api.get('/matches'),
      api.get('/predictions/me/recent').catch(() => ({ data: { recent: [], pendingCount: 0 } })),
    ]).then(([roomsR, lbR, matchR, predR]) => {
      setRooms(roomsR.data)
      setGlobalRows(lbR.data)
      const me = lbR.data.find(r => r.id === user?.id)
      setStats(me || { total_points: 0, best_streak: 0, correct_predictions: 0 })

      setUpcoming(
        matchR.data
          .filter(m => m.status === 'upcoming' && m.home_team !== 'Por definir' && m.away_team !== 'Por definir')
          .sort((a, b) => new Date(a.match_time) - new Date(b.match_time))
          .slice(0, 3)
      )

      const pd = predR.data
      if (pd?.recent) {
        setRecentPreds(pd.recent)
        setPendingCount(pd.pendingCount ?? 0)
      } else if (Array.isArray(pd)) {
        setRecentPreds(pd)
      }
    }).finally(() => setLoading(false))
  }, [user])

  async function createRoom(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setError('')
    try {
      const { data } = await api.post('/rooms', { name: newName.trim() })
      setRooms(prev => [data, ...prev])
      setNewName('')
      setCreating(false)
    } catch (err) { setError(err.response?.data?.error || 'Error al crear sala') }
  }

  async function joinRoom(e) {
    e.preventDefault()
    if (!inviteInput.trim()) return
    setError('')
    try {
      const { data } = await api.post('/rooms/join', { inviteCode: inviteInput.trim() })
      setRooms(prev => prev.find(r => r.id === data.id) ? prev : [data, ...prev])
      setInviteInput('')
      setJoining(false)
    } catch (err) { setError(err.response?.data?.error || 'Código inválido') }
  }

  if (loading) return <LoadingSpinner label="Cargando…" />

  const myRank       = globalRows.findIndex(r => r.id === user?.id) + 1
  const totalUsers   = globalRows.length
  const betterThanPct = myRank > 0 && totalUsers > 1
    ? Math.round(((totalUsers - myRank) / (totalUsers - 1)) * 100)
    : null
  const top3         = globalRows.slice(0, 3)
  const firstRoomId  = rooms[0]?.id

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0]

  const STATS_DEF = [
    {
      key: 'total_points', icon: 'emoji_events', label: 'Puntos totales', color: '#f59e0b',
      subtext: betterThanPct !== null
        ? `↑ Mejor que el ${betterThanPct}% de jugadores`
        : 'Sin puntos aún',
      subtextColor: betterThanPct !== null && betterThanPct >= 50 ? '#00c853' : '#6b7280',
    },
    {
      key: 'best_streak', icon: 'local_fire_department', label: 'Mejor racha', color: '#ef4444',
      subtext: stats?.best_streak > 0 ? `${stats.best_streak} predicciones seguidas` : 'Sin racha aún',
    },
    {
      key: 'correct_predictions', icon: 'check_circle', label: 'Aciertos', color: '#00c853',
      subtext: stats?.correct_predictions > 0 ? `${stats.correct_predictions} marcadores correctos` : 'Sin aciertos aún',
    },
    {
      key: 'rooms', icon: 'groups', label: 'Mis salas', color: '#6366f1',
      value: rooms.length,
      subtext: rooms.length > 0 ? `${rooms.length} sala${rooms.length !== 1 ? 's' : ''} activa${rooms.length !== 1 ? 's' : ''}` : 'Aún sin salas',
    },
  ]

  return (
    <div className="animate-fade-in">

      {/* ── Page header ──────────────────────────────── */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MenuBtn />
          <div>
            <h1 style={{ color: '#1a2332', fontSize: 22, fontWeight: 700, margin: 0 }}>
              {greeting}, {firstName}
            </h1>
            <p style={{
              fontSize: 13, margin: '2px 0 0', fontWeight: 500,
              color: pendingCount > 5 ? '#ef4444' : pendingCount > 0 ? '#d97706' : '#6b7280',
            }}>
              {pendingCount > 0
                ? `${pendingCount} partido${pendingCount !== 1 ? 's' : ''} pendiente${pendingCount !== 1 ? 's' : ''} de predecir`
                : 'Todo al día con tus predicciones ✓'
              }
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setJoining(false); setCreating(v => !v) }} className="btn-primary">
            <span className="material-icons" style={{ fontSize: 16 }}>add</span>
            <span className="hide-xs">Nueva sala</span>
          </button>
          <button onClick={() => { setCreating(false); setJoining(v => !v) }} className="btn-secondary">
            <span className="material-icons" style={{ fontSize: 16 }}>login</span>
            <span className="hide-xs">Unirse</span>
          </button>
        </div>
      </div>

      {/* ── Forms ────────────────────────────────────── */}
      {(creating || joining) && (
        <form
          onSubmit={creating ? createRoom : joinRoom}
          className="animate-fade-in"
          style={{ display: 'flex', gap: 8, marginBottom: 16, padding: 16, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
        >
          <input
            value={creating ? newName : inviteInput}
            onChange={e => creating ? setNewName(e.target.value) : setInviteInput(e.target.value.toUpperCase())}
            placeholder={creating ? 'Nombre de la sala' : 'Código de invitación (ej: AB12CD34)'}
            className="input"
            style={{ flex: 1, ...(!creating ? { fontFamily: 'Courier New, monospace', letterSpacing: '0.1em', fontWeight: 700 } : {}) }}
            autoFocus maxLength={creating ? 60 : 8}
          />
          <button type="submit" className="btn-primary">{creating ? 'Crear' : 'Unirse'}</button>
          <button type="button" onClick={() => { setCreating(false); setJoining(false) }} className="btn-secondary" style={{ padding: '8px 12px' }}>
            <span className="material-icons" style={{ fontSize: 18 }}>close</span>
          </button>
        </form>
      )}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginBottom: 16, borderRadius: 6, background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626', fontSize: 14 }}>
          <span className="material-icons" style={{ fontSize: 16 }}>error_outline</span>
          {error}
        </div>
      )}

      {/* ── Stats ────────────────────────────────────── */}
      <div className="stat-grid">
        {STATS_DEF.map(({ key, icon, label, color, value, subtext, subtextColor }) => (
          <StatCard
            key={key}
            icon={icon}
            label={label}
            value={value ?? stats?.[key] ?? 0}
            color={color}
            subtext={subtext}
            subtextColor={subtextColor}
          />
        ))}
      </div>

      {/* ── Mid row: upcoming + ranking ──────────────── */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Próximos partidos */}
        <div style={{ flex: '2 1 360px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <h2 style={{ color: '#1a2332', fontSize: 15, fontWeight: 700, margin: 0 }}>Próximos partidos</h2>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
              background: 'rgba(0,200,83,0.1)', color: '#00c853', border: '1px solid rgba(0,200,83,0.2)',
            }}>
              Mundial 2026
            </span>
          </div>

          {upcoming.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '32px 20px', color: '#9ca3af', fontSize: 13 }}>
              <span className="material-icons" style={{ fontSize: 32, display: 'block', marginBottom: 8, color: '#e2e8f0' }}>sports_soccer</span>
              No hay partidos próximos disponibles
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {upcoming.map(m => <UpcomingRow key={m.id} match={m} firstRoomId={firstRoomId} />)}
              <div style={{ padding: '10px 16px', background: '#fafafa', borderTop: '1px solid #f3f4f6' }}>
                {firstRoomId
                  ? <Link to={`/room/${firstRoomId}`} style={{ fontSize: 12, color: '#00c853', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span className="material-icons" style={{ fontSize: 14 }}>arrow_forward</span>
                      Ver todos los partidos
                    </Link>
                  : <span style={{ fontSize: 12, color: '#9ca3af' }}>Únete a una sala para predecir</span>
                }
              </div>
            </div>
          )}
        </div>

        {/* Posición global */}
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          <h2 style={{ color: '#1a2332', fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Tu posición global</h2>
          <div className="card">
            {myRank > 0 ? (
              <>
                <div style={{ textAlign: 'center', padding: '16px 0 14px' }}>
                  <span style={{ fontSize: 44, fontWeight: 800, color: '#1a2332', lineHeight: 1 }}>#{myRank}</span>
                  <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>de {totalUsers} participante{totalUsers !== 1 ? 's' : ''}</div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginBottom: 5 }}>
                    <span>Jugadores superados</span>
                    <span style={{ fontWeight: 700, color: '#00c853' }}>{betterThanPct}%</span>
                  </div>
                  <div style={{ background: '#f3f4f6', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                    <div style={{
                      width: `${betterThanPct || 0}%`, height: '100%',
                      background: 'linear-gradient(90deg, #00c853, #00a844)',
                      borderRadius: 6, transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>

                {top3.length > 0 && (
                  <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Top 3</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {top3.map((u, i) => (
                        <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16, lineHeight: 1 }}>{MEDALS[i]}</span>
                          <span style={{
                            flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            color: u.id === user?.id ? '#00c853' : '#1a2332',
                            fontWeight: u.id === user?.id ? 700 : 500,
                          }}>
                            {u.name}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', flexShrink: 0 }}>
                            {u.total_points} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '28px 16px', color: '#9ca3af', fontSize: 13 }}>
                <span className="material-icons" style={{ fontSize: 32, display: 'block', marginBottom: 10, color: '#e2e8f0' }}>leaderboard</span>
                <p style={{ margin: '0 0 14px', lineHeight: 1.5 }}>Participa en una sala para aparecer en el ranking global</p>
                <button onClick={() => setCreating(true)} className="btn-primary" style={{ fontSize: 12, padding: '6px 16px' }}>
                  Crear sala
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Predicciones recientes ────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: '#1a2332', fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Mis predicciones recientes</h2>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {recentPreds.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <span className="material-icons" style={{ fontSize: 36, color: '#e2e8f0', display: 'block', marginBottom: 10 }}>sports_soccer</span>
              <p style={{ color: '#1a2332', fontWeight: 600, fontSize: 14, margin: '0 0 4px' }}>Aún no has predicho ningún partido</p>
              <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 16px' }}>Únete a una sala y empieza a predecir</p>
              {firstRoomId
                ? <Link to={`/room/${firstRoomId}`} className="btn-primary" style={{ textDecoration: 'none', fontSize: 13 }}>
                    Hacer primera predicción
                  </Link>
                : <button onClick={() => setCreating(true)} className="btn-primary" style={{ fontSize: 13 }}>
                    Crear una sala
                  </button>
              }
            </div>
          ) : (
            <>
              {recentPreds.map((p, i) => <RecentRow key={`${p.home_team}_${p.match_time}_${i}`} pred={p} />)}
              {firstRoomId && (
                <div style={{ padding: '10px 16px', background: '#fafafa', borderTop: '1px solid #f3f4f6' }}>
                  <Link to={`/room/${firstRoomId}`} style={{ fontSize: 12, color: '#00c853', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span className="material-icons" style={{ fontSize: 14 }}>arrow_forward</span>
                    Ver todas mis predicciones
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Mis salas ────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ color: '#1a2332', fontSize: 15, fontWeight: 700, margin: 0 }}>Mis salas</h2>
          <span style={{ color: '#6b7280', fontSize: 12 }}>{rooms.length} sala{rooms.length !== 1 ? 's' : ''}</span>
        </div>
        {rooms.length === 0 ? (
          <div style={{ background: '#fff', border: '2px dashed #e5e7eb', borderRadius: 12, textAlign: 'center', padding: '48px 20px' }}>
            <span className="material-icons" style={{ fontSize: 40, color: '#e5e7eb', display: 'block', marginBottom: 12 }}>sports_soccer</span>
            <p style={{ color: '#1a2332', fontWeight: 600, fontSize: 15, margin: '0 0 4px' }}>No tienes salas todavía</p>
            <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Crea una sala o únete con un código</p>
          </div>
        ) : (
          <div className="room-grid">
            {rooms.map(room => <RoomCard key={room.id} room={room} />)}
          </div>
        )}
      </div>

    </div>
  )
}
