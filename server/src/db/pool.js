const { Pool } = require('pg')
const config   = require('../config')
const logger   = require('../utils/logger')

const pool = new Pool(config.db)

pool.on('connect', client => {
  logger.debug('New PostgreSQL client connected')
})

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error', err)
})

// Test connection on startup
pool.connect()
  .then(client => {
    logger.info('✅  PostgreSQL connected successfully')
    client.release()
  })
  .catch(err => {
    logger.error('❌  PostgreSQL connection failed:', err.message)
    logger.error('    Check your DATABASE_URL or DB_* environment variables')
  })

/**
 * Execute a query with automatic error logging
 */
async function query(text, params) {
  const start = Date.now()
  try {
    const result = await pool.query(text, params)
    const duration = Date.now() - start
    logger.debug(`Query executed in ${duration}ms — ${text.substring(0, 60)}`)
    return result
  } catch (err) {
    logger.error(`Query failed: ${err.message} — ${text.substring(0, 80)}`)
    throw err
  }
}

/**
 * Get a client for transactions
 */
async function getClient() {
  const client = await pool.connect()
  const originalRelease = client.release.bind(client)
  client.release = () => {
    client.release = originalRelease
    return originalRelease()
  }
  return client
}

module.exports = { query, getClient, pool }
