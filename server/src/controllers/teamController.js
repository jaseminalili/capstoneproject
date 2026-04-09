const { query, getClient } = require('../db/pool')
const R      = require('../utils/response')
const logger = require('../utils/logger')
const email  = require('../services/emailService')
const config = require('../config')

exports.getMembers = async (req, res, next) => {
  try {
    const r = await query(
      `SELECT u.id,u.name,u.email,u.avatar,u.color,wm.role,wm.joined_at,u.last_login
       FROM workspace_members wm JOIN users u ON u.id=wm.user_id
       WHERE wm.workspace_id=$1 ORDER BY wm.joined_at ASC`,
      [req.params.workspaceId]
    )
    R.success(res, r.rows)
  } catch (err) { next(err) }
}

exports.getWorkspaceUsers = async (req, res, next) => {
  try {
    const r = await query(
      `SELECT u.id,u.name,u.email,u.avatar,u.color,wm.role
       FROM workspace_members wm JOIN users u ON u.id=wm.user_id
       WHERE wm.workspace_id=$1 ORDER BY u.name`,
      [req.params.workspaceId]
    )
    R.success(res, r.rows)
  } catch (err) { next(err) }
}

exports.inviteMember = async (req, res, next) => {
  const { workspaceId } = req.params
  const { email: toEmail, role = 'member' } = req.body

  if (!toEmail?.trim()) return R.badRequest(res, 'Email address is required.')
  if (!['admin','member'].includes(role)) return R.badRequest(res, 'Role must be admin or member.')

  try {
    const ws = (await query('SELECT * FROM workspaces WHERE id=$1', [workspaceId])).rows[0]
    if (!ws) return R.notFound(res, 'Workspace not found.')

    // Already a member?
    const isMember = await query(
      `SELECT wm.user_id FROM workspace_members wm JOIN users u ON u.id=wm.user_id
       WHERE wm.workspace_id=$1 AND LOWER(u.email)=LOWER($2)`,
      [workspaceId, toEmail]
    )
    if (isMember.rows.length) return R.conflict(res, 'This person is already a workspace member.')

    // Pending invite already?
    const pending = await query(
      `SELECT id FROM workspace_invitations WHERE workspace_id=$1 AND LOWER(email)=LOWER($2) AND status='pending' AND expires_at > NOW()`,
      [workspaceId, toEmail]
    )
    if (pending.rows.length) return R.conflict(res, 'An active invitation already exists for this email.')

    // Create invitation
    const inv = (await query(
      `INSERT INTO workspace_invitations(workspace_id,invited_by,email,role)
       VALUES($1,$2,$3,$4) RETURNING *`,
      [workspaceId, req.user.id, toEmail.toLowerCase().trim(), role]
    )).rows[0]

    // Fetch data for email
    const inviter   = (await query('SELECT name FROM users WHERE id=$1', [req.user.id])).rows[0]
    const invitee   = (await query('SELECT name FROM users WHERE LOWER(email)=LOWER($1)', [toEmail])).rows[0]
    const projects  = (await query(
      `SELECT name,status,priority,end_date FROM projects WHERE workspace_id=$1 AND status!='cancelled' ORDER BY created_at LIMIT 8`,
      [workspaceId]
    )).rows

    // Send email (non-blocking)
    email.sendWorkspaceInvitation({
      to:            toEmail,
      inviteeName:   invitee?.name || null,
      inviterName:   inviter?.name || 'A teammate',
      workspaceName: ws.name,
      role,
      projects,
      token:         inv.token,
    }).then(result => {
      if (!result.success) logger.warn(`Invitation email failed for ${toEmail}:`, result.error)
    })

    logger.info(`Invitation sent to ${toEmail} for workspace ${ws.name}`)
    R.created(res, {
      message:   'Invitation sent successfully. An email has been delivered.',
      email:     inv.email,
      role:      inv.role,
      expiresAt: inv.expires_at,
      acceptUrl: `${config.frontendUrl}/invite/accept?token=${inv.token}`,
    })
  } catch (err) { next(err) }
}

