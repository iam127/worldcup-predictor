import { pool } from '../config/database.js'

/**
 * Points for a single prediction (without streak/early bonuses — those are
 * handled in recalculateUserScore because they depend on history).
 */
export function computeBasePoints(predHome, predAway, actualHome, actualAway) {
  if (predHome === actualHome && predAway === actualAway) {
    return 5 // exact score
  }

  let pts = 0
  const actualDiff = actualHome - actualAway
  const predDiff   = predHome   - predAway

  if (Math.sign(actualDiff) === Math.sign(predDiff)) pts += 3 // correct winner/draw
  if (actualDiff === predDiff)                        pts += 2 // correct goal difference

  return pts
}

/**
 * Recalculate total score for a user in a room from scratch.
 * Accounts for streak bonus (+2 every 3 consecutive scoring predictions).
 */
export async function recalculateUserScore(client, userId, roomId) {
  const { rows } = await client.query(
    `SELECT p.home_score_pred, p.away_score_pred, p.is_early,
            m.home_score, m.away_score
     FROM   predictions p
     JOIN   matches m ON m.id = p.match_id
     WHERE  p.user_id = $1 AND p.room_id = $2 AND m.status = 'finished'
     ORDER  BY m.match_time ASC`,
    [userId, roomId]
  )

  let total    = 0
  let streak   = 0
  let correct  = 0

  for (const p of rows) {
    let pts = computeBasePoints(
      p.home_score_pred, p.away_score_pred,
      p.home_score,      p.away_score
    )
    if (p.is_early) pts += 1

    if (pts > 0) {
      total  += pts
      streak += 1
      correct += 1
      if (streak % 3 === 0) total += 2 // streak bonus
    } else {
      streak = 0
    }
  }

  await client.query(
    `INSERT INTO leaderboard_cache (room_id, user_id, total_points, streak, correct_predictions, last_updated)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (room_id, user_id) DO UPDATE SET
       total_points        = EXCLUDED.total_points,
       streak              = EXCLUDED.streak,
       correct_predictions = EXCLUDED.correct_predictions,
       last_updated        = NOW()`,
    [roomId, userId, total, streak, correct]
  )
}

/**
 * Process a match result: update all predictions, recalculate leaderboards.
 * Returns list of affected roomIds for WebSocket broadcasting.
 */
export async function processMatchResult(matchId, homeScore, awayScore) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Update match status
    await client.query(
      `UPDATE matches SET home_score = $1, away_score = $2, status = 'finished' WHERE id = $3`,
      [homeScore, awayScore, matchId]
    )

    // Mark predictions with base points
    const { rows: preds } = await client.query(
      'SELECT id, user_id, room_id, home_score_pred, away_score_pred, is_early FROM predictions WHERE match_id = $1',
      [matchId]
    )

    for (const p of preds) {
      let pts = computeBasePoints(p.home_score_pred, p.away_score_pred, homeScore, awayScore)
      if (p.is_early) pts += 1
      await client.query('UPDATE predictions SET points_earned = $1 WHERE id = $2', [pts, p.id])
    }

    // Recalculate full leaderboard for every affected user×room
    const affected = new Set(preds.map(p => `${p.user_id}:${p.room_id}`))
    const roomIds  = new Set()

    for (const key of affected) {
      const [userId, roomId] = key.split(':')
      await recalculateUserScore(client, userId, roomId)
      roomIds.add(roomId)
    }

    await client.query('COMMIT')
    return [...roomIds]
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
