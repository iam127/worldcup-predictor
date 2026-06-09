import { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { getCountryCode, getFlagUrl } from '../utils/flags.js'

const RULES = [
  { icon: 'emoji_events',          color: '#d97706', label: 'Marcador exacto',      pts: '5 pts'  },
  { icon: 'check_circle',          color: '#16a34a', label: 'Ganador correcto',      pts: '3 pts'  },
  { icon: 'trending_flat',         color: '#2563eb', label: 'Diferencia correcta',   pts: '2 pts'  },
  { icon: 'local_fire_department', color: '#ea580c', label: 'Racha de 3 seguidos',   pts: '+2 pts' },
  { icon: 'schedule',              color: '#7c3aed', label: 'Con 24h de antelación', pts: '+1 pt'  },
]

function FlagImg({ team, code }) {
  const resolvedCode = code || getCountryCode(team)
  const url = getFlagUrl(resolvedCode, '48x36')
  if (!url) return <span style={{ fontSize: 32, lineHeight: 1 }}>🏳</span>
  return (
    <img
      src={url}
      alt={team}
      style={{ borderRadius: 4, width: 48, height: 36, objectFit: 'cover', display: 'block' }}
      onError={e => { e.currentTarget.style.display = 'none' }}
    />
  )
}

function ScoreBtn({ dir, onClick }) {
  return (
    <button
      type="button" onClick={onClick}
      style={{
        width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
        border: '1px solid #e5e7eb', background: '#f9fafb',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#e5e7eb'}
      onMouseLeave={e => e.currentTarget.style.background = '#f9fafb'}
    >
      <span className="material-icons" style={{ fontSize: 16, color: '#6b7280' }}>
        {dir === '+' ? 'add' : 'remove'}
      </span>
    </button>
  )
}

export default function PredictionForm({ match, existing, onSubmit, onClose }) {
  const [home, setHome]     = useState(existing?.home_score_pred ?? 0)
  const [away, setAway]     = useState(existing?.away_score_pred ?? 0)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  const clamp = (v) => Math.max(0, Math.min(20, Number(v) || 0))

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSubmit(home, away)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar')
      setSaving(false)
    }
  }

  const isDraw       = home === away
  const winnerLabel  = home > away
    ? `🏆 Gana ${match.home_team}`
    : isDraw
      ? '= Empate'
      : `🏆 Gana ${match.away_team}`

  return ReactDOM.createPortal(
    <div
      className="modal-overlay"
      style={{
        position: 'fixed', top: 0, left: 0,
        width: '100vw', height: '100vh',
        zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
        padding: 16,
        boxSizing: 'border-box',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="animate-scale-in modal-card"
        style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: 'clamp(16px, 4vw, 32px)',
          width: 'min(480px, 100%)',
          maxHeight: 'min(90vh, 700px)',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          boxSizing: 'border-box',
          border: '1px solid #e5e7eb',
        }}
      >
        {/* ── Header ───────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: '1px solid #e5e7eb',
        }}>
          <div>
            <p style={{ color: '#1a2332', fontWeight: 700, fontSize: 18, margin: 0 }}>
              Tu predicción
            </p>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '3px 0 0' }}>
              {match.stage || 'Fase de grupos'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 6, borderRadius: 8,
              display: 'flex', alignItems: 'center', flexShrink: 0, marginLeft: 12,
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <span className="material-icons" style={{ fontSize: 20, color: '#6b7280' }}>close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-score" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Score section */}
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 16px 16px' }}>

              {/* Teams + inputs row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

                {/* Home team */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <FlagImg team={match.home_team} code={match.home_country_code} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1a2332', textAlign: 'center', lineHeight: 1.3 }}>
                    {match.home_team}
                  </span>
                </div>

                {/* Score controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>

                  {/* Home score */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <ScoreBtn dir="+" onClick={() => setHome(clamp(home + 1))} />
                    <input
                      type="number" min="0" max="20" value={home}
                      onChange={e => setHome(clamp(e.target.value))}
                      className="score-input"
                    />
                    <ScoreBtn dir="-" onClick={() => setHome(clamp(home - 1))} />
                  </div>

                  <span style={{ fontSize: 26, fontWeight: 800, color: '#9ca3af', lineHeight: 1 }}>–</span>

                  {/* Away score */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <ScoreBtn dir="+" onClick={() => setAway(clamp(away + 1))} />
                    <input
                      type="number" min="0" max="20" value={away}
                      onChange={e => setAway(clamp(e.target.value))}
                      className="score-input"
                    />
                    <ScoreBtn dir="-" onClick={() => setAway(clamp(away - 1))} />
                  </div>
                </div>

                {/* Away team */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <FlagImg team={match.away_team} code={match.away_country_code} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1a2332', textAlign: 'center', lineHeight: 1.3 }}>
                    {match.away_team}
                  </span>
                </div>
              </div>

              {/* Winner indicator */}
              <div style={{
                marginTop: 14, textAlign: 'center',
                fontSize: 13, fontWeight: 600,
                color: isDraw ? '#6b7280' : '#00c853',
              }}>
                {winnerLabel}
              </div>
            </div>

            {/* Rules */}
            <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }}>
                Sistema de puntuación
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {RULES.map(({ icon, color, label, pts }) => (
                  <div key={icon} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="material-icons" style={{ fontSize: 14, color }}>{icon}</span>
                      <span style={{ fontSize: 13, color: '#6b7280' }}>{label}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color }}>{pts}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, borderRadius: 6, padding: '8px 12px', background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626' }}>
                <span className="material-icons" style={{ fontSize: 15 }}>error_outline</span>
                {error}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1, fontSize: 14 }}>
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="btn-primary" style={{ flex: 1, fontSize: 14 }}>
                {saving
                  ? <><span className="material-icons animate-spin" style={{ fontSize: 15 }}>autorenew</span> Guardando…</>
                  : <><span className="material-icons" style={{ fontSize: 15 }}>check</span> Confirmar</>
                }
              </button>
            </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
