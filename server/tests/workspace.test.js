// ═══════════════════════════════════════════════════════════════════════════════
// WORKSPACE + PROJECT + TASK TESTS — Jest + Supertest
// ═══════════════════════════════════════════════════════════════════════════════
process.env.VERCEL = '1'  // prevent app.listen during tests

const request = require('supertest')
const app     = require('../src/index')

const unique = () => `ws_${Date.now()}_${Math.random().toString(36).slice(2,6)}@taskflow.dev`
const validPassword = 'Password123!'

let token, workspaceId, projectId, taskId

beforeAll(async () => {
  const email = unique()
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ name: 'WS Test User', email, password: validPassword })
  token       = reg.body.data.token
  workspaceId = reg.body.data.workspaces[0].id
})

// ═══════════════════════════════════════════════════════════════════════════════
// WORKSPACES
// ═══════════════════════════════════════════════════════════════════════════════
describe('Workspaces', () => {

  test('RT-15 — lists workspaces for authenticated user', async () => {
    const res = await request(app).get('/api/workspaces').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  test('RT-16 — creates a new workspace', async () => {
    const res = await request(app).post('/api/workspaces').set('Authorization', `Bearer ${token}`).send({ name: 'My Test Workspace' })
    expect(res.status).toBe(201)
    expect(res.body.data.name).toBe('My Test Workspace')
  })

  test('RT-17 — rejects workspace creation without name', async () => {
    const res = await request(app).post('/api/workspaces').set('Authorization', `Bearer ${token}`).send({ description: 'No name' })
    expect([400, 422]).toContain(res.status)
  })

  test('RT-18 — returns 401 without token', async () => {
    const res = await request(app).get('/api/workspaces')
    expect(res.status).toBe(401)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECTS
// ═══════════════════════════════════════════════════════════════════════════════
describe('Projects', () => {

  test('RT-19 — creates a project in workspace', async () => {
    const res = await request(app)
      .post(`/api/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Project', status: 'active', priority: 'high', end_date: '2026-12-31' })

    expect(res.status).toBe(201)
    expect(res.body.data.name).toBe('Test Project')
    expect(res.body.data.status).toBe('active')
    expect(res.body.data.priority).toBe('high')
    expect(res.body.data.progress).toBe(0)
    projectId = res.body.data.id
  })

  test('RT-20 — lists projects for workspace', async () => {
    const res = await request(app).get(`/api/workspaces/${workspaceId}/projects`).set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  test('RT-21 — gets project detail', async () => {
    const res = await request(app).get(`/api/projects/${projectId}`).set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(projectId)
    expect(res.body.data.members).toBeDefined()
  })

  test('RT-22 — updates project status and priority', async () => {
    const res = await request(app)
      .put(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed', priority: 'medium' })
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('completed')
    expect(res.body.data.priority).toBe('medium')
  })

  test('RT-23 — rejects project creation without name', async () => {
    const res = await request(app)
      .post(`/api/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'active' })
    expect([400, 422]).toContain(res.status)
  })

  test('RT-24 — deletes project successfully', async () => {
    const create = await request(app)
      .post(`/api/workspaces/${workspaceId}/projects`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'To Delete', status: 'planning' })

    const delRes = await request(app)
      .delete(`/api/projects/${create.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(delRes.status).toBe(200)

    // After deletion, access is blocked (403 or 404 — both mean it's gone)
    const check = await request(app)
      .get(`/api/projects/${create.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
    expect([403, 404]).toContain(check.status)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// TASKS
// ═══════════════════════════════════════════════════════════════════════════════
describe('Tasks', () => {

  test('RT-25 — creates a task in project', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test Task', status: 'todo', priority: 'high', type: 'feature' })

    expect(res.status).toBe(201)
    // Handle both res.body.data and res.body.data.task structures
    const task = res.body.data?.task || res.body.data
    expect(task.title).toBe('Test Task')
    taskId = task.id
  })

  test('RT-26 — lists tasks for project', async () => {
    const res = await request(app).get(`/api/projects/${projectId}/tasks`).set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  test('RT-27 — updates task status', async () => {
    if (!taskId) { console.warn('Skipping RT-27: taskId not set'); return }
    const res = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'done' })
    expect(res.status).toBe(200)
    const task = res.body.data?.task || res.body.data
    expect(task.status).toBe('done')
  })

  test('RT-28 — adds comment to task', async () => {
    if (!taskId) { console.warn('Skipping RT-28: taskId not set'); return }
    const res = await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'This is a test comment' })
    expect(res.status).toBe(201)
    expect(res.body.data.content).toBe('This is a test comment')
  })

  test('RT-29 — rejects task creation without title', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'todo', priority: 'medium' })
    expect([400, 422]).toContain(res.status)
  })

  test('RT-30 — deletes task', async () => {
    if (!taskId) { console.warn('Skipping RT-30: taskId not set'); return }
    const res = await request(app).delete(`/api/tasks/${taskId}`).set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
  })
})