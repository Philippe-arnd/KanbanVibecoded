import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function applyRLS() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
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
