const { query, getClient } = require('../db/pool')
const R      = require('../utils/response')
const logger = require('../utils/logger')
const email  = require('../services/emailService')
const notify = require('./notificationController')
const config = require('../config')
const { recalcProgress } = require('./projectController')
const getFrontendUrl = (req) => {
  const origin = req.get('origin')
  if (origin && origin !== 'null') return origin
  const referer = req.get('referer')
  if (referer) {
    try { return new URL(referer).origin } catch (e) {}
  }
  return config.frontendUrl
}
 
const TASK_QUERY = `
  SELECT t.*,
    a.name  assignee_name,  a.email assignee_email, a.avatar assignee_avatar, a.color  assignee_color,
    r.name  reporter_name,  r.avatar reporter_avatar, r.color reporter_color
  FROM tasks t
  LEFT JOIN users a ON a.id = t.assignee_id
  LEFT JOIN users r ON r.id = t.reporter_id`
 
async function logActivity(taskId, userId, action, field, oldVal, newVal) {
  try {
    await query(
      `INSERT INTO task_activities(task_id,user_id,action,field,old_value,new_value)
       VALUES($1,$2,$3,$4,$5,$6)`,
      [taskId, userId, action, field||null, oldVal||null, newVal||null]
    )
  } catch (e) {
    logger.warn('Activity log failed:', e.message)
  }
}
 
exports.listForProject = async (req, res, next) => {
  try {
    const r = await query(
      `${TASK_QUERY} WHERE t.project_id=$1 ORDER BY t.position ASC, t.created_at ASC`,
      [req.params.projectId]
    )
    R.success(res, r.rows)
  } catch (err) { next(err) }
}
 
exports.getMyTasks = async (req, res, next) => {
  try {
    const r = await query(
      `${TASK_QUERY}
       WHERE t.assignee_id=$1 AND t.status NOT IN ('done','cancelled')
       ORDER BY
         CASE t.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         t.due_date ASC NULLS LAST`,
      [req.user.id]
    )
    R.success(res, r.rows)
  } catch (err) { next(err) }
}
 
exports.getOne = async (req, res, next) => {
  try {
    const task = (await query(`${TASK_QUERY} WHERE t.id=$1`, [req.params.id])).rows[0]
    if (!task) return R.notFound(res, 'Task not found.')
 
    const [comments, activities, project] = await Promise.all([
      query(
        `SELECT tc.*, tc.user_id, u.name user_name, u.avatar user_avatar, u.color user_color
         FROM task_comments tc JOIN users u ON u.id=tc.user_id
         WHERE tc.task_id=$1 ORDER BY tc.created_at ASC`,
        [task.id]
      ),
      query(
        `SELECT ta.*,u.name user_name,u.avatar user_avatar
         FROM task_activities ta JOIN users u ON u.id=ta.user_id
         WHERE ta.task_id=$1 ORDER BY ta.created_at DESC LIMIT 20`,
        [task.id]
      ),
      query(
        `SELECT id,name,status,priority,progress,start_date,end_date,workspace_id FROM projects WHERE id=$1`,
        [task.project_id]
      ),
    ])
 
    R.success(res, { ...task, comments: comments.rows, activities: activities.rows, project: project.rows[0] })
  } catch (err) { next(err) }
}
 
