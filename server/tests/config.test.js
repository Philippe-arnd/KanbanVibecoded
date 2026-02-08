import { describe, it, expect } from 'vitest'
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
})
