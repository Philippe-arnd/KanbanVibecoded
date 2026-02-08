import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../index.js'

describe('API Integration Tests', () => {
  it('should respond to healthcheck', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })

  it('should have trust proxy enabled', () => {
    expect(app.get('trust proxy')).toBe(true)
  })

  it('should return 401 for unauthorized tasks access', async () => {
    const res = await request(app).get('/api/tasks')
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'Unauthorized' })
  })
})
