const config = require('../config')

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 }
const COLORS = {
  error: '\x1b[31m',  // red
  warn:  '\x1b[33m',  // yellow
  info:  '\x1b[36m',  // cyan
  debug: '\x1b[90m',  // grey
  reset: '\x1b[0m',
}

const currentLevel = config.env === 'production' ? 'info' : 'debug'

function log(level, ...args) {
  if (LEVELS[level] > LEVELS[currentLevel]) return
  const ts    = new Date().toISOString()
  const color = COLORS[level] || ''
  const label = level.toUpperCase().padEnd(5)
  console.log(`${color}[${ts}] ${label}${COLORS.reset}`, ...args)
}

module.exports = {
  error: (...a) => log('error', ...a),
  warn:  (...a) => log('warn',  ...a),
  info:  (...a) => log('info',  ...a),
  debug: (...a) => log('debug', ...a),
}
