import 'dotenv/config'
import express from 'express'
import http from 'http'
import cors from 'cors'
import passport from 'passport'
import rateLimit from 'express-rate-limit'
import { setupWebSocket }          from './websocket/index.js'
import { startMatchStatusUpdater } from './services/matchStatusUpdater.js'
import { register, httpRequestDuration } from './routes/metrics.js'
import './config/passport.js'

import authRoutes        from './routes/auth.js'
import roomRoutes        from './routes/rooms.js'
import matchRoutes       from './routes/matches.js'
import predictionRoutes  from './routes/predictions.js'
import leaderboardRoutes from './routes/leaderboard.js'
import adminRoutes       from './routes/admin.js'

const app    = express()
const server = http.createServer(app)

app.set('trust proxy', 1)

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost',
  credentials: true,
}))
app.use(express.json())
app.use(passport.initialize())

// Prometheus request duration middleware
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer()
  res.on('finish', () => {
    const route = req.route?.path ?? req.path.replace(/\/\d+/g, '/:id')
    end({ method: req.method, route, status: res.statusCode })
  })
  next()
})

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 })
app.use('/api/', limiter)

app.use('/api/auth',        authRoutes)
app.use('/api/rooms',       roomRoutes)
app.use('/api/matches',     matchRoutes)
app.use('/api/predictions', predictionRoutes)
app.use('/api/leaderboard', leaderboardRoutes)
app.use('/api/admin',       adminRoutes)

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

// Prometheus metrics endpoint (no rate-limit, no auth)
app.get('/api/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType)
  res.end(await register.metrics())
})

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
})

setupWebSocket(server)
startMatchStatusUpdater()

const PORT = process.env.PORT || 3000
server.listen(PORT, () => console.log(`Backend listening on :${PORT}`))
