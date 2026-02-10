import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import dotenv from 'dotenv'

// On charge le .env mais on va privilégier les variables système
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function applyRLS() {
  console.log('--- 🔍 Diagnostic des URLs de Connexion ---')

  const envAdminUrl = process.env.ADMIN_DATABASE_URL;
  const envStandardUrl = process.env.DATABASE_URL;

  const mask = (url) => url ? url.replace(/:([^:@]+)@/, ':****@') : 'NON DÉFINIE';
  
  console.log(`🔗 ADMIN_DATABASE_URL : ${mask(envAdminUrl)}`);
  console.log(`🔗 DATABASE_URL       : ${mask(envStandardUrl)}`);

  if (envAdminUrl === envStandardUrl && envAdminUrl) {
    console.warn('⚠️ ATTENTION : ADMIN_DATABASE_URL est identique à DATABASE_URL !');
    console.warn('👉 Le script utilisera l\'utilisateur limité "kanban_app" au lieu de l\'admin.');
  }

  const connectionString = (envAdminUrl && envAdminUrl.trim() !== "") ? envAdminUrl : envStandardUrl;

  if (!connectionString) {
    console.error('❌ Erreur : Aucune URL de connexion trouvée.');
    process.exit(1)
  }

  const pool = new pg.Pool({ connectionString })

  try {
    const { rows } = await pool.query('SELECT current_user, current_database()')
    console.log(`👤 Utilisateur SQL effectif : ${rows[0].current_user}`)
    console.log(`🗄️ Base de données : ${rows[0].current_database}`)

    if (rows[0].current_user === 'kanban_app') {
      console.error('❌ ERREUR : L\'utilisateur connecté est "kanban_app". L\'ALTER TABLE va échouer.');
      console.error('👉 Veuillez vérifier vos variables d\'environnement dans Coolify.');
    }

    const sqlPath = path.join(__dirname, 'apply-rls.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    console.log('🛠️ Application des règles RLS...')
    await pool.query(sql)
    console.log('✅ Succès !')
  } catch (error) {
    console.error('❌ ÉCHEC :', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

applyRLS()
