const jwt    = require('jsonwebtoken')
const config = require('../config')
const { query } = require('../db/pool')
const R = require('../utils/response')

/**
 * Authenticate JWT bearer token
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || ''
  if (!authHeader.startsWith('Bearer ')) {
    return R.unauthorized(res, 'Authentication required. Please provide a valid token.')
  }

  const token = authHeader.slice(7)
  try {
    const decoded = jwt.verify(token, config.jwt.secret)

    // Verify user still exists and is active
    const result = await query(
      'SELECT id, name, email, avatar, color, is_active FROM users WHERE id = $1',
      [decoded.id]
    )

    if (!result.rows.length || !result.rows[0].is_active) {
      return R.unauthorized(res, 'Account not found or deactivated.')
    }

    req.user = { ...decoded, ...result.rows[0] }
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return R.unauthorized(res, 'Session expired. Please log in again.')
    }
    return R.unauthorized(res, 'Invalid authentication token.')
  }
}

/**
 * Require a specific workspace role
 * wsId is sourced from params, body, or query
 */
function requireWorkspaceRole(minRole = 'member') {
  const HIERARCHY = { owner: 3, admin: 2, member: 1 }

  return async (req, res, next) => {
    const wsId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId
    if (!wsId) return R.badRequest(res, 'workspaceId is required.')

    try {
      const r = await query(
        'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
        [wsId, req.user.id]
      )

      if (!r.rows.length) {
        return R.forbidden(res, 'You are not a member of this workspace.')
      }

      const userLevel = HIERARCHY[r.rows[0].role] || 0
      const reqLevel  = HIERARCHY[minRole]         || 0

      if (userLevel < reqLevel) {
        return R.forbidden(res, `This action requires ${minRole} access or higher.`)
      }

      req.workspaceRole = r.rows[0].role
      next()
    } catch (err) {
      next(err)
    }
  }
}

/**
 * Require project membership
 */
async function requireProjectMember(req, res, next) {
  const projectId = req.params.projectId || req.params.id || req.body.projectId
  if (!projectId) return R.badRequest(res, 'projectId is required.')

  try {
    // Check direct project membership OR workspace admin
    const r = await query(
      `SELECT 1 FROM projects p
       LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $2
       LEFT JOIN workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = $2
       WHERE p.id = $1 AND (pm.user_id IS NOT NULL OR wm.role IN ('owner','admin'))`,
      [projectId, req.user.id]
    )

    if (!r.rows.length) {
      return R.forbidden(res, 'You do not have access to this project.')
    }
    next()
  } catch (err) {
    next(err)
  }
}

module.exports = { authenticate, requireWorkspaceRole, requireProjectMember }
