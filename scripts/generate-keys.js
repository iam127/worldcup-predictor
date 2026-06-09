#!/usr/bin/env node
/**
 * Generates RSA-2048 key pair for JWT RS256 signing.
 * Run once before starting the stack: node scripts/generate-keys.js
 */
import { generateKeyPairSync, createPrivateKey } from 'crypto'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const keysDir = join(__dirname, '..', 'backend', 'keys')

if (!existsSync(keysDir)) {
  mkdirSync(keysDir, { recursive: true })
}

const privatePem = join(keysDir, 'private.pem')
const publicPem = join(keysDir, 'public.pem')

if (existsSync(privatePem) && existsSync(publicPem)) {
  console.log('Keys already exist at backend/keys/ — skipping generation.')
  process.exit(0)
}

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

writeFileSync(privatePem, privateKey, { mode: 0o600 })
writeFileSync(publicPem, publicKey, { mode: 0o644 })

console.log('✓ RSA key pair generated in backend/keys/')
console.log('  private.pem  (keep secret, mounted read-only into backend containers)')
console.log('  public.pem')
