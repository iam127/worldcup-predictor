import { Router } from 'express'
import { pool } from '../config/database.js'
import { requireAuth } from '../middleware/auth.js'
import { predictionsTotal } from './metrics.js'

const router = Router()

// Get last 5 predictions + pending match count (for dashboard)
router.get('/me/recent', requireAuth, async (req, res, next) => {
  try {
    const uid = req.user.userId
    const [recentR, pendingR] = await Promise.all([
      pool.query(
        `SELECT p.home_score_pred, p.away_score_pred, p.points_earned,
                m.home_team, m.away_team, m.home_country_code, m.away_country_code,
                m.match_time, m.status AS match_status, m.home_score, m.away_score, m.stage,
                r.name AS room_name, r.id AS room_id
         FROM   predictions p
         JOIN   matches m ON m.id = p.match_id
         JOIN   rooms r   ON r.id = p.room_id
         WHERE  p.user_id = $1
         ORDER  BY m.match_time DESC
         LIMIT  5`,
        [uid]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count
         FROM   matches m
         WHERE  m.status = 'upcoming'
         AND    m.home_team != 'Por definir'
         AND    NOT EXISTS (
           SELECT 1 FROM predictions p2
           WHERE  p2.match_id = m.id AND p2.user_id = $1
         )`,
        [uid]
      ),
    ])
    res.json({ recent: recentR.rows, pendingCount: pendingR.rows[0].count })
  } catch (err) { next(err) }
})

// Get user's predictions for a room
router.get('/room/:roomId', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, m.home_team, m.away_team, m.match_time, m.home_score, m.away_score, m.status
       FROM   predictions p
       JOIN   matches m ON m.id = p.match_id
       WHERE  p.user_id = $1 AND p.room_id = $2
       ORDER  BY m.match_time ASC`,
      [req.user.userId, req.params.roomId]
    )
    res.json(rows)
  } catch (err) { next(err) }
})

// Get all predictions for a match in a room (after match is finished)
router.get('/match/:matchId/room/:roomId', requireAuth, async (req, res, next) => {
  try {
    // Only reveal others' predictions after match starts/finishes
    const { rows: match } = await pool.query(
      'SELECT status, match_time FROM matches WHERE id = $1',
      [req.params.matchId]
    )
    if (!match[0]) return res.status(404).json({ error: 'Match not found' })

    const matchStarted = match[0].status !== 'upcoming' || new Date(match[0].match_time) <= new Date()

    const { rows } = await pool.query(
      `SELECT p.home_score_pred, p.away_score_pred, p.points_earned, p.is_early,
              u.name, u.avatar
       FROM   predictions p
       JOIN   users u ON u.id = p.user_id
       WHERE  p.match_id = $1 AND p.room_id = $2
         AND  (p.user_id = $3 OR $4 = TRUE)`,
      [req.params.matchId, req.params.roomId, req.user.userId, matchStarted]
    )
    res.json(rows)
  } catch (err) { next(err) }
})

// Create or update a prediction
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { matchId, roomId, homeScore, awayScore } = req.body

    if (!matchId || !roomId || homeScore == null || awayScore == null) {
      return res.status(400).json({ error: 'matchId, roomId, homeScore, awayScore required' })
    }
    if (homeScore < 0 || awayScore < 0 || !Number.isInteger(Number(homeScore)) || !Number.isInteger(Number(awayScore))) {
      return res.status(400).json({ error: 'Scores must be non-negative integers' })
    }

    // Verify user is in the room
    const { rows: membership } = await pool.query(
      'SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2',
      [roomId, req.user.userId]
    )
    if (!membership[0]) return res.status(403).json({ error: 'Not a member of this room' })

    // Verify match is still open for predictions
    const { rows: match } = await pool.query(
      'SELECT match_time, status FROM matches WHERE id = $1',
      [matchId]
    )
    if (!match[0]) return res.status(404).json({ error: 'Match not found' })

    const CLOSED = ['live', 'finished', 'in_play']
    if (CLOSED.includes(match[0].status)) {
      return res.status(400).json({ error: 'Las predicciones están cerradas para este partido' })
    }
    const msUntilKickoff = new Date(match[0].match_time) - new Date()
    if (msUntilKickoff <= 0) {
      return res.status(400).json({ error: 'Las predicciones están cerradas para este partido' })
    }
    if (msUntilKickoff < 10 * 60_000) {
      return res.status(400).json({ error: 'Predicciones cerradas, faltan menos de 10 minutos' })
    }

    const isEarly = msUntilKickoff >= 24 * 60 * 60_000

    const { rows } = await pool.query(
      `INSERT INTO predictions (user_id, match_id, room_id, home_score_pred, away_score_pred, is_early)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, match_id, room_id) DO UPDATE SET
         home_score_pred = EXCLUDED.home_score_pred,
         away_score_pred = EXCLUDED.away_score_pred,
         is_early        = EXCLUDED.is_early
       RETURNING *`,
      [req.user.userId, matchId, roomId, Number(homeScore), Number(awayScore), isEarly]
    )
    predictionsTotal.inc()
    res.json(rows[0])
  } catch (err) { next(err) }
})

export default router
