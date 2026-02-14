import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import { app } from '../index.js'

describe('Configuration Tests', () => {
  it('should have CORS configured for local development', async () => {
    const res = await request(app)
      .options('/api/tasks')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET')

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173')
    expect(res.headers['access-control-allow-credentials']).toBe('true')
  })

  it('should handle missing origin in CORS gracefully (e.g. for same-origin or mobile)', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
  })

  it('should include BETTER_AUTH_BASE_URL in CORS allowed origins when set', async () => {
    // Covers the `if (process.env.BETTER_AUTH_BASE_URL)` branch in CORS origin callback
    vi.stubEnv('BETTER_AUTH_BASE_URL', 'http://app.example.com')

    const res = await request(app)
      .options('/api/tasks')
      .set('Origin', 'http://app.example.com')
      .set('Access-Control-Request-Method', 'GET')

    expect(res.headers['access-control-allow-origin']).toBe('http://app.example.com')

    vi.unstubAllEnvs()
  })

  it('should still allow requests from non-allowlisted origins (permissive fallback)', async () => {
    // Covers the CORS `else` branch — both branches call callback(null, true)
    // so even unknown origins are allowed (intentional for debugging/Coolify proxies)
    const res = await request(app)
      .options('/api/health')
      .set('Origin', 'http://unknown.origin.example.com')
      .set('Access-Control-Request-Method', 'GET')

    // The response should reflect the origin back (cors sets it to the request's origin)
    expect(res.headers['access-control-allow-origin']).toBe('http://unknown.origin.example.com')
  })
})

describe('db/index.js branch coverage', () => {
  it('adminDb is null when ADMIN_DATABASE_URL is not set', async () => {
    // Cover the `rawAdminUrl ? drizzle(...) : null` false branch by
    // re-initialising the module with ADMIN_DATABASE_URL unset.
    vi.stubEnv('ADMIN_DATABASE_URL', '')
    vi.resetModules()

    const { adminDb } = await import('../db/index.js')

    expect(adminDb).toBeNull()

    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('no warning is emitted when DATABASE_URL and ADMIN_DATABASE_URL differ', async () => {
    // Cover the `if (rawAdminUrl === rawStandardUrl)` false branch
    vi.stubEnv('DATABASE_URL', 'postgresql://app_user:pw@localhost:5432/kanban_test')
    vi.stubEnv('ADMIN_DATABASE_URL', 'postgresql://postgres:pw@localhost:5432/kanban_test')
    vi.resetModules()

    const warnSpy = vi.spyOn(console, 'warn')
    await import('../db/index.js')

    expect(warnSpy).not.toHaveBeenCalled()

    warnSpy.mockRestore()
    vi.unstubAllEnvs()
    vi.resetModules()
  })
})
