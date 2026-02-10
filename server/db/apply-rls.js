import { adminDb } from "./index.js";
import { sql } from "drizzle-orm";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyRLS() {
    console.log("[RLS] Applying Row Level Security policies...");
    
    if (!adminDb) {
        console.error("❌ ERREUR : adminDb n'est pas configuré. Vérifiez que ADMIN_DATABASE_URL est définie.");
        process.exit(1);
    }

    try {
        const sqlPath = path.join(__dirname, 'apply-rls.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        await adminDb.execute(sql.raw(sqlContent));
        console.log("[RLS] Policies applied successfully.");
    } catch (error) {
        console.error("[RLS] Error applying policies:");
        console.error(error.message || error);
        process.exit(1);
    }
}

applyRLS().then(() => process.exit(0));
