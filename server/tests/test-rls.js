import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
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

  before(async () => {
    console.log('--- Setup: Cleaning and creating test users ---')
    // Clean up using admin privileges
    await db.delete(tasks).where(sql`user_id IN (${userA.id}, ${userB.id})`)
    await db.delete(user).where(sql`id IN (${userA.id}, ${userB.id})`)

    // Create test users
    await db.insert(user).values([userA, userB])
  })

  after(async () => {
    console.log('--- Cleanup: Removing test data ---')
    // Final cleanup using withRLS for each user
    try {
      await withRLS(userA.id, async (tx) => {
        await tx.delete(tasks).where(eq(tasks.userId, userA.id))
      })
      await withRLS(userB.id, async (tx) => {
        await tx.delete(tasks).where(eq(tasks.userId, userB.id))
      })
    } catch (e) {
      console.warn('Cleanup tasks failed (maybe already deleted):', e.message)
    }
    
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
    assert.strictEqual(userATasks.length, 1, 'User A should see exactly 1 task')
    assert.strictEqual(userATasks[0].title, 'Task for User A')

    // 3. User B should NOT see User A's task
    const userBTasksSeeingA = await withRLS(userB.id, async (tx) => {
      return await tx.select().from(tasks).where(eq(tasks.userId, userA.id))
    })
    assert.strictEqual(userBTasksSeeingA.length, 0, 'User B should see 0 tasks of User A')

    // 4. User B should see 0 tasks in total (if they have none)
    const allUserBTasks = await withRLS(userB.id, async (tx) => {
      return await tx.select().from(tasks)
    })
    assert.strictEqual(allUserBTasks.length, 0, 'User B should see 0 tasks in total')
  })

  it('should prevent User B from updating User A tasks', async () => {
    const taskA = (await db.select().from(tasks).where(eq(tasks.userId, userA.id)))[0]
    
    // User B tries to update it
    await withRLS(userB.id, async (tx) => {
      await tx.update(tasks)
        .set({ title: 'Hacked by User B' })
        .where(eq(tasks.id, taskA.id))
    })
    
    const taskAfterHack = (await db.select().from(tasks).where(eq(tasks.id, taskA.id)))[0]
    assert.strictEqual(taskAfterHack.title, 'Task for User A', 'Task title should not have changed')
  })
  
  it('should prevent User B from deleting User A tasks', async () => {
    const taskA = (await db.select().from(tasks).where(eq(tasks.userId, userA.id)))[0]
    
    await withRLS(userB.id, async (tx) => {
      await tx.delete(tasks).where(eq(tasks.id, taskA.id))
    })
    
    const taskAfterDelete = (await db.select().from(tasks).where(eq(tasks.id, taskA.id)))[0]
    assert.ok(taskAfterDelete, 'Task should still exist after unauthorized delete attempt')
  })
})