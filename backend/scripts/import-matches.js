/**
 * FIFA World Cup 2026 – Match Importer
 * Fetches from football-data.org and syncs to PostgreSQL.
 * Run inside the backend container:
 *   docker compose exec backend node scripts/import-matches.js
 */

import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const API_TOKEN   = '21ac68cb9e504780993a5e65e343eaf5'
const API_URL     = 'https://api.football-data.org/v4/competitions/WC/matches'
const LOCAL_CACHE = path.join(__dirname, 'wc2026_matches.json')

const { Pool } = pg

// ── Country code map (football-data TLA → ISO 2-letter for flagcdn.com) ──────
const TLA_TO_ISO = {
  // CONCACAF
  USA: 'us', MEX: 'mx', CAN: 'ca', PAN: 'pa', HON: 'hn', JAM: 'jm',
  CRC: 'cr', TRI: 'tt', CUB: 'cu', HAI: 'ht', GTM: 'gt', SLV: 'sv',
  // CONMEBOL
  BRA: 'br', ARG: 'ar', COL: 'co', URU: 'uy', ECU: 'ec', VEN: 've',
  CHI: 'cl', PER: 'pe', PAR: 'py', BOL: 'bo',
  // UEFA
  ENG: 'gb-eng', ESP: 'es', FRA: 'fr', GER: 'de', POR: 'pt', NED: 'nl',
  BEL: 'be', ITA: 'it', CRO: 'hr', SRB: 'rs', UKR: 'ua', ALB: 'al',
  DEN: 'dk', AUT: 'at', POL: 'pl', TUR: 'tr', SCO: 'gb-sct', WAL: 'gb-wls',
  SUI: 'ch', SWE: 'se', NOR: 'no', FIN: 'fi', IRL: 'ie',
  SVK: 'sk', SVN: 'si', CZE: 'cz', HUN: 'hu', ROU: 'ro', GRE: 'gr',
  BUL: 'bg', ISL: 'is', MNE: 'me', MKD: 'mk', BIH: 'ba', GEO: 'ge',
  ARM: 'am', AZE: 'az', KVX: 'xk',
  // CAF
  MAR: 'ma', SEN: 'sn', NGA: 'ng', EGY: 'eg', CIV: 'ci', CMR: 'cm',
  RSA: 'za', ALG: 'dz', TUN: 'tn', GHA: 'gh', MLI: 'ml', COD: 'cd',
  ANG: 'ao', ZAM: 'zm', ETH: 'et', UGA: 'ug', GAB: 'ga', GIN: 'gn',
  TOG: 'tg', BFA: 'bf', ZIM: 'zw', MOZ: 'mz', BEN: 'bj',
  // AFC
  JPN: 'jp', KOR: 'kr', AUS: 'au', KSA: 'sa', IRN: 'ir', IRQ: 'iq',
  QAT: 'qa', UZB: 'uz', CHN: 'cn', UAE: 'ae', JOR: 'jo', OMA: 'om',
  BHR: 'bh', KUW: 'kw', SYR: 'sy', LEB: 'lb', VIE: 'vn', THA: 'th',
  MYS: 'my', IDN: 'id', PHI: 'ph', IND: 'in', TJK: 'tj', KGZ: 'kg',
  // OFC
  NZL: 'nz', FIJ: 'fj',
}

// Extra fallbacks by full/common name (in case TLA is missing or non-standard)
const NAME_TO_ISO = {
  'United States': 'us', 'United States of America': 'us',
  'South Korea': 'kr', 'Korea Republic': 'kr',
  'Ivory Coast': 'ci', "Côte d'Ivoire": 'ci', "Cote d'Ivoire": 'ci',
  'South Africa': 'za',
  'Saudi Arabia': 'sa',
  'New Zealand': 'nz',
  'DR Congo': 'cd', 'Congo DR': 'cd',
  'Costa Rica': 'cr',
  'Trinidad and Tobago': 'tt',
  'North Macedonia': 'mk',
  'Bosnia and Herzegovina': 'ba',
  'Northern Ireland': 'gb-nir',
}

function getCode(tla, name) {
  if (tla && TLA_TO_ISO[tla])  return TLA_TO_ISO[tla]
  if (name && NAME_TO_ISO[name]) return NAME_TO_ISO[name]
  return null
}

function mapStatus(s) {
  if (s === 'FINISHED')                    return 'finished'
  if (s === 'IN_PLAY' || s === 'PAUSED' || s === 'HALFTIME') return 'live'
  return 'upcoming'
}

function mapStage(m) {
  if (m.stage === 'GROUP_STAGE' && m.group) {
    return m.group.replace(/^GROUP_/, 'Group ').replace(/_/g, ' ')
  }
  const MAP = {
    LAST_32:        'Ronda de 32',
    LAST_16:        'Octavos de final',
    QUARTER_FINALS: 'Cuartos de final',
    SEMI_FINALS:    'Semifinales',
    THIRD_PLACE:    'Tercer puesto',
    FINAL:          'Final',
  }
  return MAP[m.stage] || m.stage
}

