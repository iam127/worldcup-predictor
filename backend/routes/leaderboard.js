import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { getRoomLeaderboard, getGlobalLeaderboard } from '../services/leaderboard.js'

const router = Router()

router.get('/room/:roomId', requireAuth, async (req, res, next) => {
  try {
    // Verify user is a member
    const data = await getRoomLeaderboard(req.params.roomId)
    res.json(data)
  } catch (err) { next(err) }
})

router.get('/global', requireAuth, async (_req, res, next) => {
  try {
    const data = await getGlobalLeaderboard()
    res.json(data)
  } catch (err) { next(err) }
})

export default router
