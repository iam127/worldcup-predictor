import { pool }            from '../config/database.js'
import { publishBroadcast } from '../websocket/index.js'

// Arbitrary constant used as PostgreSQL advisory lock key.
// Ensures only one of the N backend instances runs each tick.
const LOCK_ID = 20260611

async function tick() {
  const client = await pool.connect()
  try {
    const { rows: [{ pg_try_advisory_lock: acquired }] } = await client.query(
      'SELECT pg_try_advisory_lock($1)', [LOCK_ID]
    )
    if (!acquired) return  // another instance is already running this tick

    try {
      // upcoming/scheduled → live (match has started)
      const { rows: activated } = await client.query(
        `UPDATE matches
         SET    status = 'live'
         WHERE  status IN ('upcoming', 'scheduled')
         AND    match_time <= NOW()
         RETURNING id, status`
      )

      // live → finished (90 min play + 15 min extra = 105 min total)
      const { rows: finished } = await client.query(
        `UPDATE matches
         SET    status = 'finished'
         WHERE  status = 'live'
         AND    match_time + INTERVAL '105 minutes' <= NOW()
         RETURNING id, status`
      )

      const changed = [...activated, ...finished]

      if (changed.length > 0) {
        console.log(`[status-updater] ${activated.length} → live, ${finished.length} → finished`)

        // Broadcast each change to all connected clients
        await Promise.all(
          changed.map(m =>
            publishBroadcast('global', {
              type:    'match:status_updated',
              payload: { matchId: m.id, status: m.status },
            })
          )
        )
      }
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID])
    }
  } catch (err) {
    console.error('[status-updater] error:', err.message)
  } finally {
    client.release()
  }
}

export function startMatchStatusUpdater() {
  // Run once immediately on startup, then every 60 s
  tick()
  setInterval(tick, 60_000)
  console.log('[status-updater] started (interval: 60s)')
}
