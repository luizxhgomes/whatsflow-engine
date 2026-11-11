// @vitest-environment node
import { beforeEach, afterEach, it, expect, vi } from 'vitest'
import { createHash, createHmac } from 'node:crypto'
import { verifyQStashRequest } from './auth'
const key = 'test-qstash-current-signing-key'
const url = 'https://example.test/api/campaign/dispatch'
const body = '{"campaignId":"test"}'
function sign(signingKey = key, destination = url, expires = Math.floor(Date.now() / 1000) + 60) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ iss: 'Upstash', sub: destination, exp: expires, nbf: 0, body: createHash('sha256').update(body).digest('base64url') })).toString('base64url')
  return `${header}.${payload}.${createHmac('sha256', signingKey).update(`${header}.${payload}`).digest('base64url')}`
}
function request(signature: string) { return new Request(url, { headers: { 'upstash-signature': signature } }) }
beforeEach(() => { vi.stubEnv('QSTASH_CURRENT_SIGNING_KEY', key); vi.stubEnv('QSTASH_NEXT_SIGNING_KEY', 'test-next-key') })
afterEach(() => vi.unstubAllEnvs())
it('accepts a genuine signature for the raw body and URL', async () => { expect(await verifyQStashRequest(request(sign()), body)).toBe(true) })
it('accepts the next key during rotation', async () => { expect(await verifyQStashRequest(request(sign('test-next-key')), body)).toBe(true) })
it('rejects a forged signature', async () => { expect(await verifyQStashRequest(request(sign('attacker')), body)).toBe(false) })
it('rejects a modified body', async () => { expect(await verifyQStashRequest(request(sign()), '{}')).toBe(false) })
it('rejects a different destination', async () => { expect(await verifyQStashRequest(request(sign(key, 'https://other.test')), body)).toBe(false) })
it('rejects an expired message', async () => { expect(await verifyQStashRequest(request(sign(key, url, 1)), body)).toBe(false) })
it('fails closed without signing keys', async () => { vi.stubEnv('QSTASH_CURRENT_SIGNING_KEY', ''); expect(await verifyQStashRequest(request(sign()), body)).toBe(false) })

it('verifies the configured public URL when the proxy receives an internal host', async () => {
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://example.test')
  const req = new Request('http://localhost:3000/api/campaign/workflow', { headers: { 'upstash-signature': sign(key, 'https://example.test/api/campaign/workflow'), 'x-forwarded-host': 'attacker.test' } })
  expect(await verifyQStashRequest(req, body)).toBe(true)
})
it('never uses an untrusted forwarded host as the signed destination', async () => {
  vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
  vi.stubEnv('WEBHOOK_BASE_URL', '')
  const req = new Request('http://localhost:3000/api/campaign/workflow', { headers: { 'upstash-signature': sign(key, 'https://attacker.test/api/campaign/workflow'), 'x-forwarded-host': 'attacker.test' } })
  expect(await verifyQStashRequest(req, body)).toBe(false)
})

it('preserves a signed preview URL when the configured app URL is production', async () => {
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://production.example.test')
  const previewUrl = 'https://whatsflow-preview.vercel.app/api/campaign/workflow?step=2'
  const req = new Request(previewUrl, { headers: { 'upstash-signature': sign(key, previewUrl) } })
  expect(await verifyQStashRequest(req, body)).toBe(true)
})
it.each(['localhost', '127.0.0.1', '[::1]', '0.0.0.0'])('normalizes only internal host %s, preserving path, query and public port', async host => {
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://production.example.test:8443')
  const path = '/api/campaign/workflow?step=2&run=test'
  const req = new Request(`http://${host}:3000${path}`, { headers: { 'upstash-signature': sign(key, `https://production.example.test:8443${path}`) } })
  expect(await verifyQStashRequest(req, body)).toBe(true)
})
it.each(['whatsflow-preview.vercel.app', 'localhost.attacker.test', 'attacker.localhost'])('rejects an external destination %s signed for the configured production domain', async host => {
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://production.example.test')
  const req = new Request(`https://${host}/api/campaign/workflow`, { headers: { 'upstash-signature': sign(key, 'https://production.example.test/api/campaign/workflow') } })
  expect(await verifyQStashRequest(req, body)).toBe(false)
})
