import { defineConfig } from 'drizzle-kit'
import dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
  schema: './server/db/schema.js',
  out: './server/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL,
  },
})
