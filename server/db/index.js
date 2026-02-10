import { drizzle } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'
import pg from 'pg'
import * as schema from './schema.js'
import dotenv from 'dotenv'

dotenv.config()

// Connexion standard (utilisateur limité)
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})
export const db = drizzle(pool, { schema })

// Connexion Admin (utilisateur propriétaire/postgres)
const adminConnectionString = (process.env.ADMIN_DATABASE_URL && process.env.ADMIN_DATABASE_URL.trim() !== "")
  ? process.env.ADMIN_DATABASE_URL
  : process.env.DATABASE_URL;

const adminPool = new pg.Pool({
  connectionString: adminConnectionString,
})
export const adminDb = drizzle(adminPool, { schema })

/**
 * Executes database operations within a transaction with Row Level Security (RLS) context.
 */
export async function withRLS(userId, callback) {
  return await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.current_user_id', ${userId}, true)`
    )
    return await callback(tx)
  })
}
