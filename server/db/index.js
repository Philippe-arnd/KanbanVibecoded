import { drizzle } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'
import pg from 'pg'
import * as schema from './schema.js'
import dotenv from 'dotenv'

dotenv.config()

// Fonction utilitaire robuste pour extraire l'utilisateur d'une URL
const getUsername = (url) => {
  try {
    if (!url) return 'NON DÉFINIE';
    // Supporte postgres:// et postgresql://
    const match = url.match(/^postgres(?:ql)?:\/\/([^:]+):/);
    return match ? match[1] : `FORMAT INVALIDE (${url.substring(0, 15)}...)`;
  } catch {
    return 'ERREUR PARSE';
  }
};

const rawAdminUrl = process.env.ADMIN_DATABASE_URL;
const rawStandardUrl = process.env.DATABASE_URL;

console.log(`[DB Init] User admin détecté : ${getUsername(rawAdminUrl)}`);
console.log(`[DB Init] User standard détecté : ${getUsername(rawStandardUrl)}`);

// Connexion standard
const pool = new pg.Pool({
  connectionString: rawStandardUrl,
})
export const db = drizzle(pool, { schema })

// Connexion Admin
// On considère la variable comme présente uniquement si elle n'est pas vide
const hasAdminUrl = rawAdminUrl && rawAdminUrl.trim().length > 0;
const adminConnectionString = hasAdminUrl ? rawAdminUrl : rawStandardUrl;

if (!hasAdminUrl) {
    console.warn("[DB Init] ADMIN_DATABASE_URL est vide ou absente, repli sur DATABASE_URL.");
}

const adminPool = new pg.Pool({
  connectionString: adminConnectionString,
})
export const adminDb = drizzle(adminPool, { schema })

export async function withRLS(userId, callback) {
  return await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.current_user_id', ${userId}, true)`
    )
    return await callback(tx)
  })
}
