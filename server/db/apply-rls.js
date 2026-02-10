import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function applyRLS() {
  // Utilise l'URL admin pour avoir les privilèges de modifier les tables (ALTER TABLE)
  const connectionString = process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL
  
  const pool = new pg.Pool({
    connectionString: connectionString,
  })

  try {
    const sqlPath = path.join(__dirname, 'apply-rls.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    console.log('Applying RLS policies...')
    await pool.query(sql)
    console.log('RLS policies applied successfully.')
  } catch (error) {
    console.error('Error applying RLS policies:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

applyRLS()
