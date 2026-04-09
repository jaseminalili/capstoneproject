const { query, getClient } = require('../db/pool')
const R      = require('../utils/response')
const logger = require('../utils/logger')

async function recalcProgress(projectId, client = { query: (...a) => query(...a) }) {
  const r = await client.query(
    `SELECT COUNT(*) FILTER(WHERE status='done') done, COUNT(*) total FROM tasks WHERE project_id=$1`, [projectId]
  )
  const { done, total } = r.rows[0]
  const pct = Number(total) > 0 ? Math.round((Number(done) / Number(total)) * 100) : 0
  await client.query('UPDATE projects SET progress=$1 WHERE id=$2', [pct, projectId])
  return pct
}
exports.recalcProgress = recalcProgress

const PROJECT_QUERY = `
  SELECT p.*,
    lead.name  lead_name,  lead.avatar  lead_avatar,  lead.color  lead_color,
    creator.name created_by_name,
    COALESCE(json_agg(DISTINCT jsonb_build_object('id',pm.user_id,'name',mu.name,'avatar',mu.avatar,'color',mu.color))
      FILTER(WHERE pm.user_id IS NOT NULL), '[]') members
  FROM projects p
  LEFT JOIN users lead    ON lead.id    = p.lead_id
  LEFT JOIN users creator ON creator.id = p.created_by
  LEFT JOIN project_members pm ON pm.project_id = p.id
  LEFT JOIN users mu ON mu.id = pm.user_id`

exports.listForWorkspace = async (req, res, next) => {
  try {
    const r = await query(
      `${PROJECT_QUERY} WHERE p.workspace_id=$1 GROUP BY p.id,lead.id,creator.id ORDER BY p.created_at DESC`,
      [req.params.workspaceId]
    )
    R.success(res, r.rows)
  } catch (err) { next(err) }
}

exports.getOne = async (req, res, next) => {
  try {
    const r = await query(
      `${PROJECT_QUERY} WHERE p.id=$1 GROUP BY p.id,lead.id,creator.id`, [req.params.id]
    )
    if (!r.rows.length) return R.notFound(res, 'Project not found.')
    R.success(res, r.rows[0])
  } catch (err) { next(err) }
}

exports.create = async (req, res, next) => {
  const { name, description, status, priority, start_date, end_date, lead_id, member_ids } = req.body
  if (!name?.trim()) return R.badRequest(res, 'Project name is required.')

  const client = await getClient()
  try {
    await client.query('BEGIN')

    const p = (await client.query(
      `INSERT INTO projects(workspace_id,name,description,status,priority,start_date,end_date,lead_id,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.params.workspaceId, name.trim(), description||null, status||'planning', priority||'medium',
       start_date||null, end_date||null, lead_id||null, req.user.id]
    )).rows[0]

    const members = [...new Set([req.user.id, ...(Array.isArray(member_ids) ? member_ids : [])])]
    for (const uid of members)
      await client.query(`INSERT INTO project_members(project_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [p.id, uid])

    await client.query('COMMIT')

    const full = (await query(`${PROJECT_QUERY} WHERE p.id=$1 GROUP BY p.id,lead.id,creator.id`, [p.id])).rows[0]
    logger.info(`Project created: ${p.name} (${p.id})`)
    R.created(res, full, 'Project created successfully.')
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally { client.release() }
}

exports.update = async (req, res, next) => {
  const { name, description, status, priority, start_date, end_date, lead_id, member_ids } = req.body
  const client = await getClient()
  try {
    await client.query('BEGIN')

    await client.query(
      `UPDATE projects SET
         name=COALESCE($1,name), description=COALESCE($2,description),
         status=COALESCE($3,status), priority=COALESCE($4,priority),
         start_date=COALESCE($5,start_date), end_date=COALESCE($6,end_date),
         lead_id=COALESCE($7,lead_id)
       WHERE id=$8`,
      [name||null, description||null, status||null, priority||null, start_date||null, end_date||null, lead_id||null, req.params.id]
    )

    if (Array.isArray(member_ids)) {
      await client.query('DELETE FROM project_members WHERE project_id=$1', [req.params.id])
      for (const uid of [...new Set(member_ids)])
        await client.query(`INSERT INTO project_members(project_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [req.params.id, uid])
    }

    await client.query('COMMIT')
    const full = (await query(`${PROJECT_QUERY} WHERE p.id=$1 GROUP BY p.id,lead.id,creator.id`, [req.params.id])).rows[0]
    R.success(res, full, 'Project updated.')
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally { client.release() }
}

exports.delete = async (req, res, next) => {
  try {
    const r = await query(
      `DELETE FROM projects WHERE id=$1 AND (
         created_by=$2 OR
         workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id=$2 AND role IN ('owner','admin'))
       ) RETURNING id,name`,
      [req.params.id, req.user.id]
    )
    if (!r.rows.length) return R.forbidden(res, 'Not found or insufficient permissions.')
    logger.info(`Project deleted: ${r.rows[0].name}`)
    R.success(res, null, 'Project deleted.')
  } catch (err) { next(err) }
}

exports.getProjectStats = async (req, res, next) => {
  try {
    const r = await query(
      `SELECT
         COUNT(*) total,
         COUNT(*) FILTER(WHERE status='done')        done,
         COUNT(*) FILTER(WHERE status='in_progress') in_progress,
         COUNT(*) FILTER(WHERE status='todo')        todo,
         COUNT(*) FILTER(WHERE status='backlog')     backlog,
         COUNT(*) FILTER(WHERE priority='critical')  critical,
         COUNT(*) FILTER(WHERE priority='high')      high
       FROM tasks WHERE project_id=$1`,
      [req.params.id]
    )
    R.success(res, r.rows[0])
  } catch (err) { next(err) }
}
