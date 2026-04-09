require('dotenv').config()
const bcrypt = require('bcryptjs')
const { Pool } = require('pg')
const config = require('../config')

const pool = new Pool(config.db)

async function seed() {
  const client = await pool.connect()
  console.log('🌱  Seeding TaskFlow database…')
  try {
    await client.query('BEGIN')

    // ── Clean existing data ──────────────────────────────────────────────────
    await client.query('DELETE FROM task_activities')
    await client.query('DELETE FROM task_comments')
    await client.query('DELETE FROM tasks')
    await client.query('DELETE FROM project_members')
    await client.query('DELETE FROM projects')
    await client.query('DELETE FROM workspace_members')
    await client.query('DELETE FROM workspace_invitations')
    await client.query('DELETE FROM workspaces')
    await client.query('DELETE FROM users')

    const hash = await bcrypt.hash('password123', 12)

    // ── Users ────────────────────────────────────────────────────────────────
    const users = {}
    const userData = [
      { name: 'Oliver Watts',  email: 'oliver@taskflow.dev',  avatar: 'OW', color: '#10B981' },
      { name: 'Alex Smith',    email: 'alex@taskflow.dev',    avatar: 'AS', color: '#3B82F6' },
      { name: 'Sarah Johnson', email: 'sarah@taskflow.dev',   avatar: 'SJ', color: '#8B5CF6' },
      { name: 'John Warrel',   email: 'john@taskflow.dev',    avatar: 'JW', color: '#EF4444' },
      { name: 'Maria Chen',    email: 'maria@taskflow.dev',   avatar: 'MC', color: '#F59E0B' },
    ]
    for (const u of userData) {
      const r = await client.query(
        `INSERT INTO users(name,email,password_hash,avatar,color) VALUES($1,$2,$3,$4,$5) RETURNING id`,
        [u.name, u.email, hash, u.avatar, u.color]
      )
      users[u.email.split('@')[0]] = r.rows[0].id
    }

    // ── Workspace ────────────────────────────────────────────────────────────
    const ws = (await client.query(
      `INSERT INTO workspaces(name,description,owner_id) VALUES($1,$2,$3) RETURNING id`,
      ['Cloud Ops Hub', 'DevOps and cloud infrastructure workspace', users.oliver]
    )).rows[0].id

    // Workspace members
    const memberRoles = [
      [users.oliver, 'owner'], [users.alex, 'admin'], [users.sarah, 'admin'],
      [users.john, 'member'], [users.maria, 'member'],
    ]
    for (const [uid, role] of memberRoles)
      await client.query(`INSERT INTO workspace_members(workspace_id,user_id,role) VALUES($1,$2,$3)`, [ws, uid, role])

    // ── Projects ─────────────────────────────────────────────────────────────
    const p1 = (await client.query(
      `INSERT INTO projects(workspace_id,name,description,status,priority,start_date,end_date,lead_id,created_by)
       VALUES($1,$2,$3,'active','high','2025-10-01','2025-12-31',$4,$5) RETURNING id`,
      [ws, 'Kubernetes Migration', 'Migrate monolithic application infrastructure to Kubernetes for improved scalability and reliability.', users.oliver, users.oliver]
    )).rows[0].id

    const p2 = (await client.query(
      `INSERT INTO projects(workspace_id,name,description,status,priority,start_date,end_date,lead_id,created_by)
       VALUES($1,$2,$3,'active','medium','2025-11-01','2026-03-31',$4,$5) RETURNING id`,
      [ws, 'Automated Regression Suite', 'Build a Selenium + Playwright lightweight hybrid test framework for automated regression testing across all services.', users.alex, users.alex]
    )).rows[0].id

    const p3 = (await client.query(
      `INSERT INTO projects(workspace_id,name,description,status,priority,start_date,end_date,lead_id,created_by)
       VALUES($1,$2,$3,'planning','medium','2026-01-15','2026-06-30',$4,$5) RETURNING id`,
      [ws, 'API Gateway Redesign', 'Redesign the API gateway for better performance, security and developer experience.', users.sarah, users.oliver]
    )).rows[0].id

    // Project members
    const projMembers = [
      [p1, users.oliver], [p1, users.alex], [p1, users.john],
      [p2, users.alex], [p2, users.sarah], [p2, users.maria],
      [p3, users.sarah], [p3, users.oliver], [p3, users.maria],
    ]
    for (const [pid, uid] of projMembers)
      await client.query(`INSERT INTO project_members(project_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [pid, uid])

    // ── Tasks ─────────────────────────────────────────────────────────────────
    const taskData = [
      // Project 1
      { pid: p1, title: 'Set Up EKS Cluster',         desc: 'Provision EKS cluster on AWS, configure node groups and set up networking.',   status: 'todo',        priority: 'high',   type: 'task',        assignee: users.alex,   reporter: users.oliver, due: '2025-12-01' },
      { pid: p1, title: 'Configure Helm Charts',       desc: 'Create and configure Helm charts for all microservices deployment.',           status: 'in_progress', priority: 'high',   type: 'task',        assignee: users.oliver, reporter: users.oliver, due: '2025-11-20' },
      { pid: p1, title: 'Setup CI/CD Pipeline',        desc: 'Integrate GitHub Actions with EKS for automated deployments.',                 status: 'done',        priority: 'high',   type: 'feature',     assignee: users.oliver, reporter: users.oliver, due: '2025-11-10' },
      { pid: p1, title: 'Database Migration Scripts',  desc: 'Write and test database migration scripts for Postgres upgrade.',              status: 'in_progress', priority: 'medium', type: 'task',        assignee: users.john,   reporter: users.alex,   due: '2025-11-25' },
      { pid: p1, title: 'Load Balancer Configuration', desc: 'Configure ALB ingress controller and set up SSL termination.',                 status: 'todo',        priority: 'medium', type: 'task',        assignee: users.alex,   reporter: users.oliver, due: '2025-12-10' },
      { pid: p1, title: 'Memory Leak in Auth Service', desc: 'Auth service crashes under load — suspected memory leak in JWT caching.',     status: 'in_progress', priority: 'high',   type: 'bug',         assignee: users.john,   reporter: users.alex,   due: '2025-11-18' },
      // Project 2
      { pid: p2, title: 'Migrate to Playwright 1.48',  desc: 'Upgrade test runner from Playwright 1.40 to 1.48 and fix breaking changes.',  status: 'in_progress', priority: 'medium', type: 'improvement', assignee: users.sarah,  reporter: users.alex,   due: '2026-01-15' },
      { pid: p2, title: 'Visual Snapshot Testing',     desc: 'Add visual regression testing layer using Playwright screenshots.',            status: 'todo',        priority: 'low',    type: 'feature',     assignee: users.maria,  reporter: users.alex,   due: '2026-02-01' },
      { pid: p2, title: 'Fix Login Flow Tests',        desc: 'Login tests failing intermittently on Safari — investigate selector issues.', status: 'todo',        priority: 'high',   type: 'bug',         assignee: users.sarah,  reporter: users.sarah,  due: '2025-12-20' },
      { pid: p2, title: 'Parallel Test Execution',     desc: 'Configure test suite to run in parallel across multiple workers.',            status: 'backlog',     priority: 'medium', type: 'improvement', assignee: users.maria,  reporter: users.alex,   due: '2026-02-15' },
      // Project 3
      { pid: p3, title: 'API Design Documentation',    desc: 'Document new API gateway architecture, endpoints and authentication flow.',   status: 'in_progress', priority: 'medium', type: 'task',        assignee: users.sarah,  reporter: users.sarah,  due: '2026-02-01' },
      { pid: p3, title: 'OAuth 2.0 Integration',       desc: 'Implement OAuth 2.0 with PKCE for third-party authentication.',               status: 'backlog',     priority: 'high',   type: 'feature',     assignee: users.oliver, reporter: users.sarah,  due: '2026-03-15' },
    ]

    for (const [i, t] of taskData.entries()) {
      await client.query(
        `INSERT INTO tasks(project_id,title,description,status,priority,type,assignee_id,reporter_id,due_date,position)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [t.pid, t.title, t.desc, t.status, t.priority, t.type, t.assignee, t.reporter, t.due, i]
      )
    }

    // ── Recalculate project progress ─────────────────────────────────────────
    for (const pid of [p1, p2, p3]) {
      const r = await client.query(
        `SELECT COUNT(*) FILTER(WHERE status='done') done, COUNT(*) total FROM tasks WHERE project_id=$1`, [pid]
      )
      const { done, total } = r.rows[0]
      const pct = Number(total) > 0 ? Math.round((Number(done) / Number(total)) * 100) : 0
      await client.query(`UPDATE projects SET progress=$1 WHERE id=$2`, [pct, pid])
    }

    await client.query('COMMIT')
    console.log('✅  Database seeded successfully!')
    console.log('')
    console.log('   Demo Accounts (password: password123)')
    console.log('   ──────────────────────────────────────')
    console.log('   oliver@taskflow.dev  →  Owner / Admin')
    console.log('   alex@taskflow.dev    →  Admin')
    console.log('   sarah@taskflow.dev   →  Admin')
    console.log('   john@taskflow.dev    →  Member')
    console.log('   maria@taskflow.dev   →  Member')
    console.log('')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌  Seed failed:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

seed()
