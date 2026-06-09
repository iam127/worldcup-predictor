import { getCountryCode, getFlagUrl } from '../utils/flags.js'
import { useCountdown } from '../hooks/useCountdown.js'

function FlagImg({ team, code, size = '48x36' }) {
  if (team === 'Por definir') {
    return (
      <div style={{ width: 48, height: 36, borderRadius: 4, background: '#f3f4f6', border: '1px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="material-icons" style={{ fontSize: 18, color: '#9ca3af' }}>help_outline</span>
      </div>
    )
  }
  const resolvedCode = code || getCountryCode(team)
  const url = getFlagUrl(resolvedCode, size)
  if (!url) return <span style={{ fontSize: 28, lineHeight: 1 }}>🏳</span>
  return (
    <img
      src={url}
      alt={team}
      style={{ borderRadius: 4, width: 48, height: 36, objectFit: 'cover', display: 'block' }}
      onError={e => { e.currentTarget.style.display = 'none' }}
    />
  )
}

function Countdown({ matchTime }) {
  const t = useCountdown(matchTime)
  if (!t) return null
  const urgent = t.days === 0 && t.hours === 0 && t.minutes < 10
  const parts  = t.days > 0
    ? [{ v: t.days, l: 'd' }, { v: t.hours, l: 'h' }, { v: t.minutes, l: 'm' }]
    : [{ v: t.hours, l: 'h' }, { v: t.minutes, l: 'm' }, { v: t.seconds, l: 's' }]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 12, color: urgent ? '#ef4444' : '#d97706' }}>
      <span className="material-icons" style={{ fontSize: 13, marginRight: 2 }}>{urgent ? 'lock_clock' : 'schedule'}</span>
      {parts.map(({ v, l }, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 1 }}>
          <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{String(v).padStart(2, '0')}</span>
          <span style={{ color: urgent ? '#fca5a5' : '#6b7280' }}>{l}</span>
          {i < parts.length - 1 && <span style={{ color: '#d1d5db', margin: '0 1px' }}>:</span>}
        </span>
      ))}
    </div>
  )
}

const CLOSED_STATUSES = ['live', 'finished', 'in_play']

