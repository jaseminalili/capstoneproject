// ═══════════════════════════════════════════════════════════════════════════════
// app.js — Express app exported separately for testing
// ═══════════════════════════════════════════════════════════════════════════════
require('dotenv').config()
const express     = require('express')
const cors        = require('cors')
const helmet      = require('helmet')
const compression = require('compression')
const morgan      = require('morgan')
const config      = require('./config')
const routes      = require('./routes')
const { notFound, errorHandler } = require('./middleware/errorHandler')
 
const app = express()
 
app.use(helmet())
app.use(compression())
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
 
// Only log in development, not during tests
if (config.env === 'development') {
  app.use(morgan('dev'))
}
 
app.use('/api', routes)
app.get('/health', (_req, res) => res.json({ status: 'ok' }))
app.use(notFound)
app.use(errorHandler)
 
module.exports = app