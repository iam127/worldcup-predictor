import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const errorRate = new Rate('errors')

export const options = {
  vus:      5,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed:   ['rate<0.1'],
    errors:            ['rate<0.1'],
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost'

export default function () {
  const responses = http.batch([
    ['GET', `${BASE_URL}/api/public/matches`,     null, { tags: { name: 'get_matches'     } }],
    ['GET', `${BASE_URL}/api/public/leaderboard`, null, { tags: { name: 'get_leaderboard' } }],
  ])

  responses.forEach(res => {
    if (__ITER === 0 && __VU === 1) {
      console.log(`Status: ${res.status}, URL: ${res.url}`)
    }
    const ok = check(res, {
      'status is 200': r => r.status === 200,
      'response < 1s': r => r.timings.duration < 1000,
    })
    errorRate.add(!ok)
  })

  sleep(1)
}