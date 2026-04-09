require('dotenv').config()

const config = {
  env:  process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,

  db: process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('localhost')
          ? false
          : { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }
    : {
        host:     process.env.DB_HOST     || 'localhost',
        port:     parseInt(process.env.DB_PORT, 10) || 5432,
        database: process.env.DB_NAME     || 'taskflow',
        user:     process.env.DB_USER     || 'postgres',
        password: process.env.DB_PASSWORD || '',
        max: 20,
        idleTimeoutMillis: 30000,
      },

  jwt: {
    secret:          process.env.JWT_SECRET          || 'dev-secret-change-in-production',
    expiresIn:       process.env.JWT_EXPIRES_IN       || '7d',
    refreshSecret:   process.env.JWT_REFRESH_SECRET   || 'dev-refresh-secret-change-in-production',
  },

  cors: {
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },

  email: {
    host:    process.env.SMTP_HOST          || 'smtp.gmail.com',
    port:    parseInt(process.env.SMTP_PORT, 10) || 587,
    secure:  process.env.SMTP_SECURE === 'true',
    user:    process.env.SMTP_USER,
    pass:    process.env.SMTP_PASS,
    fromName:    process.env.EMAIL_FROM_NAME    || 'TaskFlow',
    fromAddress: process.env.EMAIL_FROM_ADDRESS || 'noreply@taskflow.app',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max:      parseInt(process.env.RATE_LIMIT_MAX, 10)        || 100,
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
}

module.exports = config
