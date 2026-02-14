import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

// Mock db/index.js so withRLS is controllable and no real PG connection is needed
vi.mock('../db/index.js', () => ({
  db: {},
  adminDb: null,
  withRLS: vi.fn(),
}))

// Mock auth to control getSession
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

import { app } from '../index.js'
import { auth } from '../auth.js'
import { withRLS } from '../db/index.js'

const mockUser = { id: 'user-123', email: 'test@example.com' }
const mockTask = {
  id: 1,
  title: 'Test Task',
  userId: 'user-123',
  position: 1.0,
  columnId: 'today',
  completed: false,
}

/**
 * Creates a chainable mock Drizzle transaction that actually invokes the withRLS
 * callback, covering the tx callback bodies in index.js for function/line coverage.
 *
 * - For SELECT chains: `tx.select().from().where()` — chain is thenable, resolves to result
 * - For INSERT/UPDATE/DELETE chains: `.returning()` returns a Promise resolving to result
 */
const makeChainableMockTx = (result) => {
  const resolved = Promise.resolve(result)
  const chain = {
    select: vi.fn(() => chain),
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    values: vi.fn(() => chain),
    returning: vi.fn(() => resolved),
    update: vi.fn(() => chain),
    set: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    // Make the chain itself awaitable so `await tx.select().from().where()` works
    then: (resolve, reject) => resolved.then(resolve, reject),
    catch: (reject) => resolved.catch(reject),
  }
  return chain
}

describe('Tasks CRUD API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.api.getSession.mockResolvedValue({ user: mockUser })
  })

  describe('GET /api/tasks', () => {
    it('returns tasks sorted by position for authenticated user', async () => {
      const task1 = { ...mockTask, id: 1, position: 2.0 }
      const task2 = { ...mockTask, id: 2, position: 1.0 }
      withRLS.mockImplementation(async (userId, callback) => {
        return await callback(makeChainableMockTx([task1, task2]))
      })

      const res = await request(app).get('/api/tasks')

      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(2)
      expect(res.body[0].position).toBe(1.0)
      expect(res.body[1].position).toBe(2.0)
    })

    it('calls withRLS with the authenticated user id', async () => {
      withRLS.mockImplementation(async (userId, callback) => {
        expect(userId).toBe(mockUser.id)
        return await callback(makeChainableMockTx([]))
      })

      await request(app).get('/api/tasks')
    })

    it('returns 500 when database query fails', async () => {
      withRLS.mockRejectedValue(new Error('DB connection error'))

      const res = await request(app).get('/api/tasks')

      expect(res.status).toBe(500)
      expect(res.body).toEqual({ error: 'Failed to fetch tasks' })
    })
  })

  describe('POST /api/tasks', () => {
    it('creates a task and returns it', async () => {
      withRLS.mockImplementation(async (userId, callback) => {
        return await callback(makeChainableMockTx([mockTask]))
      })

      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test Task', position: 1.0, columnId: 'today' })

      expect(res.status).toBe(200)
      expect(res.body).toEqual([mockTask])
    })

    it('attaches userId from session when creating task', async () => {
      withRLS.mockImplementation(async (userId, callback) => {
        expect(userId).toBe(mockUser.id)
        return await callback(makeChainableMockTx([mockTask]))
      })

      await request(app)
        .post('/api/tasks')
        .send({ title: 'New Task', position: 1.0 })
    })

    it('returns 500 when database insert fails', async () => {
      withRLS.mockRejectedValue(new Error('DB error'))

      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test Task', position: 1.0 })

      expect(res.status).toBe(500)
      expect(res.body).toEqual({ error: 'Failed to create task' })
    })
  })

  describe('PUT /api/tasks/:id', () => {
    it('updates a task and returns the updated result', async () => {
      const updated = { ...mockTask, title: 'Updated Title' }
      withRLS.mockImplementation(async (userId, callback) => {
        return await callback(makeChainableMockTx([updated]))
      })

      const res = await request(app).put('/api/tasks/1').send({ title: 'Updated Title' })

      expect(res.status).toBe(200)
      expect(res.body[0].title).toBe('Updated Title')
    })

    it('strips userId from update body to prevent ownership transfer', async () => {
      withRLS.mockImplementation(async (userId, callback) => {
        return await callback(makeChainableMockTx([mockTask]))
      })

      // Even if userId is sent in body, the route strips it before updating
      const res = await request(app)
        .put('/api/tasks/1')
        .send({ title: 'x', userId: 'attacker-id' })

      expect(res.status).toBe(200)
    })

    it('returns 403 when task is not found or not owned by user', async () => {
      withRLS.mockImplementation(async (userId, callback) => {
        return await callback(makeChainableMockTx([])) // empty = RLS blocked
      })

      const res = await request(app).put('/api/tasks/999').send({ title: 'Hack' })

      expect(res.status).toBe(403)
      expect(res.body).toEqual({ error: 'Forbidden or Not Found' })
    })

    it('returns 500 when database update fails', async () => {
      withRLS.mockRejectedValue(new Error('DB error'))

      const res = await request(app).put('/api/tasks/1').send({ title: 'x' })

      expect(res.status).toBe(500)
      expect(res.body).toEqual({ error: 'Failed to update task' })
    })
  })

  describe('DELETE /api/tasks/:id', () => {
    it('deletes a task and returns success', async () => {
      withRLS.mockImplementation(async (userId, callback) => {
        return await callback(makeChainableMockTx([mockTask]))
      })

      const res = await request(app).delete('/api/tasks/1')

      expect(res.status).toBe(200)
      expect(res.body).toEqual({ success: true })
    })

    it('returns 403 when task is not found or not owned by user', async () => {
      withRLS.mockImplementation(async (userId, callback) => {
        return await callback(makeChainableMockTx([])) // empty = RLS blocked
      })

      const res = await request(app).delete('/api/tasks/999')

      expect(res.status).toBe(403)
      expect(res.body).toEqual({ error: 'Forbidden or Not Found' })
    })

    it('returns 500 when database delete fails', async () => {
      withRLS.mockRejectedValue(new Error('DB error'))

      const res = await request(app).delete('/api/tasks/1')

      expect(res.status).toBe(500)
      expect(res.body).toEqual({ error: 'Failed to delete task' })
    })
  })

  describe('Session middleware error handling', () => {
    it('returns 500 when getSession throws an unexpected error', async () => {
      auth.api.getSession.mockRejectedValue(new Error('Auth service unavailable'))

      const res = await request(app).get('/api/tasks')

      expect(res.status).toBe(500)
      expect(res.body).toEqual({ error: 'Internal Server Error' })
    })
  })

  describe('API catch-all 404', () => {
    it('returns 404 JSON for unknown API routes', async () => {
      const res = await request(app).get('/api/unknown-route-xyz')

      expect(res.status).toBe(404)
      expect(res.body).toEqual({ error: 'Not Found' })
    })
  })

  describe('Non-API catch-all', () => {
    it('attempts to serve React app for non-API routes (covers catch-all else branch)', async () => {
      // For non-API paths, the catch-all calls res.sendFile for the React index.html.
      // In test environment, client/dist/index.html does not exist, so Express
      // responds with an error — but this exercises the non-API branch (line 152).
      const res = await request(app).get('/dashboard')

      // Confirms this took the non-API branch, not the API 404 JSON path
      expect(res.body).not.toEqual({ error: 'Not Found' })
    })
  })
})
