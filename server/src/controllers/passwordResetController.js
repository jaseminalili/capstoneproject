const { query }  = require('../db/pool')
const bcrypt     = require('bcryptjs')
const R          = require('../utils/response')
const logger     = require('../utils/logger')
const config     = require('../config')
const { sendPasswordReset } = require('../services/emailService')
const nodemailer = require('nodemailer')
 
// Create transporter the same way emailService does
function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
  })
}
 
/**
 * POST /api/auth/forgot-password
 */
exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body
  try {
    const result = await query(
      'SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1) AND is_active = TRUE',
      [email]
    )
 
    // Always return success — prevents user enumeration
    if (!result.rows.length) {
      return R.success(res, null, 'If that email exists, a reset link has been sent.')
    }
 
    const user = result.rows[0]
 
    // Delete any existing tokens for this user
    await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id])
 
    // Create new token — 1 hour expiry
    const tokenResult = await query(
      `INSERT INTO password_reset_tokens(user_id)
       VALUES($1) RETURNING token`,
      [user.id]
    )
 
    const { token } = tokenResult.rows[0]
    const resetUrl  = `${config.frontendUrl}/reset-password?token=${token}`
 
    const transporter = createTransporter()
 
    await transporter.sendMail({
      from:    `"${config.email.fromName}" <${config.email.fromAddress}>`,
      to:      user.email,
      subject: 'Reset your TaskFlow password',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8"/>
          <meta name="viewport" content="width=device-width,initial-scale=1"/>
          <title>Reset your password</title>
        </head>
        <body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 0;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
 
                <!-- Header -->
                <tr><td style="background:linear-gradient(135deg,#1E3A8A 0%,#2563EB 50%,#3B82F6 100%);border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
                  <div style="background:rgba(255,255,255,.15);border-radius:14px;width:52px;height:52px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
                    <span style="color:#fff;font-size:26px;font-weight:900;line-height:1;">T</span>
                  </div>
                  <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-.5px;margin-bottom:2px;">TaskFlow</div>
                  <div style="color:rgba(255,255,255,.7);font-size:12px;letter-spacing:.08em;text-transform:uppercase;">Project Management Platform</div>
                </td></tr>
 
                <!-- Body -->
                <tr><td style="background:#fff;padding:40px;">
                  <h2 style="font-size:22px;font-weight:800;color:#0F172A;margin:0 0 12px;">Reset your password 🔑</h2>
                  <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 8px;">
                    Hi <strong style="color:#0F172A;">${user.name}</strong>,
                  </p>
                  <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 28px;">
                    We received a request to reset your password. Click the button below to create a new one.
                    This link expires in <strong>1 hour</strong>.
                  </p>
 
                  <div style="text-align:center;margin:0 0 28px;">
                    <a href="${resetUrl}"
                      style="background:linear-gradient(135deg,#1D4ED8,#3B82F6);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:16px 44px;border-radius:12px;display:inline-block;letter-spacing:.02em;box-shadow:0 4px 14px rgba(59,130,246,.35);">
                      Reset Password →
                    </a>
                  </div>
 
                  <div style="background:#F8FAFC;border-radius:10px;padding:14px 18px;margin:0 0 24px;">
                    <p style="margin:0;font-size:12px;color:#64748B;">Or copy this link into your browser:</p>
                    <p style="margin:5px 0 0;font-size:12px;color:#2563EB;word-break:break-all;">${resetUrl}</p>
                  </div>
 
                  <p style="font-size:12px;color:#94A3B8;margin:0;line-height:1.6;">
                    If you did not request a password reset, you can safely ignore this email.
                    Your password will not change until you click the link above.
                  </p>
                </td></tr>
 
                <!-- Footer -->
                <tr><td style="background:#F8FAFC;border-top:1px solid #E2E8F0;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
                  <p style="margin:0;font-size:12px;color:#94A3B8;">© ${new Date().getFullYear()} TaskFlow. All rights reserved.</p>
                  <p style="margin:6px 0 0;font-size:11px;color:#CBD5E1;">This email was sent automatically. Please do not reply.</p>
                </td></tr>
 
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
      text: `Hi ${user.name}, reset your TaskFlow password: ${resetUrl} (expires in 1 hour)`
    })
 
    logger.info(`✅ Password reset email sent to: ${user.email}`)
    return R.success(res, null, 'If that email exists, a reset link has been sent.')
  } catch (err) {
    logger.error('❌ forgotPassword error:', err.message)
    next(err)
  }
}
 
/**
 * GET /api/auth/verify-reset-token
 */
exports.verifyResetToken = async (req, res, next) => {
  const { token } = req.query
  try {
    if (!token) return R.badRequest(res, 'Token is required.')
 
    const result = await query(
      `SELECT id FROM password_reset_tokens
       WHERE token = $1 AND used = FALSE AND expires_at > NOW()`,
      [token]
    )
 
    if (!result.rows.length) {
      return R.badRequest(res, 'Reset link is invalid or has expired.')
    }
 
    return R.success(res, null, 'Token is valid.')
  } catch (err) {
    next(err)
  }
}
 
/**
 * POST /api/auth/reset-password
 */
exports.resetPassword = async (req, res, next) => {
  const { token, password } = req.body
  try {
    const result = await query(
      `SELECT prt.id, prt.user_id, u.email, u.name
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token = $1
         AND prt.used = FALSE
         AND prt.expires_at > NOW()`,
      [token]
    )
 
    if (!result.rows.length) {
      return R.badRequest(res, 'Reset link is invalid or has expired. Please request a new one.')
    }
 
    const resetToken = result.rows[0]
 
    // Hash and save new password
    const hash = await bcrypt.hash(password, 12)
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, resetToken.user_id])
 
    // Mark token as used
    await query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [resetToken.id])
 
    logger.info(`✅ Password reset successful for: ${resetToken.email}`)
    return R.success(res, null, 'Password reset successfully. You can now log in with your new password.')
  } catch (err) {
    next(err)
  }
}