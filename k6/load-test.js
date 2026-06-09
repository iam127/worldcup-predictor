import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const errorRate = new Rate('errors')

export const options = {
  vus:      50,
  duration: '2m',
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed:   ['rate<0.01'],
    errors:            ['rate<0.05'],
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost'

export default function () {
  const responses = http.batch([
    ['GET', `${BASE_URL}/api/matches`,            null, { tags: { name: 'get_matches'     } }],
    ['GET', `${BASE_URL}/api/leaderboard/global`, null, { tags: { name: 'get_leaderboard' } }],
  ])

  responses.forEach(res => {
    const ok = check(res, {
      'status is 200': r => r.status === 200,
      'response < 1s': r => r.timings.duration < 1000,
    })
    errorRate.add(!ok)
  })

  sleep(1)
}
