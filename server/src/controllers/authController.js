const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const { query } = require('../db/pool')
const config  = require('../config')
const R       = require('../utils/response')
const logger  = require('../utils/logger')

const AVATAR_COLORS = ['#3B82F6','#10B981','#8B5CF6','#F59E0B','#EF4444','#06B6D4','#F97316','#EC4899']

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  )
}

function makeAvatar(name) {
  return (name || '').trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??'
}

/**
 * POST /api/auth/register
 */
exports.register = async (req, res, next) => {
  const { name, email, password } = req.body
  try {
    const exists = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email])
    if (exists.rows.length) return R.conflict(res, 'An account with this email already exists.')

    const count  = (await query('SELECT COUNT(*) FROM users')).rows[0].count
    const color  = AVATAR_COLORS[Number(count) % AVATAR_COLORS.length]
    const avatar = makeAvatar(name)
    const hash   = await bcrypt.hash(password, 12)

    const client = await require('../db/pool').getClient()
    try {
      await client.query('BEGIN')

      const userRow = (await client.query(
        `INSERT INTO users(name,email,password_hash,avatar,color) VALUES($1,$2,$3,$4,$5)
         RETURNING id,name,email,avatar,color,created_at`,
        [name.trim(), email.toLowerCase(), hash, avatar, color]
      )).rows[0]

      const wsRow = (await client.query(
        `INSERT INTO workspaces(name,description,owner_id) VALUES($1,$2,$3) RETURNING id,name`,
        [`${name.trim()}'s Workspace`, 'Personal workspace', userRow.id]
      )).rows[0]

      await client.query(
        `INSERT INTO workspace_members(workspace_id,user_id,role) VALUES($1,$2,'owner')`,
        [wsRow.id, userRow.id]
      )

      await client.query('COMMIT')

      const token = generateToken(userRow)
      logger.info(`New user registered: ${userRow.email}`)
      return R.created(res, { token, user: userRow, workspaces: [{ ...wsRow, role: 'owner' }] }, 'Account created successfully.')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/auth/login
 */
exports.login = async (req, res, next) => {
  const { email, password } = req.body
  try {
    const r = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email])
    const user = r.rows[0]

    if (!user) return R.unauthorized(res, 'Invalid email or password.')
    if (!user.is_active) return R.unauthorized(res, 'Account is deactivated. Contact support.')

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return R.unauthorized(res, 'Invalid email or password.')

    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id])

    const wsResult = await query(
      `SELECT w.id, w.name, w.description, w.owner_id, wm.role, w.created_at
       FROM workspaces w
       JOIN workspace_members wm ON wm.workspace_id = w.id
       WHERE wm.user_id = $1
       ORDER BY w.created_at ASC`,
      [user.id]
    )

    const { password_hash, ...safeUser } = user
    const token = generateToken(safeUser)

    logger.info(`User logged in: ${user.email}`)
    return R.success(res, { token, user: safeUser, workspaces: wsResult.rows }, 'Login successful.')
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/auth/me
 */
exports.me = async (req, res, next) => {
  try {
    const user = (await query(
      'SELECT id,name,email,avatar,color,last_login,created_at FROM users WHERE id = $1',
      [req.user.id]
    )).rows[0]

    if (!user) return R.notFound(res, 'User not found.')

    const workspaces = (await query(
      `SELECT w.id,w.name,w.description,w.owner_id,wm.role,w.created_at
       FROM workspaces w JOIN workspace_members wm ON wm.workspace_id=w.id
       WHERE wm.user_id=$1 ORDER BY w.created_at ASC`,
      [req.user.id]
    )).rows

    return R.success(res, { user, workspaces })
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /api/auth/profile
 */
exports.updateProfile = async (req, res, next) => {
  const { name, color } = req.body
  try {
    const updates = []
    const values  = []
    let i = 1

    if (name)  { updates.push(`name=$${i++}`);   values.push(name.trim()) }
    if (color) { updates.push(`color=$${i++}`);  values.push(color) }
    if (name)  { updates.push(`avatar=$${i++}`); values.push(makeAvatar(name)) }

    if (!updates.length) return R.badRequest(res, 'Nothing to update.')

    values.push(req.user.id)
    const r = await query(
      `UPDATE users SET ${updates.join(',')} WHERE id=$${i} RETURNING id,name,email,avatar,color`,
      values
    )
    return R.success(res, r.rows[0], 'Profile updated.')
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /api/auth/password
 */
exports.changePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body
  try {
    const r = await query('SELECT password_hash FROM users WHERE id=$1', [req.user.id])
    const user = r.rows[0]

    const valid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!valid) return R.badRequest(res, 'Current password is incorrect.')

    const hash = await bcrypt.hash(newPassword, 12)
    await query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.user.id])

    return R.success(res, null, 'Password changed successfully.')
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/auth/account
 */
exports.deleteAccount = async (req, res, next) => {
  const client = await require('../db/pool').getClient()
  try {
    await client.query('BEGIN')

    // Deleting the user cascades to:
    // workspace_members, workspaces (if owner), notifications,
    // task_comments, task_activities automatically via ON DELETE CASCADE
    await client.query('DELETE FROM users WHERE id = $1', [req.user.id])

    await client.query('COMMIT')
    logger.info(`Account deleted: ${req.user.email}`)
    return R.success(res, null, 'Account deleted successfully.')
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally {
    client.release()
  }
}