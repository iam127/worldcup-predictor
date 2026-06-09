import { WebSocketServer, WebSocket } from 'ws'
import { createClient } from 'redis'
import jwt from 'jsonwebtoken'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const keysPath  = process.env.JWT_KEYS_PATH || join(__dirname, '..', 'keys')

let publicKey
try { publicKey = readFileSync(join(keysPath, 'public.pem')) } catch {}

// roomId → Set<ws>  (also 'global' for global subscribers)
const rooms = new Map()

function addClient(roomId, ws) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Set())
  rooms.get(roomId).add(ws)
}

function removeClient(ws) {
  for (const [roomId, clients] of rooms) {
    clients.delete(ws)
    if (clients.size === 0) rooms.delete(roomId)
  }
}

/**
 * Broadcast to all sockets in a room (or 'global' for all sockets).
 * Called both locally and from Redis subscription.
 */
export function broadcast(roomId, message) {
  const payload = JSON.stringify(message)
  if (roomId === 'global') {
    for (const clients of rooms.values()) {
      for (const ws of clients) {
        if (ws.readyState === WebSocket.OPEN) ws.send(payload)
      }
    }
    return
  }
  const clients = rooms.get(roomId)
  if (!clients) return
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload)
  }
}

export async function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  // Redis pub/sub: every backend instance subscribes so horizontal scaling works
  const subscriber = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' })
  subscriber.on('error', err => console.error('Redis subscriber error', err))
  await subscriber.connect()

  await subscriber.subscribe('ws:broadcast', (raw) => {
    try {
      const { roomId, message } = JSON.parse(raw)
      broadcast(roomId, message)
    } catch {}
  })

  wss.on('connection', (ws, req) => {
    const url    = new URL(req.url, 'http://localhost')
    const token  = url.searchParams.get('token')
    const roomId = url.searchParams.get('roomId') || 'global'

    if (!publicKey || !token) {
      ws.close(1008, 'Unauthorized')
      return
    }

    try {
      const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] })
      ws.userId = decoded.userId
    } catch {
      ws.close(1008, 'Invalid token')
      return
    }

    addClient(roomId, ws)
    ws.send(JSON.stringify({ type: 'connected', payload: { roomId } }))

    ws.on('close', () => removeClient(ws))
    ws.on('error', () => removeClient(ws))

    // Heartbeat
    ws.isAlive = true
    ws.on('pong', () => { ws.isAlive = true })
  })

  // Ping all clients every 30s and terminate dead ones
  setInterval(() => {
    for (const clients of rooms.values()) {
      for (const ws of clients) {
        if (!ws.isAlive) { ws.terminate(); continue }
        ws.isAlive = false
        ws.ping()
      }
    }
  }, 30_000)
}

/**
 * Publish a broadcast via Redis so all backend instances forward it.
 * Use this from route handlers instead of calling broadcast() directly
 * when you need cross-instance delivery.
 */
export async function publishBroadcast(roomId, message) {
  const { redis } = await import('../config/redis.js')
  await redis.publish('ws:broadcast', JSON.stringify({ roomId, message }))
}
