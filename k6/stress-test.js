import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const errorRate = new Rate('errors')

export const options = {
  scenarios: {
    carga_normal: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },
        { duration: '1m',  target: 100 },
        { duration: '30s', target: 0   },
      ],
      gracefulRampDown: '10s',
      tags: { scenario: 'carga_normal' },
    },
    pico_carga: {
      executor: 'ramping-vus',
      startTime: '3m',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 500 },
        { duration: '1m',  target: 500 },
        { duration: '30s', target: 0   },
      ],
      gracefulRampDown: '10s',
      tags: { scenario: 'pico_carga' },
    },
    stress: {
      executor: 'ramping-vus',
      startTime: '6m',
      startVUs: 0,
      stages: [
        { duration: '1m',  target: 1000 },
        { duration: '2m',  target: 1000 },
        { duration: '1m',  target: 0    },
      ],
      gracefulRampDown: '30s',
      tags: { scenario: 'stress' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed:   ['rate<0.05'],
    errors:            ['rate<0.1'],
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost'

export default function () {
  const responses = http.batch([
    ['GET', `${BASE_URL}/api/matches`,            null, { tags: { name: 'get_matches'     } }],
    ['GET', `${BASE_URL}/api/leaderboard/global`, null, { tags: { name: 'get_leaderboard' } }],
    ['GET', `${BASE_URL}/api/auth/me`,            null, { tags: { name: 'get_profile'     } }],
  ])

  responses.forEach(res => {
    const ok = check(res, {
      'status 200 or 401': r => r.status === 200 || r.status === 401,
      'response < 2s':     r => r.timings.duration < 2000,
    })
    errorRate.add(!ok)
  })

  sleep(1)
}
