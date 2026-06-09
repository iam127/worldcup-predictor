import client from 'prom-client'

export const register = new client.Registry()

client.collectDefaultMetrics({ register })

export const httpRequestDuration = new client.Histogram({
  name:       'http_request_duration_seconds',
  help:       'Duración de requests HTTP en segundos',
  labelNames: ['method', 'route', 'status'],
  buckets:    [0.05, 0.1, 0.3, 0.5, 1, 1.5, 2, 3, 5],
  registers:  [register],
})

export const activeWsConnections = new client.Gauge({
  name:      'active_websocket_connections',
  help:      'Conexiones WebSocket activas en este instancia',
  registers: [register],
})

export const predictionsTotal = new client.Counter({
  name:      'predictions_total',
  help:      'Total de predicciones registradas',
  registers: [register],
})

export const roomsTotal = new client.Gauge({
  name:      'rooms_total',
  help:      'Total de salas activas',
  registers: [register],
})
