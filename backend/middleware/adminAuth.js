import { requireAuth } from './auth.js'
import { pool } from '../config/database.js'

export async function requireAdmin(req, res, next) {
  requireAuth(req, res, async () => {
    const { rows } = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.userId])
    if (!rows[0]?.is_admin) {
      return res.status(403).json({ error: 'Admin only' })
    }
    next()
  })
}
