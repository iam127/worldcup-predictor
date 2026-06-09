import { Router } from 'express'
import passport from 'passport'
import jwt from 'jsonwebtoken'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { requireAuth } from '../middleware/auth.js'
import { pool } from '../config/database.js'

const router    = Router()
const __dirname = dirname(fileURLToPath(import.meta.url))
const keysPath  = process.env.JWT_KEYS_PATH || join(__dirname, '..', 'keys')

let privateKey
try {
  privateKey = readFileSync(join(keysPath, 'private.pem'))
} catch {
  console.warn('JWT private key not found — run: node scripts/generate-keys.js')
}

function signToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, isAdmin: user.is_admin },
    privateKey,
    { algorithm: 'RS256', expiresIn: '7d' }
  )
}

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
)

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/' }),
  (req, res) => {
    const token = signToken(req.user)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost'
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`)
  }
)

router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT name, avatar FROM users WHERE id = $1',
    [req.user.userId]
  )
  res.json({
    id:      req.user.userId,
    email:   req.user.email,
    isAdmin: req.user.isAdmin,
    name:    rows[0]?.name   || null,
    avatar:  rows[0]?.avatar || null,
  })
})

export default router
