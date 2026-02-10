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

    // Diagnostics: Check current user
    const userRes = await pool.query('SELECT current_user, session_user')
    console.log(`Applying RLS policies as user: ${userRes.rows[0].current_user} (Session user: ${userRes.rows[0].session_user})`)

    console.log('Applying RLS policies...')
    await pool.query(sql)
    console.log('RLS policies applied successfully.')
  } catch (error) {
    if (error.code === '42501') {
      console.error('\n❌ ERREUR DE PRIVILÈGES : L\'utilisateur actuel n\'est pas le propriétaire de la table.')
      console.error('Assurez-vous que ADMIN_DATABASE_URL ou DATABASE_URL utilise l\'utilisateur "postgres" ou le propriétaire des tables.')
    }
    console.error('Error applying RLS policies:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

applyRLS()