function mapRound(stage) {
  const MAP = {
    GROUP_STAGE:    'GROUP',
    LAST_32:        'ROUND_OF_32',
    LAST_16:        'ROUND_OF_16',
    QUARTER_FINALS: 'QUARTER_FINAL',
    SEMI_FINALS:    'SEMI_FINAL',
    THIRD_PLACE:    'THIRD_PLACE',
    FINAL:          'FINAL',
  }
  return MAP[stage] || 'GROUP'
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const SEP = '─'.repeat(60)
  console.log('='.repeat(60))
  console.log('  FIFA World Cup 2026 – Match Importer')
  console.log('='.repeat(60))

  // 1. Load data (local cache or live API) ──────────────────
  let data

  if (fs.existsSync(LOCAL_CACHE)) {
    console.log(`\n[1/4] Loading from local cache: ${LOCAL_CACHE}`)
    data = JSON.parse(fs.readFileSync(LOCAL_CACHE, 'utf-8'))
  } else {
    console.log('\n[1/4] Fetching from football-data.org API…')
    const res = await fetch(API_URL, {
      headers: { 'X-Auth-Token': API_TOKEN },
    })
    if (!res.ok) {
      const body = await res.text()
      console.error(`\n✗ API error ${res.status} ${res.statusText}`)
      console.error(body)
      process.exit(1)
    }
    data = await res.json()
  }

  const matches = data.matches ?? []

  // 2. Print summary ──────────────────────────────────────────
  console.log('\n[2/4] API Response:')
  console.log(SEP)
  console.log(`  Competition : ${data.competition?.name ?? '—'} (${data.competition?.code ?? '—'})`)
  console.log(`  Season      : ${data.filters?.season ?? '—'}`)
  console.log(`  Total       : ${data.resultSet?.count ?? matches.length} matches`)
  console.log(`  Date range  : ${data.resultSet?.first ?? '—'} → ${data.resultSet?.last ?? '—'}`)
  console.log(`  Played      : ${data.resultSet?.played ?? 0}`)
  console.log(SEP)

  // Count per group/stage
  const byGroup = {}
  matches.forEach(m => {
    const key = (m.stage === 'GROUP_STAGE' && m.group) ? m.group : m.stage
    byGroup[key] = (byGroup[key] ?? 0) + 1
  })
  console.log('  Matches per group/stage:')
  Object.entries(byGroup).sort().forEach(([k, v]) =>
    console.log(`    ${k.padEnd(20)} ${v}`)
  )
  console.log(SEP)

  console.log('  First 6 matches (preview):')
  matches.slice(0, 6).forEach(m => {
    const home = m.homeTeam?.shortName ?? m.homeTeam?.name ?? 'TBD'
    const away = m.awayTeam?.shortName ?? m.awayTeam?.name ?? 'TBD'
    const date = m.utcDate?.slice(0, 16).replace('T', ' ') ?? '?'
    const grp  = m.group ?? m.stage ?? '?'
    console.log(`    ${date} UTC  [${grp}]  ${home} vs ${away}  [${m.status}]`)
  })
  console.log(SEP)

  if (matches.length === 0) {
    console.error('\n✗ No matches returned. Check token or competition code.')
    process.exit(1)
  }

  // 3. Connect to DB ──────────────────────────────────────────
  console.log('\n[3/4] Connecting to database…')
  const pool  = new Pool({ connectionString: process.env.DATABASE_URL })
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Ensure columns exist (old Docker volumes may lack them)
    await client.query(`
      ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_country_code VARCHAR(10);
      ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_country_code VARCHAR(10);
      ALTER TABLE matches ADD COLUMN IF NOT EXISTS round VARCHAR(20) DEFAULT 'GROUP';
      ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_number INTEGER;
    `)

    // Clear existing data
    const rPred  = await client.query('DELETE FROM predictions')
    const rCache = await client.query('DELETE FROM leaderboard_cache')
    const rMatch = await client.query('DELETE FROM matches')
    console.log(`  Cleared: ${rMatch.rowCount} matches, ${rPred.rowCount} predictions, ${rCache.rowCount} cache rows`)

    // 4. Insert ─────────────────────────────────────────────
    console.log('\n[4/4] Inserting matches…')
    let inserted = 0
    const roundCounters = {}

    for (const m of matches) {
      const home = m.homeTeam
      const away = m.awayTeam

      const round = mapRound(m.stage)
      roundCounters[round] = (roundCounters[round] || 0) + 1
      const matchNumber = roundCounters[round]

      const rawHome = home?.shortName || home?.name || ''
      const rawAway = away?.shortName || away?.name || ''
      const isTBD   = !rawHome || !rawAway || rawHome === 'TBD' || rawAway === 'TBD'

      const homeName  = isTBD ? 'Por definir' : rawHome
      const awayName  = isTBD ? 'Por definir' : rawAway
      const homeCode  = isTBD ? null : getCode(home.tla, home.name)
      const awayCode  = isTBD ? null : getCode(away.tla, away.name)
      const stage     = mapStage(m)
      const status    = mapStatus(m.status)
      const homeScore = m.score?.fullTime?.home ?? null
      const awayScore = m.score?.fullTime?.away ?? null

      await client.query(
        `INSERT INTO matches
           (home_team, away_team, home_country_code, away_country_code,
            match_time, home_score, away_score, status, stage, round, match_number)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [homeName, awayName, homeCode, awayCode,
         m.utcDate, homeScore, awayScore, status, stage, round, matchNumber]
      )
      inserted++
    }

    await client.query('COMMIT')
    console.log(`  Inserted : ${inserted} matches`)

    // Final summary
    const { rows } = await client.query(`
      SELECT stage, count(*)::int AS n
      FROM matches GROUP BY stage ORDER BY min(match_time)
    `)
    console.log('\n  DB summary:')
    rows.forEach(r => console.log(`    ${r.stage.padEnd(22)} ${r.n} matches`))

    console.log('\n✓ Import complete!\n')

  } catch (err) {
    await client.query('ROLLBACK')
    console.error('\n✗ Error – rolled back:', err.message)
    console.error(err.stack)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

main()
