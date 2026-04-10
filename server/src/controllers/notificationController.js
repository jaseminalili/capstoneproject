const { query } = require('../db/pool')
const R = require('../utils/response')

exports.list = async (req, res, next) => {
  try {
    const r = await query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    )
    R.success(res, r.rows)
  } catch (err) { next(err) }
}

exports.markAsRead = async (req, res, next) => {
  try {
    await query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND id = $2`,
      [req.user.id, req.params.id]
    )
    R.success(res, null, 'Notification marked as read.')
  } catch (err) { next(err) }
}

exports.markAllAsRead = async (req, res, next) => {
  try {
    await query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = $1`,
      [req.user.id]
    )
    R.success(res, null, 'All notifications marked as read.')
  } catch (err) { next(err) }
}

/**
 * Internal helper to create notifications
 */
exports.createNotification = async (userId, type, title, body, link) => {
  try {
    await query(
      `INSERT INTO notifications(user_id, type, title, body, link)
       VALUES($1, $2, $3, $4, $5)`,
      [userId, type, title, body, link]
    )
  } catch (err) {
    console.error('Failed to create notification:', err.message)
  }
}