exports.getInviteInfo = async (req, res, next) => {
  const { token } = req.query
  if (!token) return R.badRequest(res, 'Token is required.')
  try {
    const r = await query(
      `SELECT wi.*,w.name ws_name,w.description ws_desc,u.name inviter_name
       FROM workspace_invitations wi
       JOIN workspaces w ON w.id=wi.workspace_id
       JOIN users u ON u.id=wi.invited_by
       WHERE wi.token=$1`,
      [token]
    )
    const inv = r.rows[0]
    if (!inv) return R.notFound(res, 'Invitation not found.')
    if (inv.status === 'accepted') return R.badRequest(res, 'This invitation has already been accepted.')
    if (inv.status === 'revoked')  return R.badRequest(res, 'This invitation has been revoked.')
    if (new Date(inv.expires_at) < new Date()) return R.badRequest(res, 'This invitation has expired.')

    R.success(res, {
      email:         inv.email,
      role:          inv.role,
      workspaceName: inv.ws_name,
      workspaceDesc: inv.ws_desc,
      inviterName:   inv.inviter_name,
      expiresAt:     inv.expires_at,
    })
  } catch (err) { next(err) }
}

exports.acceptInvite = async (req, res, next) => {
  const { token } = req.body
  if (!token) return R.badRequest(res, 'Token is required.')

  const client = await getClient()
  try {
    await client.query('BEGIN')

    const inv = (await client.query(
      `SELECT * FROM workspace_invitations WHERE token=$1 AND status='pending' AND expires_at > NOW()`,
      [token]
    )).rows[0]

    if (!inv) {
      await client.query('ROLLBACK')
      return R.badRequest(res, 'Invitation is invalid, expired, or already used.')
    }

    if (!req.user?.id) {
      await client.query('ROLLBACK')
      return R.unauthorized(res, 'You must be logged in to accept an invitation.')
    }

    const userEmail = (await client.query('SELECT email FROM users WHERE id=$1', [req.user.id])).rows[0]?.email
    if (userEmail?.toLowerCase() !== inv.email.toLowerCase()) {
      await client.query('ROLLBACK')
      return R.forbidden(res, `This invitation was sent to ${inv.email}. Please sign in with that account.`)
    }

    await client.query(
      `INSERT INTO workspace_members(workspace_id,user_id,role)
       VALUES($1,$2,$3)
       ON CONFLICT(workspace_id,user_id) DO UPDATE SET role=$3`,
      [inv.workspace_id, req.user.id, inv.role]
    )

    await client.query(
      `UPDATE workspace_invitations SET status='accepted', accepted_at=NOW() WHERE id=$1`, [inv.id]
    )

    await client.query('COMMIT')

    const ws = (await query(
      `SELECT w.*,wm.role FROM workspaces w JOIN workspace_members wm ON wm.workspace_id=w.id AND wm.user_id=$2 WHERE w.id=$1`,
      [inv.workspace_id, req.user.id]
    )).rows[0]

    logger.info(`Invitation accepted: ${req.user.email} joined workspace ${inv.workspace_id} as ${inv.role}`)
    R.success(res, { workspace: ws, role: inv.role }, 'Invitation accepted! Welcome to the workspace.')
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally { client.release() }
}

exports.removeMember = async (req, res, next) => {
  const { workspaceId, userId } = req.params
  try {
    const ws = (await query('SELECT owner_id FROM workspaces WHERE id=$1', [workspaceId])).rows[0]
    if (ws?.owner_id === userId) return R.forbidden(res, 'Cannot remove the workspace owner.')

    await query('DELETE FROM workspace_members WHERE workspace_id=$1 AND user_id=$2', [workspaceId, userId])
    R.success(res, null, 'Member removed.')
  } catch (err) { next(err) }
}

exports.updateMemberRole = async (req, res, next) => {
  const { workspaceId, userId } = req.params
  const { role } = req.body
  if (!['admin','member'].includes(role)) return R.badRequest(res, 'Role must be admin or member.')
  try {
    const ws = (await query('SELECT owner_id FROM workspaces WHERE id=$1', [workspaceId])).rows[0]
    if (ws?.owner_id === userId) return R.forbidden(res, 'Cannot change the owner\'s role.')

    await query('UPDATE workspace_members SET role=$1 WHERE workspace_id=$2 AND user_id=$3', [role, workspaceId, userId])
    R.success(res, null, 'Role updated.')
  } catch (err) { next(err) }
}
