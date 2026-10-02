// Copies the headers from scripts/security-headers.mjs into vercel.json, so the two can't drift.
// Run after changing the policy: `node scripts/sync-vercel-csp.mjs`. (A unit test fails if they differ.)
import { readFileSync, writeFileSync } from 'node:fs'
import { securityHeaders } from './security-headers.mjs'

const file = new URL('../vercel.json', import.meta.url)
const config = JSON.parse(readFileSync(file, 'utf8'))
const all = config.headers.find((h) => h.source === '/(.*)')
all.headers = Object.entries(securityHeaders).map(([key, value]) => ({ key, value }))
writeFileSync(file, JSON.stringify(config, null, 2) + '\n')
console.log('vercel.json headers updated')
