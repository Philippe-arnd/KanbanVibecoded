import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from './db/index.js'
import { createTransport } from 'nodemailer'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const transporter = createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  baseURL: process.env.BETTER_AUTH_URL || process.env.BETTER_AUTH_BASE_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    async sendResetPassword({ user, url, _token }) {
      try {
        const templatePath = path.join(__dirname, 'db', 'reset_password.html')
        let html = fs.readFileSync(templatePath, 'utf-8')
        html = html.replace(/{{ \.ConfirmationURL }}/g, url)

        await transporter.sendMail({
          from: 'Contact <noreply@contact.philapps.com>',
          to: user.email,
          subject: 'Password Reset',
          text: `Reset your password by clicking this link: ${url}`,
          html: html,
        })
      } catch (e) {
        console.error('Failed to send reset email', e)
      }
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    async sendVerificationEmail({ user, url, _token }) {
      try {
        const templatePath = path.join(__dirname, 'db', 'confirm_signup.html')
        let html = fs.readFileSync(templatePath, 'utf-8')
        html = html.replace(/{{ \.ConfirmationURL }}/g, url)

        await transporter.sendMail({
          from: 'Contact <noreply@contact.philapps.com>',
          to: user.email,
          subject: 'Confirm your registration',
          text: `Please confirm your email by clicking this link: ${url}`,
          html: html,
        })
      } catch (e) {
        console.error('Failed to send verification email', e)
      }
    },
  },
})
