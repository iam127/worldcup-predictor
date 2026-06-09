import { Router } from 'express'
import { pool } from '../config/database.js'
import { requireAdmin } from '../middleware/adminAuth.js'
import { processMatchResult, recalculateUserScore } from '../services/scoring.js'
import { invalidateLeaderboardCache } from '../services/leaderboard.js'
import { broadcast } from '../websocket/index.js'

const router = Router()

// List all matches
router.get('/matches', requireAdmin, async (_req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM matches ORDER BY match_time ASC')
    res.json(rows)
  } catch (err) { next(err) }
})

// Create a match
router.post('/matches', requireAdmin, async (req, res, next) => {
  try {
    const { homeTeam, awayTeam, matchTime, stage, homeCountryCode, awayCountryCode, round } = req.body
    if (!homeTeam || !awayTeam || !matchTime) {
      return res.status(400).json({ error: 'homeTeam, awayTeam, matchTime required' })
    }
    const { rows } = await pool.query(
      `INSERT INTO matches (home_team, away_team, home_country_code, away_country_code, match_time, stage, round)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [homeTeam, awayTeam, homeCountryCode || null, awayCountryCode || null, matchTime, stage || null, round || 'GROUP']
    )
    res.status(201).json(rows[0])
  } catch (err) { next(err) }
})

// Update match status (e.g. set to live)
router.patch('/matches/:id/status', requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body
    if (!['upcoming', 'live', 'finished'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }
    const { rows } = await pool.query(
      'UPDATE matches SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Match not found' })
    res.json(rows[0])
  } catch (err) { next(err) }
})

// Set final result — triggers automatic scoring
router.put('/matches/:id/result', requireAdmin, async (req, res, next) => {
  try {
    const { homeScore, awayScore } = req.body
    if (homeScore == null || awayScore == null) {
      return res.status(400).json({ error: 'homeScore and awayScore required' })
    }

    const affectedRooms = await processMatchResult(
      req.params.id,
      Number(homeScore),
      Number(awayScore)
    )

    // Invalidate caches and push real-time updates
    await Promise.all(affectedRooms.map(r => invalidateLeaderboardCache(r)))

    for (const roomId of affectedRooms) {
      broadcast(roomId, { type: 'leaderboard:update', payload: { roomId } })
    }
    broadcast('global', { type: 'global:update', payload: {} })

    res.json({ ok: true, affectedRooms })
  } catch (err) { next(err) }
})

// Update home/away teams for a knockout match
router.patch('/matches/:id/teams', requireAdmin, async (req, res, next) => {
  try {
    const { homeTeam, awayTeam, homeCountryCode, awayCountryCode } = req.body
    if (!homeTeam || !awayTeam) {
      return res.status(400).json({ error: 'homeTeam and awayTeam required' })
    }
    const { rows } = await pool.query(
      `UPDATE matches
       SET home_team=$1, away_team=$2, home_country_code=$3, away_country_code=$4
       WHERE id=$5 RETURNING *`,
      [homeTeam, awayTeam, homeCountryCode || null, awayCountryCode || null, req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Match not found' })
    res.json(rows[0])
  } catch (err) { next(err) }
})

// Promote user to admin
router.post('/users/:id/promote', requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'UPDATE users SET is_admin = TRUE WHERE id = $1 RETURNING id, email, name, is_admin',
      [req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'User not found' })
    res.json(rows[0])
  } catch (err) { next(err) }
})

// List all users with stats
router.get('/users', requireAdmin, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.name, u.avatar, u.is_admin, u.created_at,
              COALESCE(SUM(lc.total_points), 0)::int       AS total_points,
              COALESCE(SUM(lc.correct_predictions), 0)::int AS correct_predictions,
              COUNT(DISTINCT p.id)::int                    AS prediction_count
       FROM   users u
       LEFT JOIN leaderboard_cache lc ON lc.user_id = u.id
       LEFT JOIN predictions p        ON p.user_id  = u.id
       GROUP BY u.id
       ORDER BY total_points DESC, u.created_at ASC`
    )
    res.json(rows)
  } catch (err) { next(err) }
})

// Demote admin → user
router.post('/users/:id/demote', requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'UPDATE users SET is_admin = FALSE WHERE id = $1 RETURNING id, email, name, avatar, is_admin',
      [req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'User not found' })
    res.json(rows[0])
  } catch (err) { next(err) }
})

// Global stats for admin dashboard
router.get('/stats', requireAdmin, async (_req, res, next) => {
  try {
    const [predR, topMatchR, accR, topTeamR] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM predictions'),
      pool.query(`
        SELECT m.home_team, m.away_team, m.stage, COUNT(p.id)::int AS pred_count
        FROM   matches m LEFT JOIN predictions p ON p.match_id = m.id
        GROUP  BY m.id ORDER BY pred_count DESC LIMIT 1`),
      pool.query(`
        SELECT COUNT(*)::int FILTER (WHERE p.points_earned > 0 AND m.status='finished') AS correct,
               COUNT(*)::int FILTER (WHERE m.status = 'finished')                       AS total
        FROM predictions p JOIN matches m ON m.id = p.match_id`),
      pool.query(`
        SELECT team_name, COUNT(*)::int AS win_count FROM (
          SELECT CASE
            WHEN p.home_score_pred > p.away_score_pred THEN m.home_team
            WHEN p.away_score_pred > p.home_score_pred THEN m.away_team
            ELSE NULL END AS team_name
          FROM predictions p JOIN matches m ON m.id = p.match_id
        ) t WHERE team_name IS NOT NULL
        GROUP BY team_name ORDER BY win_count DESC LIMIT 1`),
    ])
    const acc = accR.rows[0]
    res.json({
      totalPredictions: predR.rows[0].count,
      topMatch:         topMatchR.rows[0] || null,
      accuracy:         acc.total > 0 ? Math.round((acc.correct / acc.total) * 100) : 0,
      topTeam:          topTeamR.rows[0] || null,
    })
  } catch (err) { next(err) }
})

// Recalculate ALL leaderboards from scratch
router.post('/recalculate', requireAdmin, async (_req, res, next) => {
  try {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const { rows: combos } = await client.query(
        `SELECT DISTINCT p.user_id, p.room_id
         FROM   predictions p
         JOIN   matches m ON m.id = p.match_id AND m.status = 'finished'`
      )
      for (const { user_id, room_id } of combos) {
        await recalculateUserScore(client, user_id, room_id)
      }
      await client.query('COMMIT')
      res.json({ recalculated: combos.length })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (err) { next(err) }
})

export default router
