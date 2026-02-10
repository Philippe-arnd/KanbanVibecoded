import { drizzle } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'
import pg from 'pg'
import * as schema from './schema.js'
import dotenv from 'dotenv'

dotenv.config()

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

export const db = drizzle(pool, { schema })

/**
 * Executes database operations within a transaction with Row Level Security (RLS) context.
 * Sets 'app.current_user_id' for the duration of the transaction.
 * 
 * @param {string} userId - The ID of the user to set in the RLS context.
 * @param {function} callback - A callback function that receives the transaction object.
 * @returns {Promise<any>} - The result of the callback.
 */
export async function withRLS(userId, callback) {
  return await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.current_user_id', ${userId}, true)`
    )
    return await callback(tx)
  })
}
