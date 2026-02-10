import { drizzle } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'
import pg from 'pg'
import * as schema from './schema.js'
import dotenv from 'dotenv'

dotenv.config()

const getUsername = (url) => {
  try {
    if (!url) return 'NON DÉFINIE';
    const match = url.match(/^postgres(?:ql)?:\/\/([^:]+):/);
    return match ? match[1] : 'FORMAT INVALIDE';
  } catch { return 'ERREUR'; }
};

const rawAdminUrl = process.env.ADMIN_DATABASE_URL;
const rawStandardUrl = process.env.DATABASE_URL;

// Diagnostic pour comparer les URLs sans afficher les secrets
console.log(`[DB Init] Admin User: ${getUsername(rawAdminUrl)}`);
console.log(`[DB Init] Standard User: ${getUsername(rawStandardUrl)}`);

if (rawAdminUrl === rawStandardUrl) {
    console.warn("⚠️ ALERTE : ADMIN_DATABASE_URL est identique à DATABASE_URL dans l'environnement !");
}

// Connexion standard
export const db = drizzle(new pg.Pool({ connectionString: rawStandardUrl }), { schema })

// Connexion Admin - On utilise EXCLUSIVEMENT ADMIN_DATABASE_URL
// Si elle est absente, on le dit clairement pour que le script RLS échoue
export const adminDb = rawAdminUrl 
    ? drizzle(new pg.Pool({ connectionString: rawAdminUrl }), { schema })
    : null;

export async function withRLS(userId, callback) {
  return await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_user_id', ${userId}, true)`)
    return await callback(tx)
  })
}
