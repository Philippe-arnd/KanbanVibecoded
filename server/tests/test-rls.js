import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db, withRLS } from '../db/index.js'
import { user, tasks } from '../db/schema.js'
import { eq, sql } from 'drizzle-orm'

describe('PostgreSQL Row Level Security (RLS) Isolation', () => {
  const userA = {
    id: 'test-user-a',
    name: 'User A',
    email: 'user-a@example.com',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const userB = {
    id: 'test-user-b',
    name: 'User B',
    email: 'user-b@example.com',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeAll(async () => {
    // Clean up any existing test data using admin privileges
    await db.delete(tasks).where(sql`user_id IN (${userA.id}, ${userB.id})`)
    await db.delete(user).where(sql`id IN (${userA.id}, ${userB.id})`)

    // Create test users using admin privileges
    await db.insert(user).values([userA, userB])
  })

  afterAll(async () => {
    // Final cleanup using withRLS for each user to demonstrate it works
    await withRLS(userA.id, async (tx) => {
      await tx.delete(tasks).where(eq(tasks.userId, userA.id))
    })
    await withRLS(userB.id, async (tx) => {
      await tx.delete(tasks).where(eq(tasks.userId, userB.id))
    })
    
    // Delete users using admin privileges
    await db.delete(user).where(sql`id IN (${userA.id}, ${userB.id})`)
  })

  it('should only allow User A to see their own tasks', async () => {
    // 1. User A inserts a task
    await withRLS(userA.id, async (tx) => {
      await tx.insert(tasks).values({
        title: 'Task for User A',
        userId: userA.id,
        position: 1,
      })
    })

    // 2. User A should see their task
    const userATasks = await withRLS(userA.id, async (tx) => {
      return await tx.select().from(tasks).where(eq(tasks.userId, userA.id))
    })
    expect(userATasks).toHaveLength(1)
    expect(userATasks[0].title).toBe('Task for User A')

    // 3. User B should NOT see User A's task, even if they filter for it
    const userBTasksSeeingA = await withRLS(userB.id, async (tx) => {
      return await tx.select().from(tasks).where(eq(tasks.userId, userA.id))
    })
    expect(userBTasksSeeingA).toHaveLength(0)

    // 4. User B should see 0 tasks if they query all
    const allUserBTasks = await withRLS(userB.id, async (tx) => {
      return await tx.select().from(tasks)
    })
    expect(allUserBTasks).toHaveLength(0)
  })

  it('should prevent User B from updating User A tasks', async () => {
    // Find the task ID created by User A
    const taskA = (await db.select().from(tasks).where(eq(tasks.userId, userA.id)))[0]
    
    // User B tries to update it
    const updateResult = await withRLS(userB.id, async (tx) => {
      return await tx.update(tasks)
        .set({ title: 'Hacked by User B' })
        .where(eq(tasks.id, taskA.id))
    })
    
    // In RLS, an update that matches 0 rows (due to isolation) returns successfully but affects 0 rows
    // Wait, with Drizzle it might depend on the driver. Let's check the data.
    
    const taskAfterHack = (await db.select().from(tasks).where(eq(tasks.id, taskA.id)))[0]
    expect(taskAfterHack.title).toBe('Task for User A')
  })
  
  it('should prevent User B from deleting User A tasks', async () => {
    const taskA = (await db.select().from(tasks).where(eq(tasks.userId, userA.id)))[0]
    
    await withRLS(userB.id, async (tx) => {
      await tx.delete(tasks).where(eq(tasks.id, taskA.id))
    })
    
    const taskAfterDelete = (await db.select().from(tasks).where(eq(tasks.id, taskA.id)))[0]
    expect(taskAfterDelete).toBeDefined()
  })
})
