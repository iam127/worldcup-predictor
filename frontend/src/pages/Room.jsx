import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/index.js'
import { useWebSocket } from '../contexts/WebSocketContext.jsx'
import MatchCard from '../components/MatchCard.jsx'
import PredictionForm from '../components/PredictionForm.jsx'
import LeaderboardTable from '../components/LeaderboardTable.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import MenuBtn from '../components/MenuBtn.jsx'

const PHASES = [
  { id: 'GROUP',         label: 'Grupos',  icon: 'grid_view',     rounds: ['GROUP'] },
  { id: 'ROUND_OF_32',   label: 'Octavos', icon: 'emoji_events',  rounds: ['ROUND_OF_32', 'ROUND_OF_16'] },
  { id: 'QUARTER_FINAL', label: 'Cuartos', icon: 'emoji_events',  rounds: ['QUARTER_FINAL'] },
  { id: 'SEMI_FINAL',    label: 'Semis',   icon: 'emoji_events',  rounds: ['SEMI_FINAL'] },
  { id: 'FINAL',         label: 'Final',   icon: 'military_tech', rounds: ['FINAL', 'THIRD_PLACE'] },
]

function PhaseMatches({ matches, predictions, onPredict, phase }) {
  if (matches.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
        <span className="material-icons" style={{ fontSize: 36, display: 'block', marginBottom: 8 }}>sports_soccer</span>
        <p style={{ fontSize: 14, margin: 0 }}>No hay partidos en esta fase todavía.</p>
      </div>
    )
  }

  if (phase === 'GROUP') {
    // Group by stage (Group A, Group B, …)
    const byGroup = {}
    matches.forEach(m => {
      const key = m.stage || 'Grupos'
      if (!byGroup[key]) byGroup[key] = []
      byGroup[key].push(m)
    })
    const groups = Object.keys(byGroup).sort()
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {groups.map(group => (
          <div key={group}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1a2332', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{group}</span>
              <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
            </div>
            <div className="match-grid">
              {byGroup[group].map(match => (
                <MatchCard key={match.id} match={match} prediction={predictions[match.id]} onPredict={onPredict} />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Knockout phases — group by stage sub-label if multiple rounds
  const byRound = {}
  matches.forEach(m => {
    const key = m.stage || 'Eliminatorias'
    if (!byRound[key]) byRound[key] = []
    byRound[key].push(m)
  })
  const rounds = Object.keys(byRound)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {rounds.map(roundLabel => (
        <div key={roundLabel}>
          {rounds.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1a2332', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{roundLabel}</span>
              <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
            </div>
          )}
          <div className="match-grid">
            {byRound[roundLabel].map(match => (
              <MatchCard key={match.id} match={match} prediction={predictions[match.id]} onPredict={onPredict} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Room() {
  const { id }                     = useParams()
  const { connect, on, connected } = useWebSocket()

  const [room, setRoom]               = useState(null)
  const [matches, setMatches]         = useState([])
  const [predictions, setPredictions] = useState({})
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading]         = useState(true)
  const [activeMatch, setActiveMatch] = useState(null)
  const [tab, setTab]                 = useState('matches')
  const [phase, setPhase]             = useState('GROUP')

  const loadLeaderboard = useCallback(() => {
    api.get(`/leaderboard/room/${id}`).then(r => setLeaderboard(r.data)).catch(() => {})
  }, [id])

  useEffect(() => {
    Promise.all([
      api.get(`/rooms/${id}`),
      api.get('/matches'),
      api.get(`/predictions/room/${id}`),
      api.get(`/leaderboard/room/${id}`),
    ]).then(([roomR, matchR, predR, lbR]) => {
      setRoom(roomR.data)
      setMatches(matchR.data)
      const predMap = {}
      predR.data.forEach(p => { predMap[p.match_id] = p })
      setPredictions(predMap)
      setLeaderboard(lbR.data)
    }).finally(() => setLoading(false))
    connect(id)
    const unsubLb     = on('leaderboard:update', loadLeaderboard)
    const unsubStatus = on('match:status_updated', ({ matchId, status }) => {
      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, status } : m))
    })
    return () => { unsubLb(); unsubStatus() }
  }, [id])

  async function savePrediction(homeScore, awayScore) {
    const { data } = await api.post('/predictions', { matchId: activeMatch.id, roomId: id, homeScore, awayScore })
    setPredictions(prev => ({ ...prev, [activeMatch.id]: data }))
  }

  if (loading) return <LoadingSpinner label="Cargando sala…" />
  if (!room) return (
    <div style={{ textAlign: 'center', paddingTop: 80 }}>
      <span className="material-icons" style={{ fontSize: 40, color: '#dc2626', display: 'block', marginBottom: 8 }}>error_outline</span>
      <p style={{ color: '#dc2626', fontSize: 14, marginBottom: 16 }}>Sala no encontrada.</p>
      <Link to="/" className="btn-secondary">← Volver</Link>
    </div>
  )

  const predicted    = Object.keys(predictions).length
  const pendingCount = matches.filter(m =>
    m.status === 'upcoming' &&
    m.home_team !== 'Por definir' &&
    m.away_team !== 'Por definir' &&
    !predictions[m.id]
  ).length

  const currentPhase = PHASES.find(p => p.id === phase) || PHASES[0]
  const filteredMatches = matches.filter(m =>
    currentPhase.rounds.includes(m.round || 'GROUP')
  )

  // Determine which phases have matches
  const phasesWithMatches = PHASES.filter(p =>
    matches.some(m => p.rounds.includes(m.round || 'GROUP'))
  )

  return (
    <div className="animate-fade-in">

      {/* Topbar */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <MenuBtn />
          <div>
          <Link to="/" className="btn-ghost" style={{ padding: '2px 4px', display: 'inline-flex', fontSize: 13, marginBottom: 3, gap: 4 }}>
            <span className="material-icons" style={{ fontSize: 15 }}>arrow_back</span>
            Inicio
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ color: '#1a2332', fontSize: 22, fontWeight: 700, margin: 0 }}>{room.name}</h1>
            <button className="invite-chip" onClick={() => navigator.clipboard?.writeText(room.invite_code)} title="Copiar código">
              {room.invite_code}
              <span className="material-icons" style={{ fontSize: 11, opacity: 0.6 }}>content_copy</span>
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 3, fontSize: 12, color: '#6b7280' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="material-icons" style={{ fontSize: 13 }}>person</span>
              {room.members?.length} participantes
            </span>
            <span>·</span>
            <span>{predicted} predicciones</span>
            {pendingCount > 0 && (
              <><span>·</span><span style={{ color: '#d97706', fontWeight: 500 }}>{pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}</span></>
            )}
          </div>
          </div>{/* end inner text div */}
        </div>{/* end left flex */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: connected ? '#00c853' : '#6b7280', flexShrink: 0 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? '#00c853' : '#d1d5db', display: 'inline-block', animation: connected ? 'dot-pulse 1.4s ease-in-out infinite' : 'none' }} />
          {connected ? 'En vivo' : 'Reconectando…'}
        </div>
      </div>

      {/* Main tabs */}
      <div className="tab-bar" style={{ marginBottom: 16 }}>
        <button className={`tab-item ${tab === 'matches' ? 'active' : ''}`} onClick={() => setTab('matches')}>
          <span className="material-icons" style={{ fontSize: 16 }}>calendar_today</span>
          Partidos
        </button>
        <button className={`tab-item ${tab === 'leaderboard' ? 'active' : ''}`} onClick={() => setTab('leaderboard')}>
          <span className="material-icons" style={{ fontSize: 16 }}>leaderboard</span>
          Clasificación
        </button>
      </div>

      {/* Matches */}
      {tab === 'matches' && (
        <>
          {/* Phase sub-tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
            {phasesWithMatches.map(p => {
              const liveInPhase = matches.some(m =>
                p.rounds.includes(m.round || 'GROUP') && m.status === 'live'
              )
              return (
                <button
                  key={p.id}
                  onClick={() => setPhase(p.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                    border: phase === p.id ? '1.5px solid #00c853' : '1.5px solid #e5e7eb',
                    background: phase === p.id ? 'rgba(0,200,83,0.08)' : '#ffffff',
                    color: phase === p.id ? '#00c853' : '#6b7280',
                    cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                  }}
                >
                  {liveInPhase && (
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                  )}
                  {p.label}
                </button>
              )
            })}
          </div>

          <PhaseMatches
            matches={filteredMatches}
            predictions={predictions}
            onPredict={setActiveMatch}
            phase={phase}
          />
        </>
      )}

      {/* Leaderboard */}
      {tab === 'leaderboard' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '13px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-icons" style={{ fontSize: 18, color: '#f5a800' }}>leaderboard</span>
            <h2 style={{ color: '#1a2332', fontWeight: 700, fontSize: 15, margin: 0 }}>Clasificación de la sala</h2>
          </div>
          <LeaderboardTable rows={leaderboard} />
        </div>
      )}

      {activeMatch && (
        <PredictionForm
          match={activeMatch}
          existing={predictions[activeMatch.id]}
          onSubmit={savePrediction}
          onClose={() => setActiveMatch(null)}
        />
      )}
    </div>
  )
}
