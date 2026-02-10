import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import dotenv from 'dotenv'

// Charger le .env mais NE PAS écraser les variables système déjà présentes (comportement par défaut de dotenv)
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function applyRLS() {
  console.log('--- Diagnostic Base de Données ---')
  
  // On force l'utilisation de ADMIN_DATABASE_URL si elle existe, sinon on prend DATABASE_URL
  const adminUrl = process.env.ADMIN_DATABASE_URL
  const standardUrl = process.env.DATABASE_URL
  
  if (!adminUrl) {
    console.warn('⚠️ ADMIN_DATABASE_URL n\'est pas définie. Tentative avec DATABASE_URL...')
  }

  const connectionString = adminUrl || standardUrl
  
  if (!connectionString) {
    console.error('❌ Erreur : Aucune URL de connexion trouvée.')
    process.exit(1)
  }

  const pool = new pg.Pool({
    connectionString: connectionString,
  })

  try {
    // 1. Vérification de l'identité
    const { rows } = await pool.query('SELECT current_user, session_user, is_superuser')
    const currentUser = rows[0].current_user
    const isSuperuser = rows[0].is_superuser

    console.log(`Utilisateur actuel : ${currentUser}`)
    console.log(`Est Superuser : ${isSuperuser ? 'OUI' : 'NON'}`)

    // Si on est kanban_app, on sait que l'ALTER TABLE va échouer
    if (currentUser === 'kanban_app' && !isSuperuser) {
      console.error('❌ ERREUR CRITIQUE : Le script s\'exécute avec l\'utilisateur limité "kanban_app".')
      console.error('L\'application des règles RLS nécessite d\'être propriétaire des tables (ex: utilisateur "postgres").')
      console.error('Veuillez vérifier que ADMIN_DATABASE_URL est correctement configurée dans Coolify.')
      process.exit(1)
    }

    const sqlPath = path.join(__dirname, 'apply-rls.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    console.log('Application des politiques RLS...')
    await pool.query(sql)
    console.log('✅ Politiques RLS appliquées avec succès.')
    
  } catch (error) {
    if (error.code === '42501') {
      console.error('❌ Erreur de permissions (42501) : L\'utilisateur n\'est pas propriétaire de la table.')
    } else {
      console.error('❌ Erreur lors de l\'application de la RLS :', error.message)
    }
    process.exit(1)
  } finally {
    await pool.end()
  }
}

applyRLS()
