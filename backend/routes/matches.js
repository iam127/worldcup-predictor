import { Router } from 'express'
import { pool } from '../config/database.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM matches ORDER BY match_time ASC`
    )
    res.json(rows)
  } catch (err) { next(err) }
})

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM matches WHERE id = $1', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Match not found' })
    res.json(rows[0])
  } catch (err) { next(err) }
})

export default router
