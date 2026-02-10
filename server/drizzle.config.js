import { defineConfig } from 'drizzle-kit'
import dotenv from 'dotenv'

dotenv.config()

// Ignorer les chaînes vides pour ADMIN_DATABASE_URL
const databaseUrl = (process.env.ADMIN_DATABASE_URL && process.env.ADMIN_DATABASE_URL.trim() !== "") 
  ? process.env.ADMIN_DATABASE_URL 
  : process.env.DATABASE_URL;

export default defineConfig({
  schema: './server/db/schema.js',
  out: './server/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
})
