import jwt from 'jsonwebtoken'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const keysPath  = process.env.JWT_KEYS_PATH || join(__dirname, '..', 'keys')

let publicKey
try {
  publicKey = readFileSync(join(keysPath, 'public.pem'))
} catch {
  console.warn('JWT public key not found — run: node scripts/generate-keys.js')
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' })
  }
  try {
    req.user = jwt.verify(header.slice(7), publicKey, { algorithms: ['RS256'] })
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function getPublicKey() {
  return publicKey
}
