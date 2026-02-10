import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import dotenv from 'dotenv'

// Charger le .env s'il existe
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function applyRLS() {
  console.log('--- Application des politiques RLS ---')

  // Gérer les chaînes vides (cas fréquent avec Docker/Coolify)
  const envAdminUrl = process.env.ADMIN_DATABASE_URL && process.env.ADMIN_DATABASE_URL.trim() !== "" 
    ? process.env.ADMIN_DATABASE_URL 
    : null;
    
  const envStandardUrl = process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== ""
    ? process.env.DATABASE_URL
    : null;

  const connectionString = envAdminUrl || envStandardUrl

  if (!connectionString) {
    console.error('❌ Erreur : Aucune URL de base de données trouvée (DATABASE_URL ou ADMIN_DATABASE_URL).')
    process.exit(1)
  }

  if (envAdminUrl) {
    console.log('ℹ️ Utilisation de ADMIN_DATABASE_URL (détectée comme non-vide).')
  } else {
    console.warn('⚠️ ADMIN_DATABASE_URL est vide ou non-définie. Utilisation de DATABASE_URL.')
  }

  const pool = new pg.Pool({ connectionString })

  try {
    const { rows } = await pool.query('SELECT current_user')
    console.log(`👤 Connecté en tant que : ${rows[0].current_user}`)

    const sqlPath = path.join(__dirname, 'apply-rls.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    console.log('🛠️ Exécution du script SQL (ALTER TABLE, etc.)...')
    await pool.query(sql)
    console.log('✅ Politiques RLS appliquées avec succès.')
  } catch (error) {
    console.error('❌ Erreur RLS :', error.message)
    if (error.code === '42501') {
      console.error('👉 Permission refusée : L\'utilisateur n\'est pas propriétaire de la table "tasks".')
      console.error('👉 Vérifiez que ADMIN_DATABASE_URL utilise bien l\'utilisateur "postgres" ou le propriétaire initial des tables.')
    }
    process.exit(1)
  } finally {
    await pool.end()
  }
}

applyRLS()
