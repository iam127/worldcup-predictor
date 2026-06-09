import { Router } from 'express'
import { pool } from '../config/database.js'
import { getGlobalLeaderboard } from '../services/leaderboard.js'

const router = Router()

router.get('/matches', async (_req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM matches ORDER BY match_time ASC')
    res.json(rows)
  } catch (err) { next(err) }
})

router.get('/leaderboard', async (_req, res, next) => {
  try {
    const data = await getGlobalLeaderboard()
    res.json(data)
  } catch (err) { next(err) }
})

export default router
