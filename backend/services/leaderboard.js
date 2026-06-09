import { pool } from '../config/database.js'
import { redis } from '../config/redis.js'

const CACHE_TTL = 30 // seconds

export async function getRoomLeaderboard(roomId) {
  const cacheKey = `lb:room:${roomId}`
  const cached   = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)

  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.avatar,
            COALESCE(lc.total_points, 0)        AS total_points,
            COALESCE(lc.streak, 0)              AS streak,
            COALESCE(lc.correct_predictions, 0) AS correct_predictions
     FROM   room_members rm
     JOIN   users u ON u.id = rm.user_id
     LEFT   JOIN leaderboard_cache lc ON lc.user_id = u.id AND lc.room_id = $1
     WHERE  rm.room_id = $1
     ORDER  BY total_points DESC, correct_predictions DESC`,
    [roomId]
  )

  await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(rows))
  return rows
}

export async function getGlobalLeaderboard() {
  const cacheKey = 'lb:global'
  const cached   = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)

  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.avatar,
            COALESCE(SUM(lc.total_points), 0)        AS total_points,
            COALESCE(MAX(lc.streak), 0)              AS best_streak,
            COALESCE(SUM(lc.correct_predictions), 0) AS correct_predictions
     FROM   users u
     LEFT   JOIN leaderboard_cache lc ON lc.user_id = u.id
     GROUP  BY u.id, u.name, u.avatar
     ORDER  BY total_points DESC, correct_predictions DESC
     LIMIT  100`
  )

  await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(rows))
  return rows
}

export async function invalidateLeaderboardCache(roomId) {
  const keys = [`lb:room:${roomId}`, 'lb:global']
  await Promise.all(keys.map(k => redis.del(k)))
}
