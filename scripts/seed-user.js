import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { adminDb } from '../server/db/index.js'
import { user } from '../server/db/schema.js'
import { eq } from 'drizzle-orm'
import dotenv from 'dotenv'

dotenv.config()

// Use adminDb (superuser) so the seed can run before app_user table grants are set up.
// This avoids "permission denied for table user" when app_user lacks table-level access.
const seedAuth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  database: drizzleAdapter(adminDb, {
    provider: 'pg',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  emailVerification: {
    sendOnSignUp: false,
    sendVerificationEmail: async () => {},
  },
})

const seed = async () => {
  const email = process.env.TEST_USER_EMAIL || 'test@philapps.com'
  const password = process.env.TEST_USER_PWD || 'password123'
  const name = 'Test User'

  console.log(`Seeding user: ${email}`)

  try {
    // We use the internal API to create the user — handles password hashing correctly
    const result = await seedAuth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
    })
    console.log('User seeded successfully:', result.user.email)
  } catch (error) {
    if (
      error.code === 'USER_ALREADY_EXISTS' ||
      (error.message && error.message.includes('already exists'))
    ) {
      console.log('User already exists, proceeding to verification update.')
    } else {
      console.error('Error seeding user:', error)
      process.exit(1)
    }
  }

  // Always ensure the email is verified in the database
  await adminDb.update(user).set({ emailVerified: true }).where(eq(user.email, email))

  console.log('Email verification updated successfully.')
  process.exit(0)
}

seed()
