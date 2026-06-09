import { useState, useEffect } from 'react'
import api from '../api/index.js'
import { useWebSocket } from '../contexts/WebSocketContext.jsx'
import LeaderboardTable from '../components/LeaderboardTable.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import MenuBtn from '../components/MenuBtn.jsx'

export default function GlobalLeaderboard() {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const { connect, on }       = useWebSocket()

  function load() { api.get('/leaderboard/global').then(r => setRows(r.data)).catch(() => {}) }

  useEffect(() => {
    load()
    setLoading(false)
    connect('global')
    const unsub = on('global:update', load)
    return unsub
  }, [])

  if (loading) return <LoadingSpinner label="Cargando ranking…" />

  return (
    <div className="animate-fade-in">

      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MenuBtn />
          <div>
            <h1 style={{ color: '#1a2332', fontSize: 22, fontWeight: 700, margin: 0 }}>Ranking Global</h1>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '2px 0 0' }}>
              {rows.length} participante{rows.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#00c853' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00c853', display: 'inline-block', animation: 'dot-pulse 1.4s ease-in-out infinite' }} />
          Actualización en tiempo real
        </div>
      </div>

      {rows.length === 0
        ? <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
            <span className="material-icons" style={{ fontSize: 36, color: '#e2e8f0', display: 'block', marginBottom: 10 }}>leaderboard</span>
            <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>Sin participantes todavía.</p>
          </div>
        : <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <LeaderboardTable rows={rows} showStreak />
          </div>
      }
    </div>
  )
}
