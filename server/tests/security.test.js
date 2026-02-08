import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../index.js'
import { auth } from '../auth.js'

// Mock Better Auth session
vi.mock('../auth.js', async (importOriginal) => {
  const original = await importOriginal()
  return {
    ...original,
    auth: {
      ...original.auth,
      api: {
        ...original.auth.api,
        getSession: vi.fn(),
      },
    },
  }
})

describe('Task Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should allow access to tasks when authenticated', async () => {
    auth.api.getSession.mockResolvedValue({
      user: { id: 'test-user-id', email: 'test@example.com' },
    })

    // Mock DB would be better, but here we just check if it passes the middleware
    const res = await request(app).get('/api/tasks')

    // If it gets past auth, it will try to hit the DB.
    // We expect it NOT to be 401.
    expect(res.status).not.toBe(401)
  })

  it('should block unauthorized updates', async () => {
    auth.api.getSession.mockResolvedValue(null)

    const res = await request(app).put('/api/tasks/1').send({ title: 'Hacked' })

    expect(res.status).toBe(401)
  })
})