exports.create = async (req, res, next) => {
  const { title, description, status, priority, type, assignee_id, due_date, estimated_hours, tags } = req.body
  if (!title?.trim()) return R.badRequest(res, 'Task title is required.')
 
  try {
    const posRes = await query('SELECT COALESCE(MAX(position),0)+1 next FROM tasks WHERE project_id=$1', [req.params.projectId])
    const pos = posRes.rows[0].next
 
    const t = (await query(
      `INSERT INTO tasks(project_id,title,description,status,priority,type,assignee_id,reporter_id,due_date,estimated_hours,tags,position)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [req.params.projectId, title.trim(), description||null, status||'todo', priority||'medium',
       type||'task', assignee_id||null, req.user.id, due_date||null, estimated_hours||null,
       tags||[], pos]
    )).rows[0]
 
    const full = (await query(`${TASK_QUERY} WHERE t.id=$1`, [t.id])).rows[0]
    const progress = await recalcProgress(req.params.projectId)
 
    await logActivity(t.id, req.user.id, 'created', null, null, title)
 
    if (assignee_id && assignee_id !== req.user.id) {
      const [assigneeRow, projectRow] = await Promise.all([
        query('SELECT name,email FROM users WHERE id=$1', [assignee_id]),
        query('SELECT name,status,priority,progress FROM projects WHERE id=$1', [req.params.projectId]),
      ])
      const assigneeData = assigneeRow.rows[0]
      const proj         = projectRow.rows[0]
 
      notify.createNotification(
        assignee_id,
        'task_assigned',
        'New Task Assigned',
        `${req.user.name} assigned you: ${title}`,
        `/task/${t.id}?projectId=${req.params.projectId}`
      )
 
      if (assigneeData?.email) {
        const result = await email.sendTaskAssignment({
          to:              assigneeData.email,
          assigneeName:    assigneeData.name,
          assignerName:    req.user.name,
          taskTitle:       title,
          taskDescription: description || '',
          taskPriority:    priority || 'medium',
          taskType:        type || 'task',
          taskStatus:      status || 'todo',
          dueDate:         due_date,
          projectName:     proj?.name || '',
          projectStatus:   proj?.status || '',
          projectPriority: proj?.priority || '',
          projectProgress: proj?.progress || 0,
          taskId:          t.id,
          projectId:       req.params.projectId,
          frontendUrl:     getFrontendUrl(req),
        })
        if (!result.success) {
          logger.warn(`Task email failed for ${assigneeData.email}:`, result.error)
          return R.badRequest(res, `Task created, but email notification failed: ${result.error}.`)
        }
      }
    }
 
    R.created(res, { task: full, progress }, 'Task created.')
  } catch (err) { next(err) }
}
 
exports.update = async (req, res, next) => {
  const { title, description, status, priority, type, assignee_id, due_date, estimated_hours, actual_hours, tags } = req.body
 
  try {
    const prev = (await query('SELECT * FROM tasks WHERE id=$1', [req.params.id])).rows[0]
    if (!prev) return R.notFound(res, 'Task not found.')
 
    const updates = []
    const vals    = []
    let   idx     = 1
 
    if (title !== undefined)            { updates.push(`title=$${idx++}`);            vals.push(title) }
    if (description !== undefined)      { updates.push(`description=$${idx++}`);      vals.push(description) }
    if (status !== undefined)           { updates.push(`status=$${idx++}`);           vals.push(status) }
    if (priority !== undefined)         { updates.push(`priority=$${idx++}`);         vals.push(priority) }
    if (type !== undefined)             { updates.push(`type=$${idx++}`);             vals.push(type) }
    if (assignee_id !== undefined)      { updates.push(`assignee_id=$${idx++}`);      vals.push(assignee_id||null) }
    if (due_date !== undefined)         { updates.push(`due_date=$${idx++}`);         vals.push(due_date||null) }
    if (estimated_hours !== undefined)  { updates.push(`estimated_hours=$${idx++}`);  vals.push(estimated_hours||null) }
    if (actual_hours !== undefined)     { updates.push(`actual_hours=$${idx++}`);     vals.push(actual_hours||null) }
    if (tags !== undefined)             { updates.push(`tags=$${idx++}`);             vals.push(tags||[]) }
 
    if (!updates.length) return R.badRequest(res, 'Nothing to update.')
 
    vals.push(req.params.id)
    await query(`UPDATE tasks SET ${updates.join(',')} WHERE id=$${idx}`, vals)
 
    const full = (await query(`${TASK_QUERY} WHERE t.id=$1`, [req.params.id])).rows[0]
    const progress = await recalcProgress(prev.project_id)
 
    const fieldsToTrack = {
      title: 'title', description: 'description', status: 'status',
      priority: 'priority', type: 'type', assignee_id: 'assignee',
      due_date: 'due date', estimated_hours: 'estimate', actual_hours: 'actual hours'
    }
 
    for (const [key, label] of Object.entries(fieldsToTrack)) {
      if (req.body[key] !== undefined && String(prev[key]) !== String(req.body[key])) {
        await logActivity(prev.id, req.user.id, 'updated', label, String(prev[key]), String(req.body[key]))
      }
    }
 
    const newAssignee = assignee_id !== undefined ? (assignee_id || null) : prev.assignee_id
    if (assignee_id !== undefined && newAssignee && newAssignee !== prev.assignee_id && newAssignee !== req.user.id) {
      const [assigneeRow, projectRow] = await Promise.all([
        query('SELECT name,email FROM users WHERE id=$1', [newAssignee]),
        query('SELECT name,status,priority,progress FROM projects WHERE id=$1', [prev.project_id]),
      ])
      const assigneeData = assigneeRow.rows[0]
      const proj         = projectRow.rows[0]
 
      notify.createNotification(
        newAssignee,
        'task_assigned',
        'Task Assigned to You',
        `${req.user.name} assigned you: ${full.title}`,
        `/task/${full.id}?projectId=${prev.project_id}`
      )
 
      if (assigneeData?.email) {
        const result = await email.sendTaskAssignment({
          to:              assigneeData.email,
          assigneeName:    assigneeData.name,
          assignerName:    req.user.name,
          taskTitle:       full.title,
          taskDescription: full.description || '',
          taskPriority:    full.priority,
          taskType:        full.type,
          taskStatus:      full.status,
          dueDate:         full.due_date,
          projectName:     proj?.name || '',
          projectStatus:   proj?.status || '',
          projectPriority: proj?.priority || '',
          projectProgress: proj?.progress || 0,
          taskId:          full.id,
          projectId:       prev.project_id,
          frontendUrl:     getFrontendUrl(req),
        })
        if (!result.success) {
          logger.warn(`Task email failed for ${assigneeData.email}:`, result.error)
          return R.badRequest(res, `Task updated, but email notification failed: ${result.error}.`)
        }
      }
    }
 
    R.success(res, { task: full, progress }, 'Task updated.')
  } catch (err) { next(err) }
}
 
exports.delete = async (req, res, next) => {
  try {
    const t = (await query('SELECT project_id,title FROM tasks WHERE id=$1', [req.params.id])).rows[0]
    if (!t) return R.notFound(res, 'Task not found.')
    await query('DELETE FROM tasks WHERE id=$1', [req.params.id])
    const progress = await recalcProgress(t.project_id)
    logger.info(`Task deleted: ${t.title}`)
    R.success(res, { progress }, 'Task deleted.')
  } catch (err) { next(err) }
}
 
exports.addComment = async (req, res, next) => {
  const { content } = req.body
  if (!content?.trim()) return R.badRequest(res, 'Comment content is required.')
  try {
    const task = (await query('SELECT id FROM tasks WHERE id=$1', [req.params.id])).rows[0]
    if (!task) return R.notFound(res, 'Task not found.')
 
    const c = (await query(
      `INSERT INTO task_comments(task_id,user_id,content) VALUES($1,$2,$3) RETURNING *`,
      [req.params.id, req.user.id, content.trim()]
    )).rows[0]
 
    const full = (await query(
      `SELECT tc.*, tc.user_id, u.name user_name, u.email user_email, u.avatar user_avatar, u.color user_color
       FROM task_comments tc JOIN users u ON u.id=tc.user_id WHERE tc.id=$1`,
      [c.id]
    )).rows[0]
 
    await logActivity(req.params.id, req.user.id, 'commented', null, null, content.slice(0, 60))
 
    const taskData = (await query('SELECT assignee_id, reporter_id, title FROM tasks WHERE id=$1', [req.params.id])).rows[0]
    const recipients = [...new Set([taskData.assignee_id, taskData.reporter_id].filter(id => id && id !== req.user.id))]
    for (const uid of recipients) {
      notify.createNotification(uid, 'task_comment', 'New Comment',
        `${req.user.name} commented on "${taskData.title}"`, `/task/${req.params.id}`)
    }
 
    R.created(res, full, 'Comment added.')
  } catch (err) { next(err) }
}
 
exports.updateComment = async (req, res, next) => {
  const { content } = req.body
  if (!content?.trim()) return R.badRequest(res, 'Content is required.')
  try {
    const r = await query(
      `UPDATE task_comments SET content=$1, is_edited=TRUE WHERE id=$2 AND user_id=$3 RETURNING *`,
      [content.trim(), req.params.commentId, req.user.id]
    )
    if (!r.rows.length) return R.forbidden(res, 'Comment not found or not authorized.')
    R.success(res, r.rows[0], 'Comment updated.')
  } catch (err) { next(err) }
}
 
exports.deleteComment = async (req, res, next) => {
  try {
    const r = await query(
      `DELETE FROM task_comments WHERE id=$1 AND user_id=$2 RETURNING id`,
      [req.params.commentId, req.user.id]
    )
    if (!r.rows.length) return R.forbidden(res, 'Comment not found or not authorized.')
    R.success(res, null, 'Comment deleted.')
  } catch (err) { next(err) }
}