export default function MatchCard({ match, prediction, onPredict }) {
  const kickoff     = new Date(match.match_time)
  const msLeft      = kickoff - new Date()
  const isTBD       = match.home_team === 'Por definir' || match.away_team === 'Por definir'
  const isClosed    = CLOSED_STATUSES.includes(match.status) || msLeft <= 0
  const isNearClose = !isClosed && msLeft > 0 && msLeft < 10 * 60_000 && !isTBD
  const canPredict  = !isClosed && !isNearClose && (match.status === 'upcoming' || match.status === 'scheduled') && !isTBD
  const pts         = prediction?.points_earned

  return (
    <div
      className="animate-fade-in"
      style={{
        background: '#ffffff',
        border: `1px solid ${match.status === 'live' ? 'rgba(204,0,0,0.35)' : '#e5e7eb'}`,
        borderRadius: 12, padding: 16,
        display: 'flex', flexDirection: 'column', gap: 12,
        boxShadow: match.status === 'live'
          ? '0 2px 12px rgba(204,0,0,0.08)'
          : '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      {/* Stage + badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>{match.stage || 'Fase de grupos'}</span>
        {match.status === 'live'     && <span className="badge badge-live">En Vivo</span>}
        {match.status === 'upcoming' && <span className="badge badge-upcoming">Próximo</span>}
        {match.status === 'finished' && <span className="badge badge-finished">Finalizado</span>}
      </div>

      {/* Teams */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

        {/* Home */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <FlagImg team={match.home_team} code={match.home_country_code} />
          <span style={{ fontSize: 13, fontWeight: isTBD ? 400 : 700, textAlign: 'center', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isTBD ? '#9ca3af' : '#1a2332', fontStyle: isTBD ? 'italic' : 'normal' }}>
            {match.home_team}
          </span>
        </div>

        {/* Center */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '0 4px', minWidth: 72 }}>
          {match.status === 'finished'
            ? <span style={{ fontSize: 20, fontWeight: 800, color: '#1a2332', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}>
                {match.home_score} – {match.away_score}
              </span>
            : <span style={{ fontSize: 18, fontWeight: 700, padding: '4px 10px', borderRadius: 4, background: 'rgba(0,200,83,0.08)', color: '#00c853', border: '1px solid rgba(0,200,83,0.2)' }}>
                VS
              </span>
          }
          {match.status === 'upcoming' && <Countdown matchTime={match.match_time} />}
          {match.status === 'upcoming' && (
            <span style={{ fontSize: 11, color: '#6b7280', textAlign: 'center' }}>
              {kickoff.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}{' '}
              {kickoff.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* Away */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <FlagImg team={match.away_team} code={match.away_country_code} />
          <span style={{ fontSize: 13, fontWeight: isTBD ? 400 : 700, textAlign: 'center', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isTBD ? '#9ca3af' : '#1a2332', fontStyle: isTBD ? 'italic' : 'normal' }}>
            {match.away_team}
          </span>
        </div>
      </div>

      {/* TBD notice */}
      {isTBD && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 10px', borderRadius: 6, background: '#f9fafb', border: '1px dashed #e5e7eb', fontSize: 12, color: '#9ca3af' }}>
          <span className="material-icons" style={{ fontSize: 13 }}>pending</span>
          Equipos por clasificar
        </div>
      )}

      {/* Prediction row */}
      {prediction && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#f8fafc', border: `1px solid ${pts >= 5 ? 'rgba(245,168,0,0.3)' : '#e5e7eb'}`,
          borderRadius: 6, padding: '7px 12px', fontSize: 13,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280' }}>
            <span className="material-icons" style={{ fontSize: 14, color: '#6b7280' }}>sports_soccer</span>
            Tu predicción:
            <span style={{ color: '#1a2332', fontWeight: 700, marginLeft: 4, fontVariantNumeric: 'tabular-nums' }}>
              {prediction.home_score_pred} – {prediction.away_score_pred}
            </span>
            {prediction.is_early && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 3, background: 'rgba(245,168,0,0.1)', color: '#d97706', border: '1px solid rgba(245,168,0,0.25)', marginLeft: 2 }}>
                EARLY
              </span>
            )}
          </div>
          {match.status === 'finished' && pts != null && (
            <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: pts >= 5 ? '#d97706' : pts >= 3 ? '#16a34a' : pts > 0 ? '#2563eb' : '#9ca3af' }}>
              {pts > 0 ? `+${pts}` : '0'} pts
            </span>
          )}
        </div>
      )}

      {/* Predict / closed area */}
      {!isTBD && (
        canPredict
          ? (
            <button
              onClick={() => onPredict(match)}
              className="btn-primary"
              style={{ width: '100%', fontSize: 13, borderRadius: 8 }}
            >
              <span className="material-icons" style={{ fontSize: 15 }}>
                {prediction ? 'edit' : 'add_circle'}
              </span>
              {prediction ? 'Editar predicción' : 'Predecir resultado'}
            </button>
          )
          : isNearClose
            ? (
              <button
                disabled
                className="btn-primary"
                style={{ width: '100%', fontSize: 13, borderRadius: 8, opacity: 0.5, cursor: 'not-allowed' }}
                title="Predicciones cerradas (menos de 10 min)"
              >
                <span className="material-icons" style={{ fontSize: 15 }}>lock_clock</span>
                Cierra en menos de 10 min
              </button>
            )
            : isClosed && !prediction
              ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 12, color: '#9ca3af' }}>
                  <span className="material-icons" style={{ fontSize: 14 }}>lock</span>
                  Predicciones cerradas
                </div>
              )
              : null
      )}
    </div>
  )
}
