import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function applyRLS() {
  // Priorité absolue à ADMIN_DATABASE_URL pour les opérations d'administration
  const connectionString = process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL
  
  if (!connectionString) {
    console.error('❌ Aucune URL de base de données trouvée (DATABASE_URL ou ADMIN_DATABASE_URL)')
    process.exit(1)
  }

  // Masquer le mot de passe pour le log
  const maskedUrl = connectionString.replace(/:([^:@]+)@/, ':****@')
  console.log(`Utilisation de l'URL : ${maskedUrl}`)
  if (process.env.ADMIN_DATABASE_URL) {
    console.log('✅ ADMIN_DATABASE_URL est détectée et sera utilisée.')
  } else {
    console.warn('⚠️ ADMIN_DATABASE_URL non détectée, utilisation de DATABASE_URL par défaut.')
  }
  
  const pool = new pg.Pool({
    connectionString: connectionString,
  })

  try {
    const sqlPath = path.join(__dirname, 'apply-rls.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    // Diagnostics: Check current user
    const userRes = await pool.query('SELECT current_user, session_user, current_database()')
    console.log(`Connecté en tant que : ${userRes.rows[0].current_user} sur la base : ${userRes.rows[0].current_database}`)

    console.log('Applying RLS policies...')
    await pool.query(sql)
    console.log('RLS policies applied successfully.')
  } catch (error) {
    if (error.code === '42501') {
      console.error('\n❌ ERREUR DE PRIVILÈGES : L\'utilisateur actuel n\'est pas le propriétaire de la table.')
      console.error(`L'utilisateur "${process.env.ADMIN_DATABASE_URL ? 'admin' : 'standard'}" n'a pas les droits suffisants.`)
    }
    console.error('Error applying RLS policies:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

applyRLS()
