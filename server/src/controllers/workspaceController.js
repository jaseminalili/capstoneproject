const { query, getClient } = require('../db/pool')
const R = require('../utils/response')
const logger = require('../utils/logger')

exports.list = async (req, res, next) => {
  try {
    const r = await query(
      `SELECT w.id,w.name,w.description,w.owner_id,wm.role,w.created_at,w.updated_at
       FROM workspaces w JOIN workspace_members wm ON wm.workspace_id=w.id
       WHERE wm.user_id=$1 ORDER BY w.created_at ASC`,
      [req.user.id]
    )
    R.success(res, r.rows)
  } catch (err) { next(err) }
}

exports.get = async (req, res, next) => {
  try {
    const r = await query(
      `SELECT w.*,wm.role FROM workspaces w
       JOIN workspace_members wm ON wm.workspace_id=w.id AND wm.user_id=$2
       WHERE w.id=$1`,
      [req.params.workspaceId, req.user.id]
    )
    if (!r.rows.length) return R.notFound(res, 'Workspace not found.')
    R.success(res, r.rows[0])
  } catch (err) { next(err) }
}

exports.create = async (req, res, next) => {
  const { name, description } = req.body
  if (!name?.trim()) return R.badRequest(res, 'Workspace name is required.')
  const client = await getClient()
  try {
    await client.query('BEGIN')
    const ws = (await client.query(
      `INSERT INTO workspaces(name,description,owner_id) VALUES($1,$2,$3) RETURNING *`,
      [name.trim(), description||null, req.user.id]
    )).rows[0]
    await client.query(
      `INSERT INTO workspace_members(workspace_id,user_id,role) VALUES($1,$2,'owner')`,
      [ws.id, req.user.id]
    )
    await client.query('COMMIT')
    logger.info(`Workspace created: ${ws.name} by user ${req.user.id}`)
    R.created(res, { ...ws, role: 'owner' }, 'Workspace created.')
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally { client.release() }
}

exports.update = async (req, res, next) => {
  const { name, description } = req.body
  try {
    const r = await query(
      `UPDATE workspaces SET
         name=COALESCE($1,name),
         description=COALESCE($2,description)
       WHERE id=$3 AND owner_id=$4 RETURNING *`,
      [name||null, description||null, req.params.workspaceId, req.user.id]
    )
    if (!r.rows.length) return R.forbidden(res, 'Not authorized to update this workspace.')
    R.success(res, r.rows[0], 'Workspace updated.')
  } catch (err) { next(err) }
}

exports.delete = async (req, res, next) => {
  try {
    const r = await query(
      `DELETE FROM workspaces WHERE id=$1 AND owner_id=$2 RETURNING id`,
      [req.params.workspaceId, req.user.id]
    )
    if (!r.rows.length) return R.forbidden(res, 'Not authorized to delete this workspace.')
    R.success(res, null, 'Workspace deleted.')
  } catch (err) { next(err) }
}

exports.getStats = async (req, res, next) => {
  try {
    const [members, projects, tasks] = await Promise.all([
      query(`SELECT COUNT(*) FROM workspace_members WHERE workspace_id=$1`, [req.params.workspaceId]),
      query(`SELECT COUNT(*) FILTER(WHERE status='active') active, COUNT(*) total FROM projects WHERE workspace_id=$1`, [req.params.workspaceId]),
      query(`SELECT COUNT(*) FILTER(WHERE t.status='done') done, COUNT(*) total FROM tasks t JOIN projects p ON p.id=t.project_id WHERE p.workspace_id=$1`, [req.params.workspaceId]),
    ])
    R.success(res, {
      members:  Number(members.rows[0].count),
      projects: { active: Number(projects.rows[0].active), total: Number(projects.rows[0].total) },
      tasks:    { done: Number(tasks.rows[0].done), total: Number(tasks.rows[0].total) },
    })
  } catch (err) { next(err) }
}
