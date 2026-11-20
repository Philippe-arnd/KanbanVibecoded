// Same-origin relay for OpenObserve RUM / browser-logs / session-replay intake.
// The browser SDK is configured with `proxy: <api>/api/o2-proxy` and sends
//   POST /api/o2-proxy?o2forward=<url-encoded "/rum/v1/<org>/<rum|logs|replay>?o2-api-key=...">
// which avoids cross-origin, service-worker and tracker-blocking problems.
//
// Hardening: fixed upstream (O2_PROXY_TARGET), strict path allow-list (no open relay / SSRF),
// POST only, 10 MB cap, per-IP rate limit, no cookies / Authorization forwarded.
// Disabled (404) when O2_PROXY_TARGET is not set.
import express from 'express'

const ALLOWED_PATH = /^\/rum\/v1\/[A-Za-z0-9_-]+\/(rum|logs|replay)$/
const MAX_BODY_BYTES = 10 * 1024 * 1024
const WINDOW_MS = 60_000
const MAX_REQ_PER_WINDOW = 300
// Collects the request body exactly as sent (no decompression, no parsing): express.raw would
// either inflate gzip/deflate payloads or reject them with 415 when inflate is disabled.
function collectRawBody(req, res, next) {
  const declared = Number(req.headers['content-length'] || 0)
  if (declared > MAX_BODY_BYTES) return res.status(413).end()
  const chunks = []
  let size = 0
  let aborted = false
  req.on('data', (chunk) => {
    if (aborted) return
    size += chunk.length
    if (size > MAX_BODY_BYTES) {
      aborted = true
      res.status(413).end()
      req.destroy()
      return
    }
    chunks.push(chunk)
  })
  req.on('end', () => {
    if (aborted) return
    req.body = Buffer.concat(chunks)
    next()
  })
  req.on('error', () => {
    if (!aborted) res.status(400).end()
  })
}

const hits = new Map()

function limited(ip) {
  const now = Date.now()
  const h = hits.get(ip)
  if (!h || now - h.t > WINDOW_MS) {
    hits.set(ip, { n: 1, t: now })
    if (hits.size > 10_000) hits.clear()
    return false
  }
  h.n += 1
  return h.n > MAX_REQ_PER_WINDOW
}

export function createO2Proxy() {
  const router = express.Router()
  const handler = async (req, res) => {
    const target = (process.env.O2_PROXY_TARGET || '').replace(/\/+$/, '')
    if (!target) return res.status(404).end()
    if (req.method !== 'POST') return res.status(405).set('Allow', 'POST').end()
    if (limited(req.ip || 'unknown')) return res.status(429).end()

    const forward = typeof req.query.o2forward === 'string' ? req.query.o2forward : ''
    const q = forward.indexOf('?')
    const path = q === -1 ? forward : forward.slice(0, q)
    const query = q === -1 ? '' : forward.slice(q + 1)
    if (!ALLOWED_PATH.test(path)) return res.status(400).end()

    try {
      const headers = {}
      const ct = req.get('content-type')
      const ce = req.get('content-encoding')
      if (ct) headers['content-type'] = ct
      if (ce) headers['content-encoding'] = ce
      if (req.ip) headers['x-forwarded-for'] = req.ip
      const ua = req.get('user-agent')
      if (ua) headers['user-agent'] = ua
      const body = Buffer.isBuffer(req.body) && req.body.length ? req.body : undefined
      const upstream = await fetch(`${target}${path}${query ? '?' + query : ''}`, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(10_000),
      })
      res.status(upstream.status).end()
    } catch (err) {
      console.error('[o2-proxy] upstream error', (err)?.message)
      res.status(502).end()
    }
  }
  // Raw body, whatever the content type or encoding (json, text/plain, multipart, gzip, deflate).
  router.all('/', collectRawBody, handler)
  return router
}
