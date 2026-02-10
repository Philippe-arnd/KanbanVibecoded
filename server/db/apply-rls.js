import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function applyRLS() {
  // Utilisation prioritaire de ADMIN_DATABASE_URL
  const connectionString = process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL
  
  if (!connectionString) {
    console.error('❌ Erreur : Aucune URL de base de données trouvée.')
    process.exit(1)
  }

  const pool = new pg.Pool({ connectionString })

  try {
    const { rows } = await pool.query('SELECT current_user')
    console.log(`🚀 Exécution des scripts RLS en tant que : ${rows[0].current_user}`)

    const sqlPath = path.join(__dirname, 'apply-rls.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    await pool.query(sql)
    console.log('✅ Politiques RLS appliquées avec succès.')
  } catch (error) {
    console.error('❌ Erreur RLS :', error.message)
    if (error.code === '42501') {
      console.error('👉 L\'utilisateur n\'est pas propriétaire des tables. Vérifiez ADMIN_DATABASE_URL.')
    }
    process.exit(1)
  } finally {
    await pool.end()
  }
}

applyRLS()
