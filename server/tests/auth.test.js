import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted() creates values that are hoisted alongside vi.mock calls,
// making them accessible inside mock factories (unlike plain const/let).
const { mockAuthConfig, mockSendMail, mockReadFileSync } = vi.hoisted(() => ({
  mockAuthConfig: { value: null },
  mockSendMail: vi.fn(),
  mockReadFileSync: vi.fn(),
}))

vi.mock('better-auth', () => ({
  betterAuth: (config) => {
    mockAuthConfig.value = config
    return { api: { getSession: vi.fn() } }
  },
}))

vi.mock('better-auth/adapters/drizzle', () => ({
  drizzleAdapter: vi.fn(() => ({})),
}))

vi.mock('nodemailer', () => ({
  createTransport: vi.fn(() => ({ sendMail: mockSendMail })),
}))

vi.mock('fs', () => ({
  default: { readFileSync: mockReadFileSync },
}))

vi.mock('../db/index.js', () => ({
  db: {},
  adminDb: null,
  withRLS: vi.fn(),
}))

// Import after mocks are declared (vi.mock is hoisted so mocks are ready first)
import { auth } from '../auth.js'

describe('Auth module', () => {
  it('exports an auth object', () => {
    expect(auth).toBeDefined()
  })

  it('uses BETTER_AUTH_BASE_URL as baseURL fallback when BETTER_AUTH_URL is not set', async () => {
    // Cover the false branch of `process.env.BETTER_AUTH_URL || process.env.BETTER_AUTH_BASE_URL`
    // by re-initializing the module with BETTER_AUTH_URL unset.
    vi.stubEnv('BETTER_AUTH_URL', '')
    vi.stubEnv('BETTER_AUTH_BASE_URL', 'http://base.example.com')
    vi.resetModules()

    await import('../auth.js')

    expect(mockAuthConfig.value.baseURL).toBe('http://base.example.com')

    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('calls betterAuth with expected config shape', () => {
    const config = mockAuthConfig.value
    expect(config).not.toBeNull()
    expect(config.emailAndPassword).toBeDefined()
    expect(config.emailAndPassword.enabled).toBe(true)
    expect(config.emailAndPassword.requireEmailVerification).toBe(true)
    expect(config.emailVerification).toBeDefined()
    expect(config.emailVerification.sendOnSignUp).toBe(true)
  })

  describe('sendResetPassword callback', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      mockReadFileSync.mockReturnValue('Click here: {{ .ConfirmationURL }} to reset')
    })

    it('reads template, replaces URL placeholder, and sends email', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'msg-001' })
      const { sendResetPassword } = mockAuthConfig.value.emailAndPassword

      await sendResetPassword({
        user: { email: 'user@example.com' },
        url: 'https://app.example.com/reset?token=abc123',
        _token: 'abc123',
      })

      expect(mockReadFileSync).toHaveBeenCalledWith(
        expect.stringContaining('reset_password.html'),
        'utf-8'
      )
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Password Reset',
          html: 'Click here: https://app.example.com/reset?token=abc123 to reset',
          text: expect.stringContaining('https://app.example.com/reset?token=abc123'),
        })
      )
    })

    it('replaces all occurrences of the URL placeholder in the template', async () => {
      mockReadFileSync.mockReturnValue(
        '{{ .ConfirmationURL }} — <a href="{{ .ConfirmationURL }}">Click here</a>'
      )
      mockSendMail.mockResolvedValue({})
      const { sendResetPassword } = mockAuthConfig.value.emailAndPassword

      await sendResetPassword({ user: { email: 'u@e.com' }, url: 'https://reset.url' })

      const callArg = mockSendMail.mock.calls[0][0]
      expect(callArg.html).toBe('https://reset.url — <a href="https://reset.url">Click here</a>')
    })

    it('handles template read errors gracefully without throwing', async () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error('ENOENT: file not found')
      })
      const { sendResetPassword } = mockAuthConfig.value.emailAndPassword

      await expect(
        sendResetPassword({ user: { email: 'u@e.com' }, url: 'https://x.com' })
      ).resolves.toBeUndefined()

      expect(mockSendMail).not.toHaveBeenCalled()
    })

    it('handles sendMail errors gracefully without throwing', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP connection refused'))
      const { sendResetPassword } = mockAuthConfig.value.emailAndPassword

      await expect(
        sendResetPassword({ user: { email: 'u@e.com' }, url: 'https://x.com' })
      ).resolves.toBeUndefined()
    })
  })

  describe('sendVerificationEmail callback', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      mockReadFileSync.mockReturnValue('Confirm at: {{ .ConfirmationURL }}')
    })

    it('reads template, replaces URL placeholder, and sends verification email', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'msg-002' })
      const { sendVerificationEmail } = mockAuthConfig.value.emailVerification

      await sendVerificationEmail({
        user: { email: 'newuser@example.com' },
        url: 'https://app.example.com/verify?token=xyz789',
        _token: 'xyz789',
      })

      expect(mockReadFileSync).toHaveBeenCalledWith(
        expect.stringContaining('confirm_signup.html'),
        'utf-8'
      )
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'newuser@example.com',
          subject: 'Confirm your registration',
          html: 'Confirm at: https://app.example.com/verify?token=xyz789',
          text: expect.stringContaining('https://app.example.com/verify?token=xyz789'),
        })
      )
    })

    it('handles template read errors gracefully without throwing', async () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error('ENOENT: file not found')
      })
      const { sendVerificationEmail } = mockAuthConfig.value.emailVerification

      await expect(
        sendVerificationEmail({ user: { email: 'u@e.com' }, url: 'https://x.com' })
      ).resolves.toBeUndefined()

      expect(mockSendMail).not.toHaveBeenCalled()
    })

    it('handles sendMail errors gracefully without throwing', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP timeout'))
      const { sendVerificationEmail } = mockAuthConfig.value.emailVerification

      await expect(
        sendVerificationEmail({ user: { email: 'u@e.com' }, url: 'https://x.com' })
      ).resolves.toBeUndefined()
    })
  })
})
