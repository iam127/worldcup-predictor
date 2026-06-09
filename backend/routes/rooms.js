import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { pool } from '../config/database.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

function makeInviteCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase()
}

// List rooms the user belongs to
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, u.name AS owner_name,
              (SELECT COUNT(*) FROM room_members rm2 WHERE rm2.room_id = r.id) AS member_count
       FROM   rooms r
       JOIN   room_members rm ON rm.room_id = r.id
       JOIN   users u ON u.id = r.owner_id
       WHERE  rm.user_id = $1 AND r.is_active = TRUE
       ORDER  BY r.created_at DESC`,
      [req.user.userId]
    )
    res.json(rows)
  } catch (err) { next(err) }
})

// Get single room
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, u.name AS owner_name
       FROM   rooms r
       JOIN   users u ON u.id = r.owner_id
       WHERE  r.id = $1`,
      [req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Room not found' })

    const { rows: members } = await pool.query(
      `SELECT u.id, u.name, u.avatar FROM users u
       JOIN room_members rm ON rm.user_id = u.id
       WHERE rm.room_id = $1`,
      [req.params.id]
    )

    res.json({ ...rows[0], members })
  } catch (err) { next(err) }
})

// Create room
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { name } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Room name required' })

    let inviteCode, attempts = 0
    do {
      inviteCode = makeInviteCode()
      attempts++
    } while (attempts < 10)

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const { rows } = await client.query(
        `INSERT INTO rooms (name, invite_code, owner_id) VALUES ($1, $2, $3) RETURNING *`,
        [name.trim(), inviteCode, req.user.userId]
      )
      await client.query(
        `INSERT INTO room_members (room_id, user_id) VALUES ($1, $2)`,
        [rows[0].id, req.user.userId]
      )
      await client.query('COMMIT')
      res.status(201).json(rows[0])
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (err) { next(err) }
})

// Join room by invite code
router.post('/join', requireAuth, async (req, res, next) => {
  try {
    const { inviteCode } = req.body
    if (!inviteCode) return res.status(400).json({ error: 'Invite code required' })

    const { rows } = await pool.query(
      `SELECT * FROM rooms WHERE invite_code = $1 AND is_active = TRUE`,
      [inviteCode.toUpperCase()]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Room not found' })

    await pool.query(
      `INSERT INTO room_members (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [rows[0].id, req.user.userId]
    )
    res.json(rows[0])
  } catch (err) { next(err) }
})

// Delete room (owner only)
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT owner_id FROM rooms WHERE id = $1', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Room not found' })
    if (rows[0].owner_id !== req.user.userId) return res.status(403).json({ error: 'Not the owner' })

    await pool.query('UPDATE rooms SET is_active = FALSE WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (err) { next(err) }
})

export default router
