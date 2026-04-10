const { query } = require('../db/pool')
const R = require('../utils/response')

exports.search = async (req, res, next) => {
  const { workspaceId } = req.params
  const { q } = req.query

  if (!q || q.trim().length < 2) {
    return R.success(res, { projects: [], tasks: [] })
  }

  const searchTerm = `%${q.trim()}%`

  try {
    const [projects, tasks] = await Promise.all([
      // Search Projects
      query(
        `SELECT id, name, description, status, priority, progress
         FROM projects
         WHERE workspace_id = $1 AND (name ILIKE $2 OR description ILIKE $2)
         ORDER BY created_at DESC LIMIT 10`,
        [workspaceId, searchTerm]
      ),
      // Search Tasks
      query(
        `SELECT t.id, t.title, t.status, t.priority, t.project_id, p.name as project_name
         FROM tasks t
         JOIN projects p ON p.id = t.project_id
         WHERE p.workspace_id = $1 AND (t.title ILIKE $2 OR t.description ILIKE $2)
         ORDER BY t.created_at DESC LIMIT 20`,
        [workspaceId, searchTerm]
      )
    ])

    R.success(res, {
      projects: projects.rows,
      tasks: tasks.rows
    })
  } catch (err) {
    next(err)
  }
}
