import { useAuth } from '../contexts/AuthContext.jsx'

const MEDALS   = ['🥇', '🥈', '🥉']
const TOP3_CLR = ['#d97706', '#64748b', '#92400e']
const TOP3_BG  = ['#fffde7', '#fafafa', '#fff8f0']

function Avatar({ u }) {
  if (u.avatar) return <img src={u.avatar} alt="" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
  return (
    <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: '#1a2332', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
      {u.name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

export default function LeaderboardTable({ rows, showStreak = true }) {
  const { user } = useAuth()

  if (!rows?.length) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
        <span className="material-icons" style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>leaderboard</span>
        <p style={{ fontSize: 14, margin: 0 }}>Sin datos todavía.</p>
      </div>
    )
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th style={{ width: 52, textAlign: 'center' }}>#</th>
          <th>Jugador</th>
          {showStreak && <th style={{ width: 80, textAlign: 'center' }}>Racha</th>}
          <th style={{ width: 90, textAlign: 'center' }}>Aciertos</th>
          <th style={{ width: 90, textAlign: 'right' }}>Puntos</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const isMe   = row.id === user?.id
          const isTop3 = i < 3
          const rowBg  = isMe
            ? 'rgba(0,200,83,0.05)'
            : isTop3 ? TOP3_BG[i]
            : (i % 2 === 1 ? '#f8fafc' : 'transparent')

          return (
            <tr key={row.id} style={{ background: rowBg }}>

              {/* Rank */}
              <td style={{ textAlign: 'center' }}>
                {isTop3
                  ? <span style={{ fontSize: 17 }}>{MEDALS[i]}</span>
                  : <span style={{ color: '#64748b', fontWeight: 600, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                }
              </td>

              {/* Player */}
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar u={row} />
                  <span style={{ fontWeight: 600, fontSize: 14, color: isMe ? '#00c853' : isTop3 ? TOP3_CLR[i] : '#1a2332', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                    {row.name}
                    {isMe && <span style={{ color: '#00c853', fontSize: 12, marginLeft: 6, fontWeight: 400 }}>(tú)</span>}
                  </span>
                </div>
              </td>

              {/* Streak */}
              {showStreak && (
                <td style={{ textAlign: 'center' }}>
                  {row.streak > 0
                    ? <span style={{ color: '#ea580c', fontSize: 13, fontWeight: 600 }}>🔥 {row.streak}</span>
                    : <span style={{ color: '#e2e8f0' }}>—</span>
                  }
                </td>
              )}

              {/* Correct */}
              <td style={{ textAlign: 'center' }}>
                <span style={{ color: '#64748b', fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{row.correct_predictions}</span>
              </td>

              {/* Points */}
              <td style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#00c853' }}>
                  {row.total_points}
                </span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
