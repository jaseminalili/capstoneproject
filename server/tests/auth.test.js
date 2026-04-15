// ═══════════════════════════════════════════════════════════════════════════════
// AUTH CONTROLLER TESTS — Jest + Supertest
// ═══════════════════════════════════════════════════════════════════════════════
process.env.VERCEL = '1'  // prevent app.listen during tests

const request = require('supertest')
const app     = require('../src/index')

const unique = () => `test_${Date.now()}_${Math.random().toString(36).slice(2,6)}@taskflow.dev`
const validPassword = 'Password123!'

let testEmail
let authToken

describe('POST /api/auth/register', () => {
  beforeEach(() => { testEmail = unique() })

  test('RT-01 — registers successfully with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: testEmail, password: validPassword })
    expect(res.status).toBe(201)
    expect(res.body.data.token).toBeDefined()
    expect(res.body.data.user.email).toBe(testEmail)
    expect(res.body.data.workspaces).toHaveLength(1)
    expect(res.body.data.user.password_hash).toBeUndefined()
  })

  test('RT-02 — rejects duplicate email with 409', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Test User', email: testEmail, password: validPassword })
    const res = await request(app).post('/api/auth/register').send({ name: 'Test User 2', email: testEmail, password: validPassword })
    expect(res.status).toBe(409)
    expect(res.body.success).toBe(false)
  })

  test('RT-03 — rejects password without uppercase (ISO standard)', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Test User', email: unique(), password: 'password123!' })
    expect([400, 422]).toContain(res.status)
    expect(res.body.success).toBe(false)
  })

  test('RT-04 — rejects password without special character (ISO standard)', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Test User', email: unique(), password: 'Password123' })
    expect([400, 422]).toContain(res.status)
    expect(res.body.success).toBe(false)
  })

  test('RT-05 — rejects password shorter than 8 characters', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Test User', email: unique(), password: 'Pa1!' })
    expect([400, 422]).toContain(res.status)
    expect(res.body.success).toBe(false)
  })

  test('RT-06 — rejects missing name', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: unique(), password: validPassword })
    expect([400, 422]).toContain(res.status)
    expect(res.body.success).toBe(false)
  })
})

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    testEmail = unique()
    await request(app).post('/api/auth/register').send({ name: 'Login User', email: testEmail, password: validPassword })
  })

  test('RT-07 — logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: testEmail, password: validPassword })
    expect(res.status).toBe(200)
    expect(res.body.data.token).toBeDefined()
    authToken = res.body.data.token
  })

  test('RT-08 — rejects wrong password with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: testEmail, password: 'WrongPass123!' })
    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  test('RT-09 — rejects non-existent email with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@taskflow.dev', password: validPassword })
    expect(res.status).toBe(401)
  })
})

describe('GET /api/auth/me', () => {
  beforeAll(async () => {
    testEmail = unique()
    const reg = await request(app).post('/api/auth/register').send({ name: 'Me User', email: testEmail, password: validPassword })
    authToken = reg.body.data.token
  })

  test('RT-10 — returns user profile with valid JWT', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${authToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.user.email).toBe(testEmail)
    expect(res.body.data.workspaces).toBeDefined()
  })

  test('RT-11 — returns 401 without JWT', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })

  test('RT-12 — returns 401 with invalid JWT', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer invalid.token.here')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/auth/forgot-password', () => {
  test('RT-13 — returns 200 for existing email', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'oliver@taskflow.dev' })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  test('RT-14 — returns 200 for non-existent email (no disclosure)', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody_exists@taskflow.dev' })
    expect(res.status).toBe(200)
  })
})

describe('Security — JWT and Authorization', () => {
  test('ST-01 — modified JWT payload is rejected with 401', async () => {
    const fakeToken = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6ImZha2UifQ.fakesignature'
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${fakeToken}`)
    expect(res.status).toBe(401)
  })

  test('ST-02 — SQL injection attempt is safely rejected', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: "' OR '1'='1", password: 'anything' })
    expect([400, 401, 422]).toContain(res.status)
    expect(res.body.success).toBe(false)
  })

  test('ST-03 — protected routes without token return 401', async () => {
    for (const { method, url } of [
      { method: 'get', url: '/api/auth/me' },
      { method: 'get', url: '/api/notifications' },
      { method: 'get', url: '/api/workspaces' },
    ]) {
      const res = await request(app)[method](url)
      expect(res.status).toBe(401)
    }
  })
})