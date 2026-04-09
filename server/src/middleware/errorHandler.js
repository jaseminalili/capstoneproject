const logger = require('../utils/logger')
const { validationResult } = require('express-validator')
const R = require('../utils/response')

/**
 * Validate express-validator results
 */
function validate(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return R.badRequest(res, 'Validation failed', errors.array().map(e => ({
      field: e.path, message: e.msg
    })))
  }
  next()
}

/**
 * 404 handler
 */
function notFound(req, res) {
  R.notFound(res, `Route ${req.method} ${req.originalUrl} not found.`)
}

/**
 * Global error handler
 */
function errorHandler(err, req, res, next) {
  logger.error(`[${req.method}] ${req.originalUrl} →`, err.message)
  if (process.env.NODE_ENV === 'development') logger.debug(err.stack)

  // PostgreSQL unique violation
  if (err.code === '23505') {
    return R.conflict(res, 'A record with these values already exists.')
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return R.badRequest(res, 'Referenced resource does not exist.')
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') return R.unauthorized(res)
  if (err.name === 'TokenExpiredError') return R.unauthorized(res, 'Session expired.')

  const status  = err.status || err.statusCode || 500
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Internal server error'
    : err.message

  R.error(res, message, status)
}

module.exports = { validate, notFound, errorHandler }
