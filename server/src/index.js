require('dotenv').config()
const express    = require('express')
const cors       = require('cors')
const helmet     = require('helmet')
const compression = require('compression')
const morgan     = require('morgan')
const config     = require('./config')
const logger     = require('./utils/logger')
const routes     = require('./routes')
const { notFound, errorHandler } = require('./middleware/errorHandler')

const app = express()

// ── Security & performance ────────────────────────────────────────────────────
app.use(helmet())
app.use(compression())

// Dynamic CORS: Allow localhost and any Vercel subdomain
const allowedOrigins = config.cors.origin
app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true)
    
    const isLocalhost = origin.startsWith('http://localhost')
    const isVercel    = origin.endsWith('.vercel.app')
    const isAllowed   = Array.isArray(allowedOrigins) ? allowedOrigins.includes(origin) : allowedOrigins === origin

    if (isLocalhost || isVercel || isAllowed) {
      callback(null, true)
    } else {
      logger.warn(`🚫 CORS blocked origin: ${origin}`)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

if (config.env === 'development') {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }))
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api', routes)

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: config.env, timestamp: new Date().toISOString() })
})

// ── Error handlers ────────────────────────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(config.port, () => {
  logger.info(`🚀  TaskFlow API running on http://localhost:${config.port}`)
  logger.info(`    Environment : ${config.env}`)
  logger.info(`    CORS origin : ${config.cors.origin}`)
})

module.exports = app
