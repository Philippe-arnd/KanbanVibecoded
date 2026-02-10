import { adminDb } from "./index.js";
import { sql } from "drizzle-orm";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyRLS() {
    console.log("[RLS] Applying Row Level Security policies using Admin connection...");
    
    try {
        const sqlPath = path.join(__dirname, 'apply-rls.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // On exécute le contenu du fichier SQL via adminDb
        await adminDb.execute(sql.raw(sqlContent));
        
        console.log("[RLS] Policies applied successfully.");
    } catch (error) {
        console.error("[RLS] Error applying policies:");
        if (error.originalError) {
            console.error("Detail:", error.originalError.message);
        } else {
            console.error(error);
        }
        process.exit(1);
    }
}

applyRLS().then(() => {
    process.exit(0);
});
